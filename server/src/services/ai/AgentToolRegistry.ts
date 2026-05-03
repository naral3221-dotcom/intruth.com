import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from '../ActivityLogService.js';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';

export type AgentToolName = 'create_project' | 'create_meeting' | 'create_tasks' | 'create_team';

export interface AgentMemberContext {
  id: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface AgentToolScope {
  type: 'GLOBAL' | 'PROJECT' | 'MEETING';
  id?: string;
  label: string;
  projectId?: string;
  meetingId?: number;
}

export interface AgentTaskDraft {
  title: string;
  description?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export interface AgentAgendaDraft {
  title: string;
  description?: string | null;
}

export interface AgentToolCallPreview {
  id: string;
  toolName: AgentToolName;
  label: string;
  summary: string;
  args: {
    title?: string;
    description?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    teamId?: string | null;
    teamName?: string | null;
    meetingDate?: string | null;
    content?: string | null;
    color?: string | null;
    tasks?: AgentTaskDraft[];
    agendas?: AgentAgendaDraft[];
  };
}

export interface AgentToolPlanPreview {
  type: 'TOOL_PLAN';
  prompt: string;
  brief: string;
  tools: AgentToolCallPreview[];
  generatedAt: string;
  sourceRunId?: number;
}

export interface AgentToolActionRow {
  id: number;
  assistantRunId: number | null;
  actionType: string;
  status: string;
  scopeType: string;
  scopeId: string | null;
  scopeLabel: string | null;
  preview: unknown;
  result: unknown;
  errorMessage: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TASK_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const WEEKDAY_OFFSETS: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDateTime(date: Date, hour = 10, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

export class AgentToolRegistry {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly activityLogService: ActivityLogService
  ) {}

  listTools() {
    return [
      {
        name: 'create_project',
        description: '새 프로젝트를 생성합니다. 생성자는 프로젝트 OWNER 멤버로 자동 등록됩니다.',
        approvalRequired: true,
      },
      {
        name: 'create_meeting',
        description: '회의자료 페이지를 생성합니다. 프로젝트, 팀, 안건을 함께 연결할 수 있습니다.',
        approvalRequired: true,
      },
      {
        name: 'create_tasks',
        description: '선택 프로젝트에 업무 여러 개를 생성합니다. 담당자와 마감일은 명확할 때만 지정합니다.',
        approvalRequired: true,
      },
      {
        name: 'create_team',
        description: '새 팀을 생성하고 리더를 팀 멤버로 등록합니다.',
        approvalRequired: true,
      },
    ];
  }

  private hasPermission(member: AgentMemberContext, category: string, action: string) {
    return Boolean(member.permissions?.system?.manage_settings || member.permissions?.[category]?.[action]);
  }

  private normalizePriority(value: unknown): AgentTaskDraft['priority'] {
    const priority = String(value || 'MEDIUM').toUpperCase();
    return TASK_PRIORITIES.has(priority) ? priority as AgentTaskDraft['priority'] : 'MEDIUM';
  }

  private parseDueDate(value: unknown) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : raw;
  }

  private normalizePersonName(value: unknown) {
    return String(value || '')
      .replace(/\s+/g, '')
      .replace(/님|목사|전도사|간사|리더|팀장/g, '')
      .toLowerCase();
  }

  private matchAssigneeId(
    assigneeName: string | null | undefined,
    candidates: Array<{ id: string; name: string; email: string; username: string | null }>
  ) {
    const normalizedName = this.normalizePersonName(assigneeName);
    if (!normalizedName) return null;

    const normalizedCandidates = candidates.map((candidate) => ({
      id: candidate.id,
      names: [
        candidate.name,
        candidate.username,
        candidate.email?.split('@')[0],
      ].map((value) => this.normalizePersonName(value)).filter(Boolean),
    }));

    const exact = normalizedCandidates.find((candidate) => candidate.names.includes(normalizedName));
    if (exact) return exact.id;

    const partial = normalizedCandidates.find((candidate) =>
      candidate.names.some((name) => name.includes(normalizedName) || normalizedName.includes(name))
    );

    return partial?.id || null;
  }

