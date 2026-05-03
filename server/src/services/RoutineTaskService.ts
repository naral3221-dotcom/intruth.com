import { Prisma, PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors.js';

type RoutineRepeatType = 'daily' | 'weekly' | 'custom';
type RoutinePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface RoutineMemberContext {
  id: string;
  permissions?: Record<string, any>;
}

export interface RoutineListParams {
  personal?: boolean;
  dayOfWeek?: number;
  projectId?: string;
  all?: boolean;
}

export interface CreateRoutineTaskInput {
  title: string;
  description?: string | null;
  repeatDays?: number[];
  repeatType?: RoutineRepeatType;
  projectId?: string | null;
  priority?: RoutinePriority;
  estimatedMinutes?: number | null;
  assigneeIds?: string[];
}

export interface UpdateRoutineTaskInput extends Partial<CreateRoutineTaskInput> {
  isActive?: boolean;
}

const PRIORITIES = new Set<RoutinePriority>(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const REPEAT_TYPES = new Set<RoutineRepeatType>(['daily', 'weekly', 'custom']);
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

const memberSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  department: true,
  position: true,
  isActive: true,
  createdAt: true,
} as const;

const routineInclude = {
  project: { select: { id: true, name: true } },
  createdBy: { select: memberSelect },
  assignees: {
    include: {
      member: { select: memberSelect },
    },
    orderBy: { assignedAt: 'asc' as const },
  },
  completions: {
    include: {
      completedBy: { select: { id: true, name: true } },
    },
    orderBy: { completedAt: 'desc' as const },
    take: 7,
  },
} as const;

type RoutineWithRelations = Prisma.RoutineTaskGetPayload<{ include: typeof routineInclude }>;

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getKoreaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export class RoutineTaskService {
  constructor(private readonly prisma: PrismaClient) {}

  private hasPermission(member: RoutineMemberContext, category: string, action: string) {
    return Boolean(member.permissions?.system?.manage_settings || member.permissions?.[category]?.[action]);
  }

  private normalizePriority(value: unknown): RoutinePriority {
    const priority = String(value || 'MEDIUM').toUpperCase() as RoutinePriority;
    return PRIORITIES.has(priority) ? priority : 'MEDIUM';
  }

  private normalizeRepeatType(value: unknown): RoutineRepeatType {
    const repeatType = String(value || 'weekly').toLowerCase() as RoutineRepeatType;
    return REPEAT_TYPES.has(repeatType) ? repeatType : 'weekly';
  }

  private normalizeRepeatDays(value: unknown, repeatType: RoutineRepeatType) {
    if (repeatType === 'daily') return ALL_DAYS;
    if (repeatType === 'weekly') return WEEKDAYS;

    const days = Array.isArray(value)
      ? value
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [];
    const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
    if (uniqueDays.length === 0) {
      throw new ValidationError('직접 선택 반복은 최소 1개 요일이 필요합니다.');
    }
    return uniqueDays;
  }

  private normalizeEstimatedMinutes(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
      throw new ValidationError('예상 소요 시간은 0분 이상 1440분 이하로 입력해주세요.');
    }
    return Math.round(minutes);
  }

  private isVisibleWhere(member: RoutineMemberContext): Prisma.RoutineTaskWhereInput {
    if (member.permissions?.system?.manage_settings) return {};

    return {
      OR: [
        { createdById: member.id },
        { assignees: { some: { memberId: member.id } } },
        { project: { ownerId: member.id } },
        { project: { members: { some: { memberId: member.id } } } },
      ],
    };
  }

  private async ensureProjectAccess(projectId: string, member: RoutineMemberContext, write: boolean) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        members: { select: { memberId: true } },
      },
    });

    if (!project) {
      throw new ValidationError('루틴을 연결할 프로젝트를 찾을 수 없습니다.');
    }

    const isProjectMember = project.ownerId === member.id || project.members.some((item) => item.memberId === member.id);
    const isAdmin = Boolean(member.permissions?.system?.manage_settings);
    const canWrite = isAdmin || (this.hasPermission(member, 'task', write ? 'create' : 'edit') && isProjectMember);

    if (write && !canWrite) {
      throw new ForbiddenError('선택한 프로젝트에 루틴을 만들 권한이 없습니다.');
    }

    if (!write && !isAdmin && !isProjectMember) {
      throw new ForbiddenError('선택한 프로젝트에 접근할 권한이 없습니다.');
    }

    return project;
  }

  private async normalizeAssigneeIds(inputIds: unknown, fallbackMemberId: string) {
    const ids = Array.isArray(inputIds)
      ? inputIds.map((id) => String(id)).filter(Boolean)
      : [];
    const uniqueIds = [...new Set(ids.length ? ids : [fallbackMemberId])];
    const activeMembers = await this.prisma.member.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true },
    });
    const activeSet = new Set(activeMembers.map((member) => member.id));
    const invalid = uniqueIds.filter((id) => !activeSet.has(id));

    if (invalid.length > 0) {
      throw new ValidationError('담당자로 지정할 수 없는 멤버가 포함되어 있습니다.');
    }

    return uniqueIds;
  }

  private buildWhere(member: RoutineMemberContext, params: RoutineListParams = {}) {
    const and: Prisma.RoutineTaskWhereInput[] = [this.isVisibleWhere(member)];

    if (params.projectId) {
      and.push({ projectId: params.projectId });
    }

    if (params.personal) {
      and.push({
        OR: [
          { createdById: member.id },
          { assignees: { some: { memberId: member.id } } },
        ],
      });
    }

    if (!params.all && params.dayOfWeek !== undefined) {
      and.push({ repeatDays: { has: params.dayOfWeek } });
      and.push({ isActive: true });
    } else if (!params.all && !params.projectId) {
      and.push({ repeatDays: { has: new Date().getDay() } });
      and.push({ isActive: true });
    } else {
      and.push({ isActive: true });
    }

    return { AND: and } satisfies Prisma.RoutineTaskWhereInput;
  }

  private toResponse(routine: RoutineWithRelations, today = getKoreaDateString()) {
    return {
      id: routine.id,
      title: routine.title,
      description: routine.description || undefined,
      repeatDays: routine.repeatDays,
      repeatType: routine.repeatType,
      projectId: routine.projectId || undefined,
      project: routine.project || undefined,
      priority: routine.priority,
      estimatedMinutes: routine.estimatedMinutes || undefined,
      isActive: routine.isActive,
      assignees: routine.assignees.map((assignee) => assignee.member),
      isCompletedToday: routine.completions.some((completion) => completion.date === today),
      recentCompletions: routine.completions.map((completion) => ({
        date: completion.date,
        completedAt: completion.completedAt.toISOString(),
        completedByName: completion.completedBy.name,
      })),
      createdBy: routine.createdBy,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    };
  }

  async findAll(member: RoutineMemberContext, params: RoutineListParams = {}) {
    if (params.projectId) {
      await this.ensureProjectAccess(params.projectId, member, false);
    }

    const routines = await this.prisma.routineTask.findMany({
      where: this.buildWhere(member, params),
      include: routineInclude,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return routines.map((routine) => this.toResponse(routine));
  }

  async findById(id: string, member: RoutineMemberContext) {
    const routine = await this.prisma.routineTask.findFirst({
      where: {
        id,
        AND: [this.isVisibleWhere(member)],
      },
      include: routineInclude,
    });

    if (!routine) {
      throw new NotFoundError('루틴을 찾을 수 없습니다.');
    }

    return this.toResponse(routine);
  }

  async create(member: RoutineMemberContext, input: CreateRoutineTaskInput) {
    const title = compactWhitespace(String(input.title || ''));
    if (!title) {
      throw new ValidationError('루틴 제목은 필수입니다.');
    }

    const projectId = input.projectId ? String(input.projectId) : null;
    if (projectId) {
      await this.ensureProjectAccess(projectId, member, true);
    } else if (!this.hasPermission(member, 'task', 'create')) {
      throw new ForbiddenError('루틴을 만들 권한이 없습니다.');
    }

    const repeatType = this.normalizeRepeatType(input.repeatType);
    const repeatDays = this.normalizeRepeatDays(input.repeatDays, repeatType);
    const assigneeIds = await this.normalizeAssigneeIds(input.assigneeIds, member.id);

    const routine = await this.prisma.routineTask.create({
      data: {
        title: title.slice(0, 160),
        description: input.description ? String(input.description).trim().slice(0, 1000) : null,
        repeatType,
        repeatDays,
        projectId,
        priority: this.normalizePriority(input.priority),
        estimatedMinutes: this.normalizeEstimatedMinutes(input.estimatedMinutes),
        createdById: member.id,
        assignees: {
          create: assigneeIds.map((memberId) => ({ memberId })),
        },
      },
      include: routineInclude,
    });

    return this.toResponse(routine);
  }

  async update(id: string, member: RoutineMemberContext, input: UpdateRoutineTaskInput) {
    const existing = await this.prisma.routineTask.findFirst({
      where: {
        id,
        AND: [this.isVisibleWhere(member)],
      },
      include: { assignees: true, project: { select: { ownerId: true, members: { select: { memberId: true } } } } },
    });

    if (!existing) {
      throw new NotFoundError('루틴을 찾을 수 없습니다.');
    }

    const isAdmin = Boolean(member.permissions?.system?.manage_settings);
    const isOwner = existing.createdById === member.id;
    const isAssignee = existing.assignees.some((assignee) => assignee.memberId === member.id);
    const isProjectEditor = existing.project
      ? this.hasPermission(member, 'task', 'edit')
        && (existing.project.ownerId === member.id || existing.project.members.some((item) => item.memberId === member.id))
      : false;

    if (!isAdmin && !isOwner && !isAssignee && !isProjectEditor) {
      throw new ForbiddenError('루틴을 수정할 권한이 없습니다.');
    }

    const projectId = input.projectId === undefined ? undefined : input.projectId ? String(input.projectId) : null;
    if (projectId) {
      await this.ensureProjectAccess(projectId, member, true);
    }

    const repeatType = input.repeatType ? this.normalizeRepeatType(input.repeatType) : existing.repeatType as RoutineRepeatType;
    const repeatDays = input.repeatDays !== undefined || input.repeatType !== undefined
      ? this.normalizeRepeatDays(input.repeatDays ?? existing.repeatDays, repeatType)
      : undefined;
    const assigneeIds = input.assigneeIds !== undefined
      ? await this.normalizeAssigneeIds(input.assigneeIds, member.id)
      : undefined;

    const routine = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.routineTask.update({
        where: { id },
        data: {
          title: input.title !== undefined ? compactWhitespace(String(input.title)).slice(0, 160) : undefined,
          description: input.description !== undefined
            ? input.description
              ? String(input.description).trim().slice(0, 1000)
              : null
            : undefined,
          repeatType: input.repeatType !== undefined ? repeatType : undefined,
          repeatDays,
          projectId,
          priority: input.priority !== undefined ? this.normalizePriority(input.priority) : undefined,
          estimatedMinutes: input.estimatedMinutes !== undefined ? this.normalizeEstimatedMinutes(input.estimatedMinutes) : undefined,
          isActive: input.isActive,
        },
        include: routineInclude,
      });

      if (assigneeIds) {
        await tx.routineTaskAssignee.deleteMany({ where: { routineTaskId: id } });
        await tx.routineTaskAssignee.createMany({
          data: assigneeIds.map((memberId) => ({ routineTaskId: id, memberId })),
          skipDuplicates: true,
        });
      }

      return tx.routineTask.findUniqueOrThrow({ where: { id: updated.id }, include: routineInclude });
    });

    return this.toResponse(routine);
  }

  async delete(id: string, member: RoutineMemberContext) {
    const existing = await this.prisma.routineTask.findFirst({
      where: {
        id,
        AND: [this.isVisibleWhere(member)],
      },
      select: { id: true, createdById: true },
    });

    if (!existing) {
      throw new NotFoundError('루틴을 찾을 수 없습니다.');
    }

    const canDelete = member.permissions?.system?.manage_settings || existing.createdById === member.id || this.hasPermission(member, 'task', 'delete');
    if (!canDelete) {
      throw new ForbiddenError('루틴을 삭제할 권한이 없습니다.');
    }

    await this.prisma.routineTask.delete({ where: { id } });
  }

  async complete(id: string, member: RoutineMemberContext) {
    await this.findById(id, member);
    const date = getKoreaDateString();

    await this.prisma.routineTaskCompletion.upsert({
      where: {
        routineTaskId_date: {
          routineTaskId: id,
          date,
        },
      },
      create: {
        routineTaskId: id,
        date,
        completedById: member.id,
      },
      update: {
        completedById: member.id,
        completedAt: new Date(),
      },
    });

    return { success: true, completed: true, date };
  }

  async uncomplete(id: string, member: RoutineMemberContext) {
    await this.findById(id, member);
    const date = getKoreaDateString();

    await this.prisma.routineTaskCompletion.deleteMany({
      where: {
        routineTaskId: id,
        date,
      },
    });

    return { success: true, completed: false, date };
  }
}
