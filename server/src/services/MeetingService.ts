/**
 * Meeting Service
 * 회의자료 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../shared/errors.js';
import { IStorageService, UploadResult } from './storage/IStorageService.js';

// 타입 정의
type MeetingStatus = 'DRAFT' | 'PUBLISHED';
type MeetingContentType = 'text' | 'json';
type AgendaStatus = 'PENDING' | 'DISCUSSED' | 'SKIPPED';
type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ActionItemStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// Input DTOs
export interface CreateAgendaInput {
  title: string;
  description?: string;
  duration?: number;
  presenter?: string;
  order?: number;
}

export interface UpdateAgendaInput {
  title?: string;
  description?: string;
  duration?: number;
  presenter?: string;
  order?: number;
  status?: AgendaStatus;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  priority?: ActionItemPriority;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  priority?: ActionItemPriority;
  status?: ActionItemStatus;
}

export interface CreateMeetingInput {
  title: string;
  meetingDate: Date;
  location?: string;
  projectId?: string | null;
  teamId?: string | null;
  content?: string;
  contentType?: MeetingContentType;
  summary?: string;
  attendeeIds?: string[];
  status?: MeetingStatus;
  agendas?: CreateAgendaInput[];
  actionItems?: CreateActionItemInput[];
}

export interface UpdateMeetingInput {
  title?: string;
  meetingDate?: Date;
  location?: string;
  projectId?: string | null;
  teamId?: string | null;
  content?: string;
  contentType?: MeetingContentType;
  summary?: string;
  attendeeIds?: string[];
  status?: MeetingStatus;
}

export interface MeetingListParams {
  projectId?: string;
  teamId?: string;
  authorId?: string;
  attendeeId?: string;
  status?: MeetingStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

// 권한 체크용 인터페이스
export interface MemberContext {
  id: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export class MeetingService {
  private readonly STORAGE_FOLDER = 'meetings';

  constructor(
    private prisma: PrismaClient,
    private storageService: IStorageService
  ) {}

  /**
   * 멤버 정보 조회 헬퍼
   */
  private async getMemberInfo(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, avatarUrl: true, department: true, position: true },
    });
    return member;
  }

  /**
   * 프로젝트 정보 조회 헬퍼
   */
  private async getProjectInfo(projectId: string | null) {
    if (!projectId) return null;
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    return project;
  }

  /**
   * 팀 정보 조회 헬퍼
   */
  private async getTeamInfo(teamId: string | null) {
    if (!teamId) return null;
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, color: true },
    });
    return team;
  }

  /**
   * 작성자/관리자 권한 확인
   */
  private checkPermission(authorId: string, member: MemberContext): void {
    const isAdmin = member.permissions?.system?.manage_settings;

    if (authorId !== member.id && !isAdmin) {
      throw new ForbiddenError('권한이 없습니다.');
    }
  }

  /**
   * 회의자료 목록 조회
   */
  async findAll(params?: MeetingListParams) {
    const where: Record<string, unknown> = {};

    if (params?.projectId) where.projectId = params.projectId;
    if (params?.teamId) where.teamId = params.teamId;
    if (params?.authorId) where.authorId = params.authorId;
    if (params?.status) where.status = params.status;

    // 날짜 범위 필터
    if (params?.startDate || params?.endDate) {
      where.meetingDate = {};
      if (params?.startDate) (where.meetingDate as Record<string, unknown>).gte = params.startDate;
      if (params?.endDate) (where.meetingDate as Record<string, unknown>).lte = params.endDate;
    }

    // 검색어 필터
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search } },
        { content: { contains: params.search } },
        { summary: { contains: params.search } },
      ];
    }

    // 참석자 필터
    if (params?.attendeeId) {
      const attendeeRecords = await this.prisma.meetingAttendee.findMany({
        where: { memberId: params.attendeeId },
        select: { meetingId: true },
      });
      const meetingIds = attendeeRecords.map((a) => a.meetingId);
      where.id = { in: meetingIds };
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
      include: {
        attendees: true,
        _count: { select: { attachments: true, comments: true } },
      },
      orderBy: { meetingDate: 'desc' },
    });

    // 관계 정보 추가
    return Promise.all(
      meetings.map(async (meeting) => {
        const author = await this.getMemberInfo(meeting.authorId);
        const project = await this.getProjectInfo(meeting.projectId);
        const team = await this.getTeamInfo(meeting.teamId);
        const attendeesWithMembers = await Promise.all(
          meeting.attendees.map(async (attendee) => ({
            ...attendee,
            member: await this.getMemberInfo(attendee.memberId),
          }))
        );

        return {
          ...meeting,
          author,
          project,
          team,
          attendees: attendeesWithMembers,
        };
      })
    );
  }

  /**
   * 회의자료 상세 조회
   */
  async findById(id: number) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: true,
        attachments: true,
        comments: { orderBy: { createdAt: 'desc' } },
        agendas: { orderBy: { order: 'asc' } },
        actionItems: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    const author = await this.getMemberInfo(meeting.authorId);
    const project = await this.getProjectInfo(meeting.projectId);
    const team = await this.getTeamInfo(meeting.teamId);

    const attendeesWithMembers = await Promise.all(
      meeting.attendees.map(async (attendee) => ({
        ...attendee,
        member: await this.getMemberInfo(attendee.memberId),
      }))
    );

    const commentsWithAuthors = await Promise.all(
      meeting.comments.map(async (comment) => ({
        ...comment,
        author: await this.getMemberInfo(comment.authorId),
      }))
    );

    // 액션 아이템에 담당자 정보 추가
    const actionItemsWithAssignees = await Promise.all(
      meeting.actionItems.map(async (item) => ({
        ...item,
        assignee: item.assigneeId ? await this.getMemberInfo(item.assigneeId) : null,
      }))
    );

    return {
      ...meeting,
      author,
      project,
      team,
      attendees: attendeesWithMembers,
      comments: commentsWithAuthors,
      actionItems: actionItemsWithAssignees,
    };
  }

  /**
   * 회의자료 생성
   */
  async create(input: CreateMeetingInput, authorId: string) {
    if (!input.title?.trim()) {
      throw new ValidationError('제목을 입력해주세요.');
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        title: input.title,
        meetingDate: input.meetingDate,
        location: input.location,
        projectId: input.projectId ?? null,
        teamId: input.teamId ?? null,
        content: input.content,
        contentType: input.contentType || 'text',
        summary: input.summary,
        authorId,
        status: input.status || 'DRAFT',
        attendees: {
          create: (input.attendeeIds || []).map((memberId) => ({
            memberId,
          })),
        },
        agendas: input.agendas
          ? {
              create: input.agendas.map((agenda, index) => ({
                title: agenda.title,
                description: agenda.description,
                duration: agenda.duration,
                presenter: agenda.presenter,
                order: agenda.order ?? index,
              })),
            }
          : undefined,
        actionItems: input.actionItems
          ? {
              create: input.actionItems.map((item) => ({
                title: item.title,
                description: item.description,
                assigneeId: item.assigneeId,
                dueDate: item.dueDate,
                priority: item.priority || 'MEDIUM',
              })),
            }
          : undefined,
      },
      include: {
        attendees: true,
        agendas: { orderBy: { order: 'asc' } },
        actionItems: true,
        _count: { select: { attachments: true, comments: true } },
      },
    });

    const author = await this.getMemberInfo(meeting.authorId);
    const project = await this.getProjectInfo(meeting.projectId);
    const team = await this.getTeamInfo(meeting.teamId);

    const attendeesWithMembers = await Promise.all(
      meeting.attendees.map(async (attendee) => ({
        ...attendee,
        member: await this.getMemberInfo(attendee.memberId),
      }))
    );

    const actionItemsWithAssignees = await Promise.all(
      meeting.actionItems.map(async (item) => ({
        ...item,
        assignee: item.assigneeId ? await this.getMemberInfo(item.assigneeId) : null,
      }))
    );

    return {
      ...meeting,
      author,
      project,
      team,
      attendees: attendeesWithMembers,
      actionItems: actionItemsWithAssignees,
    };
  }

  /**
   * 회의자료 수정
   */
  async update(id: number, input: UpdateMeetingInput, member: MemberContext) {
    const existing = await this.prisma.meeting.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(existing.authorId, member);

    // 참석자 업데이트가 있으면 기존 삭제 후 재생성
    if (input.attendeeIds !== undefined) {
      await this.prisma.meetingAttendee.deleteMany({ where: { meetingId: id } });
    }

    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        title: input.title,
        meetingDate: input.meetingDate,
        location: input.location,
        projectId: input.projectId,
        teamId: input.teamId,
        content: input.content,
        contentType: input.contentType,
        summary: input.summary,
        status: input.status,
        ...(input.attendeeIds !== undefined && {
          attendees: {
            create: input.attendeeIds.map((memberId) => ({
              memberId,
            })),
          },
        }),
      },
      include: {
        attendees: true,
        agendas: { orderBy: { order: 'asc' } },
        actionItems: true,
        _count: { select: { attachments: true, comments: true } },
      },
    });

    const author = await this.getMemberInfo(meeting.authorId);
    const project = await this.getProjectInfo(meeting.projectId);
    const team = await this.getTeamInfo(meeting.teamId);

    const attendeesWithMembers = await Promise.all(
      meeting.attendees.map(async (attendee) => ({
        ...attendee,
        member: await this.getMemberInfo(attendee.memberId),
      }))
    );

    return {
      ...meeting,
      author,
      project,
      team,
      attendees: attendeesWithMembers,
    };
  }

  /**
   * 회의자료 삭제
   */
  async delete(id: number, member: MemberContext) {
    const existing = await this.prisma.meeting.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(existing.authorId, member);

    // 첨부파일 삭제
    const attachments = await this.prisma.meetingAttachment.findMany({
      where: { meetingId: id },
    });

    for (const attachment of attachments) {
      try {
        const fileId = (attachment as any).oneDriveId || attachment.storedName;
        await this.storageService.deleteFile(fileId, this.STORAGE_FOLDER);
      } catch (error) {
        console.error('File delete error:', error);
      }
    }

    await this.prisma.meeting.delete({ where: { id } });
  }

  /**
   * 첨부파일 업로드
   */
  async uploadAttachments(meetingId: number, files: UploadedFile[]) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    const attachments = [];

    for (const file of files) {
      const result = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        this.STORAGE_FOLDER
      );

      const attachment = await this.prisma.meetingAttachment.create({
        data: {
          meetingId,
          fileName: result.fileName,
          storedName: result.storedName,
          filePath: result.filePath,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          oneDriveId: result.storageType === 'onedrive' ? result.id : null,
          storageType: result.storageType,
        },
      });

      attachments.push(attachment);
    }

    return attachments;
  }

  /**
   * 첨부파일 삭제
   */
  async deleteAttachment(meetingId: number, attachmentId: number, member: MemberContext) {
    const attachment = await this.prisma.meetingAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundError('첨부파일을 찾을 수 없습니다.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: attachment.meetingId },
      select: { authorId: true },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(meeting.authorId, member);

    // 스토리지에서 파일 삭제
    const fileId = (attachment as any).oneDriveId || attachment.storedName;
    await this.storageService.deleteFile(fileId, this.STORAGE_FOLDER);

    // DB에서 레코드 삭제
    await this.prisma.meetingAttachment.delete({ where: { id: attachmentId } });
  }

  /**
   * 댓글 목록 조회
   */
  async getComments(meetingId: number) {
    const comments = await this.prisma.meetingComment.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        author: await this.getMemberInfo(comment.authorId),
      }))
    );
  }

  /**
   * 댓글 작성
   */
  async createComment(meetingId: number, content: string, authorId: string) {
    if (!content?.trim()) {
      throw new ValidationError('댓글 내용을 입력해주세요.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    const comment = await this.prisma.meetingComment.create({
      data: {
        meetingId,
        authorId,
        content,
      },
    });

    return {
      ...comment,
      author: await this.getMemberInfo(comment.authorId),
    };
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number, member: MemberContext) {
    const comment = await this.prisma.meetingComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundError('댓글을 찾을 수 없습니다.');
    }

    this.checkPermission(comment.authorId, member);

    await this.prisma.meetingComment.delete({ where: { id: commentId } });
  }

  // ==================== 안건 (Agenda) CRUD ====================

  /**
   * 안건 추가
   */
  async createAgenda(meetingId: number, input: CreateAgendaInput, member: MemberContext) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { authorId: true },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(meeting.authorId, member);

    if (!input.title?.trim()) {
      throw new ValidationError('안건 제목을 입력해주세요.');
    }

    // 현재 최대 order 값 조회
    const maxOrder = await this.prisma.meetingAgenda.aggregate({
      where: { meetingId },
      _max: { order: true },
    });

    const agenda = await this.prisma.meetingAgenda.create({
      data: {
        meetingId,
        title: input.title,
        description: input.description,
        duration: input.duration,
        presenter: input.presenter,
        order: input.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    return agenda;
  }

  /**
   * 안건 수정
   */
  async updateAgenda(agendaId: number, input: UpdateAgendaInput, member: MemberContext) {
    const agenda = await this.prisma.meetingAgenda.findUnique({
      where: { id: agendaId },
      include: { meeting: { select: { authorId: true } } },
    });

    if (!agenda) {
      throw new NotFoundError('안건을 찾을 수 없습니다.');
    }

    this.checkPermission(agenda.meeting.authorId, member);

    const updated = await this.prisma.meetingAgenda.update({
      where: { id: agendaId },
      data: {
        title: input.title,
        description: input.description,
        duration: input.duration,
        presenter: input.presenter,
        order: input.order,
        status: input.status,
      },
    });

    return updated;
  }

  /**
   * 안건 삭제
   */
  async deleteAgenda(agendaId: number, member: MemberContext) {
    const agenda = await this.prisma.meetingAgenda.findUnique({
      where: { id: agendaId },
      include: { meeting: { select: { authorId: true } } },
    });

    if (!agenda) {
      throw new NotFoundError('안건을 찾을 수 없습니다.');
    }

    this.checkPermission(agenda.meeting.authorId, member);

    await this.prisma.meetingAgenda.delete({ where: { id: agendaId } });
  }

  /**
   * 안건 순서 일괄 업데이트
   */
  async reorderAgendas(meetingId: number, agendaIds: number[], member: MemberContext) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { authorId: true },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(meeting.authorId, member);

    // 트랜잭션으로 순서 업데이트
    await this.prisma.$transaction(
      agendaIds.map((id, index) =>
        this.prisma.meetingAgenda.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return this.prisma.meetingAgenda.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });
  }

  // ==================== 액션 아이템 (ActionItem) CRUD ====================

  /**
   * 액션 아이템 추가
   */
  async createActionItem(meetingId: number, input: CreateActionItemInput, member: MemberContext) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { authorId: true },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(meeting.authorId, member);

    if (!input.title?.trim()) {
      throw new ValidationError('액션 아이템 제목을 입력해주세요.');
    }

    const actionItem = await this.prisma.meetingActionItem.create({
      data: {
        meetingId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
        priority: input.priority || 'MEDIUM',
      },
    });

    const assignee = actionItem.assigneeId
      ? await this.getMemberInfo(actionItem.assigneeId)
      : null;

    return { ...actionItem, assignee };
  }

  /**
   * 액션 아이템 수정
   */
  async updateActionItem(actionItemId: number, input: UpdateActionItemInput, member: MemberContext) {
    const actionItem = await this.prisma.meetingActionItem.findUnique({
      where: { id: actionItemId },
      include: { meeting: { select: { authorId: true } } },
    });

    if (!actionItem) {
      throw new NotFoundError('액션 아이템을 찾을 수 없습니다.');
    }

    this.checkPermission(actionItem.meeting.authorId, member);

    const updated = await this.prisma.meetingActionItem.update({
      where: { id: actionItemId },
      data: {
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
        priority: input.priority,
        status: input.status,
      },
    });

    const assignee = updated.assigneeId
      ? await this.getMemberInfo(updated.assigneeId)
      : null;

    return { ...updated, assignee };
  }

  /**
   * 액션 아이템 삭제
   */
  async deleteActionItem(actionItemId: number, member: MemberContext) {
    const actionItem = await this.prisma.meetingActionItem.findUnique({
      where: { id: actionItemId },
      include: { meeting: { select: { authorId: true } } },
    });

    if (!actionItem) {
      throw new NotFoundError('액션 아이템을 찾을 수 없습니다.');
    }

    this.checkPermission(actionItem.meeting.authorId, member);

    await this.prisma.meetingActionItem.delete({ where: { id: actionItemId } });
  }

  /**
   * 회의자료의 모든 안건 조회
   */
  async getAgendas(meetingId: number) {
    return this.prisma.meetingAgenda.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * 회의자료의 모든 액션 아이템 조회
   */
  async getActionItems(meetingId: number) {
    const items = await this.prisma.meetingActionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        assignee: item.assigneeId ? await this.getMemberInfo(item.assigneeId) : null,
      }))
    );
  }
}