  private parseMeetingDate(prompt: string) {
    const now = new Date();
    const explicit = prompt.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
    if (explicit) {
      const date = new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3]));
      return toIsoDateTime(date, 19, 30);
    }

    if (/내일/.test(prompt)) return toIsoDateTime(addDays(now, 1), 19, 30);
    if (/오늘/.test(prompt)) return toIsoDateTime(now, 19, 30);

    const weekday = Object.keys(WEEKDAY_OFFSETS).find((day) => prompt.includes(day));
    if (weekday) {
      const target = WEEKDAY_OFFSETS[weekday];
      const current = now.getDay();
      const diff = (target - current + 7) % 7 || 7;
      return toIsoDateTime(addDays(now, diff), 19, 30);
    }

    return toIsoDateTime(addDays(now, 1), 19, 30);
  }

  private inferTitle(prompt: string, fallback: string) {
    const quoted = prompt.match(/["'“”‘’](.+?)["'“”‘’]/);
    if (quoted?.[1]) return compactWhitespace(quoted[1]).slice(0, 80);

    return compactWhitespace(
      prompt
        .replace(/만들어줘|생성해줘|추가해줘|등록해줘|잡아줘|열어줘|해줘/g, '')
        .replace(/새\s*/g, '')
    ).slice(0, 80) || fallback;
  }

  private buildTaskDrafts(prompt: string): AgentTaskDraft[] {
    const withoutCommand = prompt
      .replace(/업무|할 일|태스크|만들어줘|생성해줘|추가해줘|등록해줘|제안해줘/g, ' ')
      .trim();
    const parts = withoutCommand
      .split(/\n|,|;|그리고|및|랑|하고/g)
      .map((item) => compactWhitespace(item))
      .filter((item) => item.length >= 2)
      .slice(0, 5);
    const sourceItems = parts.length ? parts : [this.inferTitle(prompt, '새 업무')];
    const urgentPattern = /급|긴급|오늘|마감|바로|빨리/;

    return sourceItems.map((item) => ({
      title: item.length > 80 ? `${item.slice(0, 77)}...` : item,
      description: `AI 에이전트 명령에서 생성된 업무입니다.\n원문: ${prompt}`,
      priority: urgentPattern.test(item) ? 'HIGH' : 'MEDIUM',
      dueDate: this.parseDueDate(item),
      assigneeId: null,
      assigneeName: null,
    }));
  }

  private buildAgendaDrafts(prompt: string): AgentAgendaDraft[] {
    if (/안건|회의/.test(prompt)) {
      return [
        { title: '지난 실행 항목 확인', description: '지난 회의에서 정한 일을 짧게 점검합니다.' },
        { title: '이번 주 주요 결정', description: '이번 주 사역 운영에 필요한 결정을 정리합니다.' },
        { title: '담당자와 다음 행동 확정', description: '회의 후 실제 업무로 옮길 항목을 확정합니다.' },
      ];
    }

    return [];
  }

  buildLocalPlan(prompt: string, scope: AgentToolScope): AgentToolPlanPreview {
    const normalized = prompt.toLowerCase();
    const tools: AgentToolCallPreview[] = [];
    const projectId = scope.projectId || (scope.type === 'PROJECT' ? scope.id : undefined);
    const wantsCreate = /만들|생성|추가|등록|시작|준비|잡아|열어|create|make|add|setup|schedule/.test(normalized);
    const wantsProject = /프로젝트|사역|project/.test(normalized);
    const wantsMeeting = /회의|회의자료|회의록|미팅|meeting/.test(normalized);
    const wantsTask = /업무|할 일|태스크|액션|task|todo/.test(normalized);
    const wantsTeam = /팀|그룹|team|group/.test(normalized);

    if (wantsTeam && wantsCreate) {
      const title = this.inferTitle(prompt, '새 팀');
      tools.push({
        id: `tool-${tools.length + 1}`,
        toolName: 'create_team',
        label: '팀 생성',
        summary: `"${title}" 팀을 생성합니다.`,
        args: {
          title,
          description: 'AI 에이전트가 제안한 팀입니다.',
          color: '#06b6d4',
        },
      });
    }

    if (wantsProject && wantsCreate) {
      const title = this.inferTitle(prompt, '새 프로젝트');
      tools.push({
        id: `tool-${tools.length + 1}`,
        toolName: 'create_project',
        label: '프로젝트 생성',
        summary: `"${title}" 프로젝트를 생성합니다.`,
        args: {
          title,
          description: 'AI 에이전트가 제안한 프로젝트입니다.',
        },
      });
    }

    if (wantsMeeting && wantsCreate) {
      const title = this.inferTitle(prompt, '새 회의자료');
      tools.push({
        id: `tool-${tools.length + 1}`,
        toolName: 'create_meeting',
        label: '회의자료 생성',
        summary: `"${title}" 회의자료를 생성합니다.`,
        args: {
          title,
          projectId: projectId || null,
          meetingDate: this.parseMeetingDate(prompt),
          content: 'AI 에이전트가 생성한 회의자료 초안입니다. 회의 중 내용을 보강해주세요.',
          agendas: this.buildAgendaDrafts(prompt),
        },
      });
    }

    if (wantsTask && wantsCreate) {
      const tasks = this.buildTaskDrafts(prompt);
      tools.push({
        id: `tool-${tools.length + 1}`,
        toolName: 'create_tasks',
        label: '업무 생성',
        summary: `${tasks.length}개 업무를 생성합니다.`,
        args: {
          projectId: projectId || null,
          tasks,
        },
      });
    }

    if (tools.length === 0) {
      throw new ValidationError('실행할 수 있는 에이전트 도구를 찾지 못했습니다. 예: "청년부 회의 만들고 준비 업무 3개 만들어줘"처럼 말해주세요.');
    }

    return {
      type: 'TOOL_PLAN',
      prompt,
      brief: `${tools.length}개 실행 도구를 승인 대기 상태로 준비했습니다.`,
      tools,
      generatedAt: new Date().toISOString(),
    };
  }

  toToolPlanPreview(value: unknown): AgentToolPlanPreview {
    const preview = value && typeof value === 'object' ? value as Partial<AgentToolPlanPreview> : {};
    const tools = Array.isArray(preview.tools) ? preview.tools : [];
    const normalizedTools = tools
      .map((tool, index) => {
        const candidate = tool && typeof tool === 'object' ? tool as Partial<AgentToolCallPreview> : {};
        const toolName = candidate.toolName;
        if (!['create_project', 'create_meeting', 'create_tasks', 'create_team'].includes(String(toolName))) return null;
        const args = candidate.args && typeof candidate.args === 'object' ? candidate.args : {};

        return {
          id: candidate.id || `tool-${index + 1}`,
          toolName: toolName as AgentToolName,
          label: String(candidate.label || toolName),
          summary: String(candidate.summary || candidate.label || toolName).slice(0, 240),
          args: args as AgentToolCallPreview['args'],
        };
      })
      .filter((tool): tool is AgentToolCallPreview => Boolean(tool))
      .slice(0, 8);

    if (preview.type !== 'TOOL_PLAN' || normalizedTools.length === 0) {
      throw new ValidationError('실행할 수 없는 AI 도구 계획입니다.');
    }

    return {
      type: 'TOOL_PLAN',
      prompt: String(preview.prompt || ''),
      brief: String(preview.brief || 'AI 에이전트 실행 계획입니다.').slice(0, 500),
      tools: normalizedTools,
      generatedAt: String(preview.generatedAt || new Date().toISOString()),
      sourceRunId: preview.sourceRunId,
    };
  }

  toAgentActionItem(action: AgentToolActionRow) {
    const preview = this.toToolPlanPreview(action.preview);

    return {
      id: action.id,
      assistantRunId: action.assistantRunId,
      actionType: 'TOOL_PLAN' as const,
      status: ['EXECUTED', 'REJECTED', 'FAILED'].includes(action.status) ? action.status : 'PENDING_APPROVAL',
      scope: {
        type: ['PROJECT', 'MEETING'].includes(action.scopeType) ? action.scopeType : 'GLOBAL',
        id: action.scopeId || undefined,
        label: action.scopeLabel || '전체',
      },
      preview,
      result: action.result ?? undefined,
      errorMessage: action.errorMessage,
      reviewedById: action.reviewedById,
      reviewedAt: action.reviewedAt?.toISOString() || null,
      executedAt: action.executedAt?.toISOString() || null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    };
  }

  private async ensureProjectWrite(projectId: string, member: AgentMemberContext) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { id: true, name: true, email: true, username: true, isActive: true } },
        members: {
          select: {
            memberId: true,
            member: { select: { id: true, name: true, email: true, username: true, isActive: true } },
          },
        },
      },
    });

    if (!project) throw new ValidationError('업무를 만들 프로젝트를 찾을 수 없습니다.');

    const canWrite = this.hasPermission(member, 'task', 'create')
      && (member.permissions?.system?.manage_settings || project.ownerId === member.id || project.members.some((item) => item.memberId === member.id));
    if (!canWrite) throw new ForbiddenError('선택한 프로젝트에 업무를 만들 권한이 없습니다.');

    return project;
  }

  private async executeCreateProject(tool: AgentToolCallPreview, member: AgentMemberContext) {
    if (!this.hasPermission(member, 'project', 'create')) {
      throw new ForbiddenError('프로젝트를 생성할 권한이 없습니다.');
    }

    const title = compactWhitespace(String(tool.args.title || ''));
    if (!title) throw new ValidationError('프로젝트 이름이 비어 있습니다.');

    return this.prisma.project.create({
      data: {
        name: title.slice(0, 120),
        description: tool.args.description ? String(tool.args.description).slice(0, 1000) : null,
        ownerId: member.id,
        members: {
          create: {
            memberId: member.id,
            role: 'OWNER',
          },
        },
      },
      select: { id: true, name: true },
    });
  }

  private async executeCreateTeam(tool: AgentToolCallPreview, member: AgentMemberContext) {
    const title = compactWhitespace(String(tool.args.title || ''));
    if (!title) throw new ValidationError('팀 이름이 비어 있습니다.');

    return this.prisma.team.create({
      data: {
        name: title.slice(0, 120),
        description: tool.args.description ? String(tool.args.description).slice(0, 1000) : null,
        color: tool.args.color ? String(tool.args.color).slice(0, 32) : '#06b6d4',
        leaderId: member.id,
        members: {
          create: {
            memberId: member.id,
            role: 'LEADER',
          },
        },
      },
      select: { id: true, name: true, color: true },
    });
  }

  private async executeCreateMeeting(tool: AgentToolCallPreview, member: AgentMemberContext, fallbackProjectId?: string | null) {
    const title = compactWhitespace(String(tool.args.title || ''));
    if (!title) throw new ValidationError('회의자료 제목이 비어 있습니다.');

    const meetingDate = tool.args.meetingDate ? new Date(String(tool.args.meetingDate)) : addDays(new Date(), 1);
    if (Number.isNaN(meetingDate.getTime())) {
      throw new ValidationError('회의 날짜 형식이 올바르지 않습니다.');
    }

    const projectId = tool.args.projectId || fallbackProjectId || null;
    if (projectId) {
      await this.ensureProjectWrite(projectId, member);
    }

    const agendas = Array.isArray(tool.args.agendas) ? tool.args.agendas : [];

    return this.prisma.meeting.create({
      data: {
        title: title.slice(0, 160),
        meetingDate,
        projectId: projectId || null,
        teamId: tool.args.teamId || null,
        content: tool.args.content ? String(tool.args.content).slice(0, 6000) : 'AI 에이전트가 생성한 회의자료 초안입니다.',
        contentType: 'text',
        summary: tool.args.description ? String(tool.args.description).slice(0, 1000) : undefined,
        authorId: member.id,
        status: 'DRAFT',
        agendas: agendas.length
          ? {
              create: agendas.slice(0, 10).map((agenda, index) => ({
                title: compactWhitespace(String(agenda.title || `안건 ${index + 1}`)).slice(0, 160),
                description: agenda.description ? String(agenda.description).slice(0, 1000) : null,
                order: index,
              })),
            }
          : undefined,
      },
      select: { id: true, title: true, projectId: true },
    });
  }

  private async executeCreateTasks(tool: AgentToolCallPreview, member: AgentMemberContext, fallbackProjectId?: string | null) {
    const projectId = tool.args.projectId || fallbackProjectId;
    if (!projectId) {
      throw new ValidationError('업무를 만들려면 프로젝트가 필요합니다. 먼저 프로젝트를 선택하거나 프로젝트 생성 도구와 함께 실행해주세요.');
    }

    const project = await this.ensureProjectWrite(projectId, member);
    const taskDrafts = Array.isArray(tool.args.tasks) ? tool.args.tasks : [];
    if (taskDrafts.length === 0) throw new ValidationError('생성할 업무가 없습니다.');

    const assigneeCandidates = [
      project.owner,
      ...project.members.map((item) => item.member),
    ]
      .filter((candidate) => candidate.isActive)
      .filter((candidate, index, items) => items.findIndex((item) => item.id === candidate.id) === index);
    const validMemberIdSet = new Set(assigneeCandidates.map((candidate) => candidate.id));

    return this.prisma.$transaction(async (tx) => {
      const lastTask = await tx.task.findFirst({
        where: { projectId, status: 'TODO' },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      let nextOrder = lastTask?.order || 0;
      const tasks = [];

      for (const draft of taskDrafts.slice(0, 8)) {
        const title = compactWhitespace(String(draft.title || ''));
        if (!title) continue;
        nextOrder += 1;
        const assigneeId = draft.assigneeId && validMemberIdSet.has(draft.assigneeId)
          ? draft.assigneeId
          : this.matchAssigneeId(draft.assigneeName, assigneeCandidates);

        const task = await tx.task.create({
          data: {
            projectId,
            title: title.slice(0, 160),
            description: draft.description ? String(draft.description).slice(0, 2000) : null,
            priority: this.normalizePriority(draft.priority),
            assigneeId: assigneeId || undefined,
            reporterId: member.id,
            dueDate: this.parseDueDate(draft.dueDate) ? new Date(`${this.parseDueDate(draft.dueDate)}T00:00:00.000Z`) : undefined,
            order: nextOrder,
          },
          select: { id: true, title: true, projectId: true },
        });

        await this.activityLogService.createWithTransaction(tx, {
          taskId: task.id,
          memberId: member.id,
          action: 'created',
          details: {
            title: task.title,
            source: 'ai_tool_plan',
          },
        });

        tasks.push(task);
      }

      if (tasks.length === 0) throw new ValidationError('생성할 수 있는 업무 제목이 없습니다.');

      return {
        project,
        tasks,
      };
    });
  }

  async executeToolPlan(action: AgentToolActionRow, member: AgentMemberContext) {
    const preview = this.toToolPlanPreview(action.preview);
    let currentProjectId: string | null = null;
    const createdProjects = [];
    const createdTeams = [];
    const createdMeetings = [];
    const createdTasks = [];

    for (const tool of preview.tools) {
      if (tool.toolName === 'create_project') {
        const project = await this.executeCreateProject(tool, member);
        currentProjectId = project.id;
        createdProjects.push(project);
      }

      if (tool.toolName === 'create_team') {
        const team = await this.executeCreateTeam(tool, member);
        createdTeams.push(team);
      }

      if (tool.toolName === 'create_meeting') {
        const meeting = await this.executeCreateMeeting(tool, member, currentProjectId);
        createdMeetings.push(meeting);
      }

      if (tool.toolName === 'create_tasks') {
        const result = await this.executeCreateTasks(tool, member, currentProjectId);
        currentProjectId = result.project.id;
        createdTasks.push(...result.tasks);
      }
    }

    return {
      createdCount: createdProjects.length + createdTeams.length + createdMeetings.length + createdTasks.length,
      projects: createdProjects,
      teams: createdTeams,
      meetings: createdMeetings,
      tasks: createdTasks,
    };
  }
}
