/**
 * Task Service
 * 업무 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { ActivityLogService } from './ActivityLogService.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors.js';

// Input DTOs
export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  reporterId: string;
  startDate?: Date;
  dueDate?: Date;
  parentId?: string;
  folderUrl?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  folderUrl?: string;
}

export interface UpdateTaskStatusInput {
  status: string;
  order?: number;
}

export interface TaskListParams {
  projectId?: string;
  status?: string;
  assigneeId?: string;
}

export interface TaskActorContext {
  id: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface CreateTasksFromMeetingActionItemsInput {
  meetingId: number;
  actionItemIds: number[];
  overrides?: MeetingActionItemTaskOverride[];
  reporterId: string;
  member: TaskActorContext;
}

export interface MeetingActionItemTaskOverride {
  actionItemId: number;
  title?: string;
  description?: string | null;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
}

export class TaskService {
  private readonly defaultInclude = {
    assignee: { select: { id: true, name: true, avatarUrl: true } },
    reporter: { select: { id: true, name: true, avatarUrl: true } },
    labels: { include: { label: true } },
    _count: { select: { subtasks: true, comments: true } },
  };

  constructor(
    private prisma: PrismaClient,
    private activityLogService: ActivityLogService
  ) {}

  private checkMeetingPermission(authorId: string, member: TaskActorContext): void {
    const isAuthor = authorId === member.id;
    const isAdmin = member.permissions?.system?.manage_settings;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError('회의 할 일을 업무로 전환할 권한이 없습니다.');
    }
  }

  private formatMeetingTaskDescription(input: {
    meetingTitle: string;
    meetingDate: Date;
    actionDescription?: string | null;
  }) {
    const context = [
      `회의자료: ${input.meetingTitle}`,
      `회의일: ${input.meetingDate.toISOString().slice(0, 10)}`,
    ].join('\n');

    return [input.actionDescription?.trim(), context].filter(Boolean).join('\n\n');
  }

  /**
   * 업무 목록 조회
   */
  async findAll(params: TaskListParams) {
    const where: Prisma.TaskWhereInput = {};
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;
    if (params.assigneeId) where.assigneeId = params.assigneeId;

    return this.prisma.task.findMany({
      where,
      include: this.defaultInclude,
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * 업무 상세 조회
   */
  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude,
        project: { select: { id: true, name: true } },
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            position: true,
          },
        },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return task;
  }

  /**
   * 업무 생성
   */
  async create(input: CreateTaskInput) {
    // 유효성 검증
    if (!input.title?.trim()) {
      throw new ValidationError('업무 제목은 필수입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 마지막 순서 가져오기
      const lastTask = await tx.task.findFirst({
        where: { projectId: input.projectId, status: 'TODO' },
        orderBy: { order: 'desc' },
      });

      const task = await tx.task.create({
        data: {
          projectId: input.projectId,
          title: input.title.trim(),
          description: input.description,
          priority: input.priority || 'MEDIUM',
          assigneeId: input.assigneeId,
          reporterId: input.reporterId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          parentId: input.parentId,
          folderUrl: input.folderUrl,
          order: (lastTask?.order || 0) + 1,
        },
        include: this.defaultInclude,
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId: input.reporterId,
        action: 'created',
        details: { title: task.title },
      });

      return task;
    });
  }

  /**
   * 회의 할 일을 실제 업무로 전환
   */
  async createFromMeetingActionItems(input: CreateTasksFromMeetingActionItemsInput) {
    const actionItemIds = Array.from(
      new Set(input.actionItemIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))
    );
    const overrideByActionItemId = new Map<number, MeetingActionItemTaskOverride>();

    for (const override of input.overrides || []) {
      const actionItemId = Number(override.actionItemId);
      if (Number.isInteger(actionItemId) && actionItemId > 0) {
        overrideByActionItemId.set(actionItemId, { ...override, actionItemId });
      }
    }

    if (actionItemIds.length === 0) {
      throw new ValidationError('업무로 만들 회의 할 일을 선택해주세요.');
    }

    const invalidOverrideIds = Array.from(overrideByActionItemId.keys()).filter(
      (actionItemId) => !actionItemIds.includes(actionItemId)
    );

    if (invalidOverrideIds.length > 0) {
      throw new ValidationError('선택하지 않은 회의 할 일의 편집값이 포함되어 있습니다.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: input.meetingId },
      include: {
        actionItems: {
          where: { id: { in: actionItemIds } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkMeetingPermission(meeting.authorId, input.member);

    if (!meeting.projectId) {
      throw new ValidationError('업무로 전환하려면 회의자료에 프로젝트를 먼저 연결해야 합니다.');
    }

    if (meeting.actionItems.length !== actionItemIds.length) {
      throw new ValidationError('선택한 회의 할 일 중 찾을 수 없는 항목이 있습니다.');
    }

    const overrideAssigneeIds = Array.from(new Set(
      Array.from(overrideByActionItemId.values())
        .map((override) => override.assigneeId)
        .filter((assigneeId): assigneeId is string => Boolean(assigneeId))
    ));

    if (overrideAssigneeIds.length > 0) {
      const existingAssignees = await this.prisma.member.findMany({
        where: { id: { in: overrideAssigneeIds }, isActive: true },
        select: { id: true },
      });
      const existingAssigneeIds = new Set(existingAssignees.map((member) => member.id));
      const missingAssigneeIds = overrideAssigneeIds.filter((assigneeId) => !existingAssigneeIds.has(assigneeId));

      if (missingAssigneeIds.length > 0) {
        throw new ValidationError('담당자로 선택할 수 없는 멤버가 포함되어 있습니다.');
      }
    }

    const skippedActionItemIds = meeting.actionItems
      .filter((item) => Boolean(item.taskId))
      .map((item) => item.id);
    const actionItemsToConvert = meeting.actionItems.filter((item) => !item.taskId);

    if (actionItemsToConvert.length === 0) {
      return {
        tasks: [],
        meetingId: meeting.id,
        projectId: meeting.projectId,
        convertedActionItemIds: [],
        skippedActionItemIds,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const lastTask = await tx.task.findFirst({
        where: { projectId: meeting.projectId!, status: 'TODO' },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      let nextOrder = lastTask?.order || 0;
      const tasks = [];
      const convertedActionItemIds: number[] = [];

      for (const item of actionItemsToConvert) {
        const override = overrideByActionItemId.get(item.id);
        const title = override?.title !== undefined ? override.title.trim() : item.title.trim();
        const description = override?.description !== undefined
          ? override.description?.trim() || null
          : item.description;
        const priority = override?.priority || item.priority || 'MEDIUM';
        const assigneeId = override?.assigneeId !== undefined
          ? override.assigneeId || null
          : item.assigneeId;
        const dueDate = override?.dueDate !== undefined
          ? override.dueDate
          : item.dueDate;

        if (!title) {
          throw new ValidationError('업무 제목은 비워둘 수 없습니다.');
        }

        nextOrder += 1;
        const task = await tx.task.create({
          data: {
            projectId: meeting.projectId!,
            title,
            description: this.formatMeetingTaskDescription({
              meetingTitle: meeting.title,
              meetingDate: meeting.meetingDate,
              actionDescription: description,
            }),
            priority,
            assigneeId: assigneeId || undefined,
            reporterId: input.reporterId,
            dueDate: dueDate ?? undefined,
            order: nextOrder,
          },
          include: this.defaultInclude,
        });

        await tx.meetingActionItem.update({
          where: { id: item.id },
          data: {
            title,
            description,
            priority,
            assigneeId,
            dueDate,
            taskId: task.id,
          },
        });

        await this.activityLogService.createWithTransaction(tx, {
          taskId: task.id,
          memberId: input.reporterId,
          action: 'created',
          details: {
            title: task.title,
            source: 'meeting_action_item',
            meetingId: meeting.id,
            actionItemId: item.id,
          },
        });

        tasks.push(task);
        convertedActionItemIds.push(item.id);
      }

      return {
        tasks,
        meetingId: meeting.id,
        projectId: meeting.projectId!,
        convertedActionItemIds,
        skippedActionItemIds,
      };
    });
  }

  /**
   * 업무 수정
   */
  async update(id: string, input: UpdateTaskInput, memberId: string) {
    // 업무 존재 확인
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          title: input.title?.trim(),
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
          actualHours: input.actualHours,
          folderUrl: input.folderUrl,
        },
        include: this.defaultInclude,
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId,
        action: 'updated',
        details: { title: task.title },
      });

      return task;
    });
  }

  /**
   * 업무 상태 변경
   */
  async updateStatus(id: string, input: UpdateTaskStatusInput, memberId: string) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          status: input.status,
          order: input.order ?? existingTask.order,
        },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId,
        action: 'moved',
        details: {
          from: existingTask.status,
          to: input.status,
        },
      });

      return task;
    });
  }

  /**
   * 업무 순서 변경
   */
  async updateOrder(id: string, order: number) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.task.update({
      where: { id },
      data: { order },
      include: this.defaultInclude,
    });
  }

  /**
   * 업무 삭제
   */
  async delete(id: string) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    await this.prisma.task.delete({ where: { id } });
  }

  /**
   * 여러 업무 일괄 삭제
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) {
      throw new ValidationError('삭제할 업무 ID가 없습니다.');
    }

    const result = await this.prisma.task.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }

  /**
   * 여러 업무 일괄 수정
   */
  async updateMany(ids: string[], input: UpdateTaskInput, memberId: string) {
    if (!ids || ids.length === 0) {
      throw new ValidationError('수정할 업무 ID가 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 업무 일괄 수정
      await tx.task.updateMany({
        where: { id: { in: ids } },
        data: {
          title: input.title?.trim(),
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
          actualHours: input.actualHours,
          folderUrl: input.folderUrl,
        },
      });

      // 수정된 업무 목록 조회
      const updatedTasks = await tx.task.findMany({
        where: { id: { in: ids } },
        include: this.defaultInclude,
      });

      // 각 업무에 대해 활동 로그 기록
      for (const task of updatedTasks) {
        await this.activityLogService.createWithTransaction(tx, {
          taskId: task.id,
          memberId,
          action: 'updated',
          details: { title: task.title, batchUpdate: true },
        });
      }

      return updatedTasks;
    });
  }

  /**
   * 댓글 추가
   */
  async addComment(taskId: string, authorId: string, content: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    if (!content?.trim()) {
      throw new ValidationError('댓글 내용은 필수입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId,
          authorId,
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId,
        memberId: authorId,
        action: 'commented',
        details: { commentId: comment.id },
      });

      return comment;
    });
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(taskId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new NotFoundError('댓글을 찾을 수 없습니다.');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  /**
   * 업무 활동 로그 조회
   */
  async getActivities(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.activityLogService.findByTaskId(taskId);
  }
}
