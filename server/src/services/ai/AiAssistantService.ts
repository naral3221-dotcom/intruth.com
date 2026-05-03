/**
 * AI Assistant Service
 * 읽기 전용 사역 운영 비서
 */
import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';
import { ActivityLogService } from '../ActivityLogService.js';
import { AgentToolPlanPreview, AgentToolRegistry } from './AgentToolRegistry.js';

interface MemberContext {
  id: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface AskAiAssistantInput {
  prompt: string;
  scope?: {
    type?: string;
    id?: string | number | null;
  };
}

type AiAssistantScopeType = 'GLOBAL' | 'PROJECT' | 'MEETING';
type AiAgentActionStatus = 'PENDING_APPROVAL' | 'EXECUTED' | 'REJECTED' | 'FAILED';
type AiAgentActionType = 'CREATE_TASKS' | 'TOOL_PLAN';
type AiTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface AiAssistantScope {
  type: AiAssistantScopeType;
  id?: string;
  label: string;
  projectId?: string;
  meetingId?: number;
}

interface AiAssistantUsageLog {
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cachedTokens?: number | null;
  reasoningTokens?: number | null;
  estimatedCostUsd?: number | null;
}

export interface AiAssistantResult {
  runId?: number;
  scope: {
    type: AiAssistantScopeType;
    id?: string;
    label: string;
  };
  answer: string;
  highlights: string[];
  suggestedQuestions: string[];
  kakaoBrief: string;
  sourceCounts: {
    tasks: number;
    meetings: number;
    projects: number;
  };
  generatedAt: string;
  mode: 'openai' | 'local';
  usage?: AiAssistantUsageLog;
}

export interface AiAssistantHistoryItem extends AiAssistantResult {
  id: number;
  prompt: string;
  status: 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
}

type AiCommandMessageRole = 'assistant' | 'user';

export interface AiCommandMessageInput {
  role: AiCommandMessageRole;
  content: string;
  route?: string | null;
  metadata?: unknown;
}

export interface AiCommandMessageItem {
  id: number;
  role: AiCommandMessageRole;
  content: string;
  route?: string | null;
  metadata?: unknown;
  createdAt: string;
}

interface AiAccountMemoryContext {
  summary: string;
  recentCommands: Array<{
    role: AiCommandMessageRole;
    content: string;
    route: string | null;
    createdAt: Date;
  }>;
  recentRuns: Array<{
    prompt: string;
    scopeLabel: string | null;
    createdAt: Date;
  }>;
}

export interface CreateAiTaskDraftActionInput extends AskAiAssistantInput {}

export interface AiTaskDraft {
  title: string;
  description: string | null;
  priority: AiTaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

export interface AiTaskDraftPreview {
  type: 'CREATE_TASKS';
  prompt: string;
  brief: string;
  projectId: string;
  projectName: string;
  tasks: AiTaskDraft[];
  sourceRunId?: number;
  generatedAt: string;
}

type AiAgentActionPreview = AiTaskDraftPreview | AgentToolPlanPreview;

export interface AiAgentActionItem {
  id: number;
  assistantRunId?: number | null;
  actionType: AiAgentActionType;
  status: AiAgentActionStatus;
  scope: {
    type: AiAssistantScopeType;
    id?: string;
    label: string;
  };
  preview: AiAgentActionPreview;
  result?: unknown;
  errorMessage?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  executedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiTaskDraftActionResult {
  assistant: AiAssistantResult;
  action: AiAgentActionItem;
}

export interface CreateAiToolPlanActionResult {
  assistant: AiAssistantResult;
  action: AiAgentActionItem;
}

const AI_ASSISTANT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'highlights', 'suggestedQuestions', 'kakaoBrief'],
  properties: {
    answer: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
    suggestedQuestions: { type: 'array', items: { type: 'string' } },
    kakaoBrief: { type: 'string' },
  },
} as const;

const AI_TASK_DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['brief', 'tasks'],
  properties: {
    brief: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'priority', 'dueDate', 'assigneeName'],
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD when explicitly clear, otherwise null' },
          assigneeName: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

const TASK_PRIORITIES = new Set<AiTaskPriority>(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export class AiAssistantService {
  private readonly taskInclude = {
    project: { select: { id: true, name: true } },
    assignee: { select: { id: true, name: true, avatarUrl: true } },
    reporter: { select: { id: true, name: true, avatarUrl: true } },
    labels: { include: { label: true } },
    _count: { select: { subtasks: true, comments: true } },
  };

  constructor(
    private prisma: PrismaClient,
    private activityLogService: ActivityLogService
  ) {
    this.toolRegistry = new AgentToolRegistry(prisma, activityLogService);
  }

  private readonly toolRegistry: AgentToolRegistry;

  private sanitizePrompt(prompt: string) {
    const normalized = prompt.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      throw new ValidationError('AI에게 물어볼 내용을 입력해주세요.');
    }

    if (normalized.length > 1000) {
      throw new ValidationError('AI 질문은 1000자 이내로 입력해주세요.');
    }

    return normalized;
  }

  private normalizeScopeInput(input?: AskAiAssistantInput['scope']) {
    const type = String(input?.type || 'GLOBAL').toUpperCase();
    const id = input?.id == null ? undefined : String(input.id);

    if (!['GLOBAL', 'PROJECT', 'MEETING'].includes(type)) {
      throw new ValidationError('AI 조회 범위가 올바르지 않습니다.');
    }

    return { type: type as AiAssistantScopeType, id };
  }

  private async resolveScope(member: MemberContext, input?: AskAiAssistantInput['scope']): Promise<AiAssistantScope> {
    const requested = this.normalizeScopeInput(input);
    const isAdmin = Boolean(member.permissions?.system?.manage_settings);

    if (requested.type === 'GLOBAL') {
      return { type: 'GLOBAL', label: '전체' };
    }

    if (!requested.id) {
      throw new ValidationError('AI 조회 범위 ID가 필요합니다.');
    }

    if (requested.type === 'PROJECT') {
      const project = await this.prisma.project.findUnique({
        where: { id: requested.id },
        select: {
          id: true,
          name: true,
          ownerId: true,
          members: { select: { memberId: true } },
        },
      });

      if (!project) {
        throw new ValidationError('선택한 프로젝트를 찾을 수 없습니다.');
      }

      const canRead = isAdmin || project.ownerId === member.id || project.members.some((item) => item.memberId === member.id);
      if (!canRead) {
        throw new ForbiddenError('선택한 프로젝트를 조회할 권한이 없습니다.');
      }

      return { type: 'PROJECT', id: project.id, label: project.name, projectId: project.id };
    }

    const meetingId = Number(requested.id);
    if (!Number.isInteger(meetingId) || meetingId <= 0) {
      throw new ValidationError('선택한 회의 범위가 올바르지 않습니다.');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        authorId: true,
        projectId: true,
        attendees: { select: { memberId: true } },
      },
    });

    if (!meeting) {
      throw new ValidationError('선택한 회의를 찾을 수 없습니다.');
    }

    const project = meeting.projectId
      ? await this.prisma.project.findUnique({
          where: { id: meeting.projectId },
          select: {
            ownerId: true,
            members: { select: { memberId: true } },
          },
        })
      : null;

    const canRead = isAdmin
      || meeting.authorId === member.id
      || meeting.attendees.some((item) => item.memberId === member.id)
      || project?.ownerId === member.id
      || Boolean(project?.members.some((item) => item.memberId === member.id));

    if (!canRead) {
      throw new ForbiddenError('선택한 회의를 조회할 권한이 없습니다.');
    }

    return {
      type: 'MEETING',
      id: String(meeting.id),
      label: meeting.title,
      projectId: meeting.projectId || undefined,
      meetingId: meeting.id,
    };
  }

  private async collectContext(member: MemberContext, scope: AiAssistantScope) {
    const now = new Date();
    const inThirtyDays = new Date(now);
    inThirtyDays.setDate(now.getDate() + 30);

    const taskWhere: Prisma.TaskWhereInput = scope.projectId
      ? { status: { not: 'DONE' }, projectId: scope.projectId }
      : {
          status: { not: 'DONE' },
          OR: [
            { assigneeId: member.id },
            { reporterId: member.id },
          ],
        };

    const meetingWhere: Prisma.MeetingWhereInput = scope.meetingId
      ? { id: scope.meetingId }
      : scope.projectId
        ? { projectId: scope.projectId }
        : {
            meetingDate: { gte: now, lte: inThirtyDays },
            OR: [
              { authorId: member.id },
              { attendees: { some: { memberId: member.id } } },
            ],
          };

    const projectWhere: Prisma.ProjectWhereInput = scope.projectId
      ? { id: scope.projectId }
      : {
          status: 'ACTIVE',
          OR: [
            { ownerId: member.id },
            { members: { some: { memberId: member.id } } },
          ],
        };

    const [memberRecord, tasks, meetings, projects] = await Promise.all([
      this.prisma.member.findUnique({
        where: { id: member.id },
        select: { id: true, name: true, department: true, position: true },
      }),
      this.prisma.task.findMany({
        where: taskWhere,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        take: 30,
      }),
      this.prisma.meeting.findMany({
        where: meetingWhere,
        select: {
          id: true,
          title: true,
          meetingDate: true,
          location: true,
          summary: true,
          projectId: true,
          actionItems: {
            select: {
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
            take: 10,
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { meetingDate: 'asc' },
        take: 15,
      }),
      this.prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          name: true,
          description: true,
          endDate: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
    ]);

    return { member: memberRecord, tasks, meetings, projects, scope };
  }

  private toContextText(context: Awaited<ReturnType<AiAssistantService['collectContext']>>) {
    const taskLines = context.tasks.map((task) => [
      `- ${task.title}`,
      `상태 ${task.status}`,
      `우선순위 ${task.priority}`,
      task.dueDate ? `마감 ${task.dueDate.toISOString().slice(0, 10)}` : '마감 없음',
      task.project?.name ? `프로젝트 ${task.project.name}` : null,
      task.assignee?.name ? `담당 ${task.assignee.name}` : null,
    ].filter(Boolean).join(' / '));

    const meetingLines = context.meetings.map((meeting) => {
      const actionItems = meeting.actionItems.length
        ? `할 일 ${meeting.actionItems.map((item) => `${item.title}(${item.status})`).join(', ')}`
        : null;

      return [
        `- ${meeting.title}`,
        meeting.meetingDate.toISOString().slice(0, 16),
        meeting.location ? `장소 ${meeting.location}` : null,
        meeting.summary ? `요약 ${meeting.summary}` : null,
        actionItems,
      ].filter(Boolean).join(' / ');
    });

    const projectLines = context.projects.map((project) => [
      `- ${project.name}`,
      `업무 ${project._count.tasks}개`,
      project.endDate ? `종료 ${project.endDate.toISOString().slice(0, 10)}` : null,
    ].filter(Boolean).join(' / '));

    return [
      `조회 범위: ${context.scope.label} (${context.scope.type})`,
      `사용자: ${context.member?.name || '알 수 없음'} (${context.member?.department || '부서 없음'} ${context.member?.position || ''})`,
      '미완료 업무:',
      taskLines.length ? taskLines.join('\n') : '- 없음',
      '다가오는 회의:',
      meetingLines.length ? meetingLines.join('\n') : '- 없음',
      '참여 프로젝트:',
      projectLines.length ? projectLines.join('\n') : '- 없음',
    ].join('\n\n').slice(0, 12000);
  }

  private hashForCache(value: string, length = 12) {
    return createHash('sha256').update(value).digest('hex').slice(0, length);
  }

  private toMemoryScopeKey(scope: AiAssistantScope) {
    return `${scope.type}:${scope.id || 'GLOBAL'}`;
  }

  private buildPromptCacheKey(member: MemberContext, workflow: string, scope: AiAssistantScope) {
    const memberHash = this.hashForCache(member.id);
    const scopeHash = this.hashForCache(this.toMemoryScopeKey(scope), 10);
    const workflowKey = workflow.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'assistant';
    return `intruth:${workflowKey}:m-${memberHash}:s-${scopeHash}`;
  }

  private responseCacheOptions(member: MemberContext, workflow: string, scope: AiAssistantScope, model: string) {
    const options: Record<string, string> = {
      prompt_cache_key: this.buildPromptCacheKey(member, workflow, scope),
    };
    const retention = process.env.OPENAI_PROMPT_CACHE_RETENTION;

    if (retention === 'in_memory' || retention === '24h') {
      options.prompt_cache_retention = retention;
    }

    if (process.env.OPENAI_DEBUG_PROMPT_CACHE === 'true') {
      console.info('[ai-cache]', {
        workflow,
        model,
        promptCacheKey: options.prompt_cache_key,
        promptCacheRetention: options.prompt_cache_retention || 'default',
      });
    }

    return options;
  }

  private staticReadOnlyInstructions() {
    return [
      'You are INTRUTH AI, a Korean church leadership operations assistant.',
      'Answer in Korean with a warm, concise ministry tone.',
      'Use only the account memory and INTRUTH context provided in this request.',
      'Do not claim that you created, modified, deleted, or shared data unless an approved server action actually did it.',
      'When a write action is needed, propose a reviewable next step that a human can approve.',
      'Prefer short mobile-friendly paragraphs and concrete check points.',
      'Keep KakaoTalk-ready summaries concise and practical.',
    ].join('\n');
  }

  private staticTaskDraftInstructions() {
    return [
      'You are INTRUTH AI, a Korean church leadership task-drafting agent.',
      'Create only draft tasks that a human can review and approve.',
      'Never say that real tasks were created by the model response itself.',
      'Use the provided project, candidate assignee, account memory, and INTRUTH context.',
      'Suggest at most five concrete tasks grounded in the user request.',
      'Use YYYY-MM-DD due dates only when the date is explicit or very clear.',
      'Use assignee names only from the candidate list; use null when uncertain.',
    ].join('\n');
  }

  private async collectAccountMemory(member: MemberContext, scope: AiAssistantScope): Promise<AiAccountMemoryContext> {
    const scopeKey = this.toMemoryScopeKey(scope);
    const [memory, recentCommands, recentRuns] = await Promise.all([
      this.prisma.aiAssistantMemory.findUnique({
        where: {
          memberId_scopeKey: {
            memberId: member.id,
            scopeKey,
          },
        },
        select: { summary: true },
      }),
      this.prisma.aiCommandMessage.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          role: true,
          content: true,
          route: true,
          createdAt: true,
        },
      }),
      this.prisma.aiAssistantRun.findMany({
        where: { memberId: member.id, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          prompt: true,
          scopeLabel: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      summary: memory?.summary || '',
      recentCommands: recentCommands
        .reverse()
        .map((message) => ({
          ...message,
          role: this.normalizeCommandRole(message.role),
          content: message.content.slice(0, 500),
        })),
      recentRuns: recentRuns.reverse(),
    };
  }

  private toAccountMemoryText(memory: AiAccountMemoryContext) {
    const sections: string[] = [];

    if (memory.summary.trim()) {
      sections.push(['Long-term account memory:', memory.summary.trim()].join('\n'));
    }

    if (memory.recentCommands.length) {
      sections.push([
        'Recent command chat:',
        ...memory.recentCommands.map((message) => {
          const role = message.role === 'user' ? 'User' : 'INTRUTH AI';
          const route = message.route ? ` @ ${message.route}` : '';
          return `- ${role}${route}: ${message.content.replace(/\s+/g, ' ').trim()}`;
        }),
      ].join('\n'));
    }

    if (memory.recentRuns.length) {
      sections.push([
        'Recent AI runs:',
        ...memory.recentRuns.map((run) => `- ${run.scopeLabel || 'GLOBAL'}: ${run.prompt.replace(/\s+/g, ' ').trim()}`),
      ].join('\n'));
    }

    return (sections.join('\n\n') || 'No saved account memory yet.').slice(0, 4500);
  }

  private compactMemorySummary(existing: string, entry: string) {
    return [...existing.split('\n'), entry]
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-14)
      .join('\n')
      .slice(0, 3500);
  }

  private async updateAccountMemory(member: MemberContext, scope: AiAssistantScope, prompt: string, result: AiAssistantResult, runId: number) {
    const scopeKey = this.toMemoryScopeKey(scope);
    const previous = await this.prisma.aiAssistantMemory.findUnique({
      where: {
        memberId_scopeKey: {
          memberId: member.id,
          scopeKey,
        },
      },
      select: { summary: true },
    });
    const entry = [
      `[${new Date().toISOString().slice(0, 10)}]`,
      `${scope.label} (${scope.type})`,
      `request="${prompt.replace(/\s+/g, ' ').trim().slice(0, 240)}"`,
      result.highlights.length ? `highlights="${result.highlights.slice(0, 3).join(' / ').slice(0, 300)}"` : null,
    ].filter(Boolean).join(' ');
    const summary = this.compactMemorySummary(previous?.summary || '', entry);

    await this.prisma.aiAssistantMemory.upsert({
      where: {
        memberId_scopeKey: {
          memberId: member.id,
          scopeKey,
        },
      },
      create: {
        memberId: member.id,
        scopeKey,
        scopeType: scope.type,
        scopeId: scope.id,
        summary,
        facts: {
          lastRunId: runId,
          lastScopeLabel: scope.label,
          sourceCounts: result.sourceCounts,
        },
      },
      update: {
        scopeType: scope.type,
        scopeId: scope.id,
        summary,
        facts: {
          lastRunId: runId,
          lastScopeLabel: scope.label,
          sourceCounts: result.sourceCounts,
        },
      },
    });
  }

  private normalizePriority(value: unknown): AiTaskPriority {
    const priority = String(value || 'MEDIUM').toUpperCase() as AiTaskPriority;
    return TASK_PRIORITIES.has(priority) ? priority : 'MEDIUM';
  }

  private parseDueDateString(value: unknown): string | null {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) return null;

    const parsed = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : raw;
  }

  private toDueDate(value: string | null): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizePersonName(value: unknown) {
    return String(value || '')
      .replace(/\s+/g, '')
      .replace(/님|목사|전도사|간사|리더|팀장/g, '')
      .toLowerCase();
  }

  private matchAssigneeId(
    assigneeName: string | null,
    candidates: Array<{ id: string; name: string; email: string; username: string | null }>
  ): string | null {
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

  private async findProjectForTaskWrite(member: MemberContext, projectId: string) {
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

    if (!project) {
      throw new ValidationError('업무를 만들 프로젝트를 찾을 수 없습니다.');
    }

    const isAdmin = Boolean(member.permissions?.system?.manage_settings);
    const isProjectMember = project.ownerId === member.id || project.members.some((item) => item.memberId === member.id);
    if (!isAdmin && !isProjectMember) {
      throw new ForbiddenError('선택한 프로젝트에서 업무를 만들 권한이 없습니다.');
    }

    const candidateMap = new Map<string, { id: string; name: string; email: string; username: string | null }>();
    if (project.owner.isActive) {
      candidateMap.set(project.owner.id, project.owner);
    }

    project.members.forEach((item) => {
      if (item.member.isActive) {
        candidateMap.set(item.member.id, item.member);
      }
    });

    return {
      id: project.id,
      name: project.name,
      assigneeCandidates: Array.from(candidateMap.values()),
    };
  }

  private normalizeTaskDrafts(
    value: unknown,
    candidates: Array<{ id: string; name: string; email: string; username: string | null }>
  ): { brief: string; tasks: AiTaskDraft[] } {
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const items = Array.isArray(data.tasks) ? data.tasks : [];
    const seenTitles = new Set<string>();
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const tasks = items
      .map((item) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const title = String(row.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!title) return null;

        const key = title.toLowerCase();
        if (seenTitles.has(key)) return null;
        seenTitles.add(key);

        const assigneeName = row.assigneeName ? String(row.assigneeName).trim() : null;
        const matchedAssigneeId = this.matchAssigneeId(assigneeName, candidates);
        const assignee = matchedAssigneeId ? candidateById.get(matchedAssigneeId) : null;

        return {
          title,
          description: row.description ? String(row.description).trim().slice(0, 800) : null,
          priority: this.normalizePriority(row.priority),
          dueDate: this.parseDueDateString(row.dueDate),
          assigneeId: matchedAssigneeId,
          assigneeName: assignee?.name || assigneeName,
        };
      })
      .filter((item): item is AiTaskDraft => Boolean(item))
      .slice(0, 5);

    return {
      brief: String(data.brief || 'AI가 승인 가능한 업무 초안을 만들었습니다.').trim().slice(0, 300),
      tasks,
    };
  }

  private buildLocalTaskDrafts(prompt: string): { brief: string; tasks: AiTaskDraft[] } {
    const parts = prompt
      .split(/\n|,|;|그리고|및/g)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 5);
    const sourceItems = parts.length ? parts : [prompt];
    const urgentPattern = /급|긴급|오늘|마감|바로|빨리/;

    return {
      brief: 'OpenAI 키 없이 로컬 규칙으로 만든 업무 초안입니다.',
      tasks: sourceItems.map((item) => ({
        title: item.length > 80 ? `${item.slice(0, 77)}...` : item,
        description: `AI 요청에서 생성된 업무 초안입니다.\n요청: ${prompt}`,
        priority: urgentPattern.test(item) ? 'HIGH' : 'MEDIUM',
        dueDate: this.parseDueDateString(item),
        assigneeId: null,
        assigneeName: null,
      })),
    };
  }

  private buildTaskDraftAssistantResult(input: {
    prompt: string;
    scope: AiAssistantScope;
    context: Awaited<ReturnType<AiAssistantService['collectContext']>>;
    brief: string;
    tasks: AiTaskDraft[];
    mode: 'openai' | 'local';
  }): AiAssistantResult {
    const highlights = input.tasks.slice(0, 4).map((task) => {
      const due = task.dueDate ? ` / 마감 ${task.dueDate}` : '';
      const assignee = task.assigneeName ? ` / 담당 ${task.assigneeName}` : '';
      return `${task.title} (${task.priority}${due}${assignee})`;
    });

    return {
      scope: {
        type: input.scope.type,
        id: input.scope.id,
        label: input.scope.label,
      },
      answer: [
        input.brief,
        '',
        `${input.tasks.length}개 업무 초안을 만들었습니다. 모바일 승인 카드에서 확인 후 실행할 수 있습니다.`,
      ].join('\n'),
      highlights,
      suggestedQuestions: [
        '이 초안을 업무로 생성해줘',
        '담당자를 더 명확히 나눠줘',
        '마감일 중심으로 다시 정리해줘',
      ],
      kakaoBrief: `[INTRUTH AI 업무 초안]\n${highlights.map((item) => `- ${item}`).join('\n')}`,
      sourceCounts: {
        tasks: input.context.tasks.length,
        meetings: input.context.meetings.length,
        projects: input.context.projects.length,
      },
      generatedAt: new Date().toISOString(),
      mode: input.mode,
    };
  }

  private toTaskDraftPreview(value: unknown): AiTaskDraftPreview {
    const preview = value && typeof value === 'object' ? value as Partial<AiTaskDraftPreview> : {};
    const tasks = Array.isArray(preview.tasks) ? preview.tasks : [];

    if (preview.type !== 'CREATE_TASKS' || !preview.projectId || tasks.length === 0) {
      throw new ValidationError('실행할 수 없는 AI 업무 초안입니다.');
    }

    const normalizedTasks = tasks
      .map((task) => ({
        title: String(task?.title || '').trim(),
        description: task?.description ? String(task.description) : null,
        priority: this.normalizePriority(task?.priority),
        dueDate: this.parseDueDateString(task?.dueDate),
        assigneeId: task?.assigneeId ? String(task.assigneeId) : null,
        assigneeName: task?.assigneeName ? String(task.assigneeName) : null,
      }))
      .filter((task) => task.title.length > 0)
      .slice(0, 5);

    if (normalizedTasks.length === 0) {
      throw new ValidationError('실행할 수 있는 업무 초안이 없습니다.');
    }

    return {
      type: 'CREATE_TASKS',
      prompt: String(preview.prompt || ''),
      brief: String(preview.brief || ''),
      projectId: String(preview.projectId),
      projectName: String(preview.projectName || '프로젝트'),
      sourceRunId: preview.sourceRunId,
      generatedAt: String(preview.generatedAt || new Date().toISOString()),
      tasks: normalizedTasks,
    };
  }

  private toAgentActionItem(action: {
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
  }): AiAgentActionItem {
    if (action.actionType === 'TOOL_PLAN') {
      return this.toolRegistry.toAgentActionItem(action) as AiAgentActionItem;
    }

    return {
      id: action.id,
      assistantRunId: action.assistantRunId,
      actionType: 'CREATE_TASKS',
      status: ['EXECUTED', 'REJECTED', 'FAILED'].includes(action.status)
        ? action.status as AiAgentActionStatus
        : 'PENDING_APPROVAL',
      scope: {
        type: ['PROJECT', 'MEETING'].includes(action.scopeType) ? action.scopeType as AiAssistantScopeType : 'GLOBAL',
        id: action.scopeId || undefined,
        label: action.scopeLabel || '전체',
      },
      preview: this.toTaskDraftPreview(action.preview),
      result: action.result ?? undefined,
      errorMessage: action.errorMessage,
      reviewedById: action.reviewedById,
      reviewedAt: action.reviewedAt?.toISOString() || null,
      executedAt: action.executedAt?.toISOString() || null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    };
  }

  private buildLocalAnswer(prompt: string, context: Awaited<ReturnType<AiAssistantService['collectContext']>>): AiAssistantResult {
    const overdueTasks = context.tasks.filter((task) => task.dueDate && task.dueDate < new Date());
    const urgentTasks = context.tasks.filter((task) => task.priority === 'URGENT' || task.priority === 'HIGH').slice(0, 3);
    const nextMeeting = context.meetings[0];
    const highlights = [
      overdueTasks.length ? `지연 업무 ${overdueTasks.length}개를 먼저 확인하세요.` : '지연 업무는 없습니다.',
      urgentTasks.length ? `높은 우선순위 업무: ${urgentTasks.map((task) => task.title).join(', ')}` : '높은 우선순위 업무가 많지 않습니다.',
      nextMeeting ? `다음 회의: ${nextMeeting.title}` : '다가오는 회의가 없습니다.',
    ];
    const answer = [
      `질문: ${prompt}`,
      '',
      highlights.join('\n'),
      '',
      '지금은 읽기 전용 모드라 실제 업무 생성/수정은 하지 않습니다.',
    ].join('\n');

    return {
      answer,
      scope: {
        type: context.scope.type,
        id: context.scope.id,
        label: context.scope.label,
      },
      highlights,
      suggestedQuestions: [
        '이번 주 지연 위험 업무를 정리해줘',
        '다음 회의 전에 확인할 것을 알려줘',
        '프로젝트별로 막힌 부분을 요약해줘',
      ],
      kakaoBrief: `[INTRUTH AI 브리핑]\n${highlights.join('\n')}`,
      sourceCounts: {
        tasks: context.tasks.length,
        meetings: context.meetings.length,
        projects: context.projects.length,
      },
      generatedAt: new Date().toISOString(),
      mode: 'local',
    };
  }

  private sourceCountsFromJson(value: unknown) {
    const counts = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      tasks: Number(counts.tasks || 0),
      meetings: Number(counts.meetings || 0),
      projects: Number(counts.projects || 0),
    };
  }

  private toHistoryItem(run: {
    id: number;
    prompt: string;
    answer: string;
    highlights: unknown;
    suggestedQuestions: unknown;
    kakaoBrief: string;
    sourceCounts: unknown;
    mode: string;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
  }): AiAssistantHistoryItem {
    return {
      id: run.id,
      runId: run.id,
      scope: {
        type: ['PROJECT', 'MEETING'].includes((run as any).scopeType) ? (run as any).scopeType : 'GLOBAL',
        id: (run as any).scopeId || undefined,
        label: (run as any).scopeLabel || '전체',
      },
      prompt: run.prompt,
      answer: run.answer,
      highlights: Array.isArray(run.highlights) ? run.highlights.map(String).filter(Boolean) : [],
      suggestedQuestions: Array.isArray(run.suggestedQuestions)
        ? run.suggestedQuestions.map(String).filter(Boolean)
        : [],
      kakaoBrief: run.kakaoBrief,
      sourceCounts: this.sourceCountsFromJson(run.sourceCounts),
      generatedAt: run.createdAt.toISOString(),
      mode: run.mode === 'openai' ? 'openai' : 'local',
      status: run.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      usage: {
        model: (run as any).model,
        inputTokens: (run as any).inputTokens,
        outputTokens: (run as any).outputTokens,
        totalTokens: (run as any).totalTokens,
        cachedTokens: (run as any).cachedTokens,
        reasoningTokens: (run as any).reasoningTokens,
        estimatedCostUsd: (run as any).estimatedCostUsd,
      },
    };
  }

  private normalizeCommandRole(role: unknown): AiCommandMessageRole {
    return role === 'user' ? 'user' : 'assistant';
  }

  private normalizeCommandContent(content: unknown) {
    const normalized = String(content || '').replace(/\s+$/g, '').trimStart();
    if (!normalized.trim()) {
      throw new ValidationError('저장할 AI 명령 로그 내용이 없습니다.');
    }

    return normalized.slice(0, 6000);
  }

  private toCommandMessageItem(message: {
    id: number;
    role: string;
    content: string;
    route: string | null;
    metadata: unknown;
    createdAt: Date;
  }): AiCommandMessageItem {
    return {
      id: message.id,
      role: this.normalizeCommandRole(message.role),
      content: message.content,
      route: message.route,
      metadata: message.metadata ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private estimateCostUsd(usage: AiAssistantUsageLog) {
    const inputRate = Number(process.env.OPENAI_ASSISTANT_INPUT_COST_PER_1M || 0);
    const cachedInputRate = Number(process.env.OPENAI_ASSISTANT_CACHED_INPUT_COST_PER_1M || 0);
    const outputRate = Number(process.env.OPENAI_ASSISTANT_OUTPUT_COST_PER_1M || 0);
    const inputTokens = Number(usage.inputTokens || 0);
    const cachedTokens = Math.min(Number(usage.cachedTokens || 0), inputTokens);
    const uncachedInputTokens = Math.max(inputTokens - cachedTokens, 0);
    const outputTokens = Number(usage.outputTokens || 0);

    if (!inputRate && !cachedInputRate && !outputRate) return null;

    const inputCost = cachedInputRate
      ? ((uncachedInputTokens / 1_000_000) * inputRate) + ((cachedTokens / 1_000_000) * cachedInputRate)
      : (inputTokens / 1_000_000) * inputRate;
    const outputCost = (outputTokens / 1_000_000) * outputRate;

    return Number((inputCost + outputCost).toFixed(6));
  }

  private extractUsage(response: { model?: string | null; usage?: any }, model: string): AiAssistantUsageLog {
    const usage = response.usage;
    const result: AiAssistantUsageLog = {
      model: response.model || model,
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      cachedTokens: usage?.input_tokens_details?.cached_tokens ?? usage?.prompt_tokens_details?.cached_tokens ?? null,
      reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? null,
    };

    return {
      ...result,
      estimatedCostUsd: this.estimateCostUsd(result),
    };
  }

  private async recordRun(member: MemberContext, prompt: string, scope: AiAssistantScope, result: AiAssistantResult, usage: AiAssistantUsageLog = {}) {
    const run = await this.prisma.aiAssistantRun.create({
      data: {
        memberId: member.id,
        prompt,
        scopeType: scope.type,
        scopeId: scope.id,
        scopeLabel: scope.label,
        answer: result.answer,
        highlights: result.highlights,
        suggestedQuestions: result.suggestedQuestions,
        kakaoBrief: result.kakaoBrief,
        sourceCounts: result.sourceCounts,
        mode: result.mode,
        model: usage.model,
        inputTokens: usage.inputTokens ?? undefined,
        outputTokens: usage.outputTokens ?? undefined,
        totalTokens: usage.totalTokens ?? undefined,
        cachedTokens: usage.cachedTokens ?? undefined,
        reasoningTokens: usage.reasoningTokens ?? undefined,
        estimatedCostUsd: usage.estimatedCostUsd ?? undefined,
        status: 'COMPLETED',
      },
    });

    await this.updateAccountMemory(member, scope, prompt, result, run.id).catch(() => null);

    return {
      ...result,
      runId: run.id,
      generatedAt: run.createdAt.toISOString(),
      usage,
    };
  }

  private async recordFailure(member: MemberContext, prompt: string, scope: AiAssistantScope, error: unknown, sourceCounts: AiAssistantResult['sourceCounts'], usage: AiAssistantUsageLog = {}) {
    await this.prisma.aiAssistantRun.create({
      data: {
        memberId: member.id,
        prompt,
        scopeType: scope.type,
        scopeId: scope.id,
        scopeLabel: scope.label,
        answer: '',
        highlights: [],
        suggestedQuestions: [],
        kakaoBrief: '',
        sourceCounts,
        mode: process.env.OPENAI_API_KEY ? 'openai' : 'local',
        model: usage.model,
        inputTokens: usage.inputTokens ?? undefined,
        outputTokens: usage.outputTokens ?? undefined,
        totalTokens: usage.totalTokens ?? undefined,
        cachedTokens: usage.cachedTokens ?? undefined,
        reasoningTokens: usage.reasoningTokens ?? undefined,
        estimatedCostUsd: usage.estimatedCostUsd ?? undefined,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'AI Assistant 요청 처리에 실패했습니다.',
      },
    });
  }

  async listRecentRuns(member: MemberContext, limit = 8): Promise<AiAssistantHistoryItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
    const runs = await this.prisma.aiAssistantRun.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return runs.map((run) => this.toHistoryItem(run));
  }

  async listCommandMessages(member: MemberContext, limit = 30): Promise<AiCommandMessageItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const messages = await this.prisma.aiCommandMessage.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return messages.reverse().map((message) => this.toCommandMessageItem(message));
  }

  async recordCommandMessage(member: MemberContext, input: AiCommandMessageInput): Promise<AiCommandMessageItem> {
    const message = await this.prisma.aiCommandMessage.create({
      data: {
        memberId: member.id,
        role: this.normalizeCommandRole(input.role),
        content: this.normalizeCommandContent(input.content),
        route: input.route ? String(input.route).slice(0, 240) : undefined,
        metadata: input.metadata == null ? undefined : input.metadata as Prisma.InputJsonValue,
      },
    });

    return this.toCommandMessageItem(message);
  }

  async clearCommandMessages(member: MemberContext) {
    const result = await this.prisma.aiCommandMessage.deleteMany({
      where: { memberId: member.id },
    });

    return { deletedCount: result.count };
  }

  async listAgentActions(member: MemberContext, limit = 8): Promise<AiAgentActionItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
    const actions = await this.prisma.aiAgentAction.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return actions.map((action) => this.toAgentActionItem(action));
  }

  async createTaskDraftAction(
    member: MemberContext,
    input: CreateAiTaskDraftActionInput
  ): Promise<CreateAiTaskDraftActionResult> {
    const prompt = this.sanitizePrompt(input.prompt);
    const scope = await this.resolveScope(member, input.scope);

    if (!scope.projectId) {
      throw new ValidationError('업무 초안은 프로젝트 또는 프로젝트가 연결된 회의 범위를 선택해야 합니다.');
    }

    const [context, project, accountMemory] = await Promise.all([
      this.collectContext(member, scope),
      this.findProjectForTaskWrite(member, scope.projectId),
      this.collectAccountMemory(member, scope),
    ]);
    const sourceCounts = {
      tasks: context.tasks.length,
      meetings: context.meetings.length,
      projects: context.projects.length,
    };

    let mode: 'openai' | 'local' = 'local';
    let usage: AiAssistantUsageLog = { model: 'local' };
    let draftResult: { brief: string; tasks: AiTaskDraft[] };
    const runPrompt = `업무 초안: ${prompt}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      draftResult = this.buildLocalTaskDrafts(prompt);
    } else {
      try {
        mode = 'openai';
        const openai = new OpenAI({ apiKey });
        const model = process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_MEETING_MODEL || 'gpt-4o-mini';
        const candidateLines = project.assigneeCandidates
          .map((candidate) => `- ${candidate.name} (${candidate.email})`)
          .join('\n') || '- 지정 가능한 담당자 없음';

        const response = await openai.responses.create({
          model,
          ...this.responseCacheOptions(member, 'task-draft', scope, model),
          input: [
            {
              role: 'system',
              content: this.staticTaskDraftInstructions(),
            },
            {
              role: 'user',
              content: [
                `사용자 요청: ${prompt}`,
                `대상 프로젝트: ${project.name}`,
                `조회 범위: ${scope.label} (${scope.type})`,
                '',
                '담당자 후보:',
                candidateLines,
                '',
                'Saved account memory:',
                this.toAccountMemoryText(accountMemory),
                '',
                '현재 INTRUTH 컨텍스트:',
                this.toContextText(context),
              ].join('\n'),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'intruth_task_drafts',
              strict: true,
              schema: AI_TASK_DRAFT_SCHEMA,
            },
          },
        });

        usage = this.extractUsage(response, model);
        draftResult = this.normalizeTaskDrafts(JSON.parse(response.output_text || '{}'), project.assigneeCandidates);
      } catch (error) {
        await this.recordFailure(member, runPrompt, scope, error, sourceCounts);
        throw error;
      }
    }

    if (draftResult.tasks.length === 0) {
      throw new ValidationError('AI가 생성할 업무 초안을 찾지 못했습니다. 요청을 조금 더 구체적으로 적어주세요.');
    }

    const assistant = await this.recordRun(
      member,
      runPrompt,
      scope,
      this.buildTaskDraftAssistantResult({
        prompt,
        scope,
        context,
        brief: draftResult.brief,
        tasks: draftResult.tasks,
        mode,
      }),
      usage
    );

    const preview: AiTaskDraftPreview = {
      type: 'CREATE_TASKS',
      prompt,
      brief: draftResult.brief,
      projectId: project.id,
      projectName: project.name,
      tasks: draftResult.tasks,
      sourceRunId: assistant.runId,
      generatedAt: assistant.generatedAt,
    };

    const action = await this.prisma.aiAgentAction.create({
      data: {
        assistantRunId: assistant.runId,
        memberId: member.id,
        actionType: 'CREATE_TASKS',
        status: 'PENDING_APPROVAL',
        scopeType: scope.type,
        scopeId: scope.id,
        scopeLabel: scope.label,
        preview: preview as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      assistant,
      action: this.toAgentActionItem(action),
    };
  }

  async createToolPlanAction(
    member: MemberContext,
    input: AskAiAssistantInput
  ): Promise<CreateAiToolPlanActionResult> {
    const prompt = this.sanitizePrompt(input.prompt);
    const scope = await this.resolveScope(member, input.scope);
    const context = await this.collectContext(member, scope);
    const sourceCounts = {
      tasks: context.tasks.length,
      meetings: context.meetings.length,
      projects: context.projects.length,
    };
    const preview = this.toolRegistry.buildLocalPlan(prompt, scope);
    const highlights = preview.tools.map((tool) => `${tool.label}: ${tool.summary}`);
    const result: AiAssistantResult = {
      scope: {
        type: scope.type,
        id: scope.id,
        label: scope.label,
      },
      answer: [
        preview.brief,
        '',
        ...highlights.map((item) => `- ${item}`),
        '',
        '승인하면 INTRUTH 서버 도구가 권한을 확인한 뒤 실제 데이터로 생성합니다.',
      ].join('\n'),
      highlights,
      suggestedQuestions: [
        '승인 대기 보여줘',
        '업무 보드로 이동',
        '회의자료로 이동',
      ],
      kakaoBrief: `[INTRUTH AI 실행 계획]\n${highlights.map((item) => `- ${item}`).join('\n')}`,
      sourceCounts,
      generatedAt: new Date().toISOString(),
      mode: 'local',
      usage: { model: 'local-tool-registry' },
    };
    const assistant = await this.recordRun(member, `도구 실행 계획: ${prompt}`, scope, result, { model: 'local-tool-registry' });
    const storedPreview: AgentToolPlanPreview = {
      ...preview,
      sourceRunId: assistant.runId,
      generatedAt: assistant.generatedAt,
    };

    const action = await this.prisma.aiAgentAction.create({
      data: {
        assistantRunId: assistant.runId,
        memberId: member.id,
        actionType: 'TOOL_PLAN',
        status: 'PENDING_APPROVAL',
        scopeType: scope.type,
        scopeId: scope.id,
        scopeLabel: scope.label,
        preview: storedPreview as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      assistant,
      action: this.toAgentActionItem(action),
    };
  }

  private async findActionForMember(actionId: number, member: MemberContext) {
    if (!Number.isInteger(actionId) || actionId <= 0) {
      throw new ValidationError('AI 액션 ID가 올바르지 않습니다.');
    }

    const action = await this.prisma.aiAgentAction.findUnique({ where: { id: actionId } });
    if (!action) {
      throw new ValidationError('AI 액션을 찾을 수 없습니다.');
    }

    const isAdmin = Boolean(member.permissions?.system?.manage_settings);
    if (!isAdmin && action.memberId !== member.id) {
      throw new ForbiddenError('이 AI 액션을 처리할 권한이 없습니다.');
    }

    return action;
  }

  async approveAgentAction(actionId: number, member: MemberContext) {
    const action = await this.findActionForMember(actionId, member);
    if (action.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('이미 처리된 AI 액션입니다.');
    }

    if (action.actionType === 'TOOL_PLAN') {
      const currentAction = await this.prisma.aiAgentAction.findUnique({ where: { id: action.id } });
      if (!currentAction || currentAction.status !== 'PENDING_APPROVAL') {
        throw new ValidationError('이미 처리된 AI 액션입니다.');
      }

      try {
        const result = await this.toolRegistry.executeToolPlan(action, member);
        const updatedAction = await this.prisma.aiAgentAction.update({
          where: { id: action.id },
          data: {
            status: 'EXECUTED',
            reviewedById: member.id,
            reviewedAt: new Date(),
            executedAt: new Date(),
            result: result as Prisma.InputJsonValue,
          },
        });

        return {
          action: this.toAgentActionItem(updatedAction),
          tasks: (result.tasks || []) as unknown[],
          createdCount: result.createdCount,
          result,
        };
      } catch (error) {
        await this.prisma.aiAgentAction.update({
          where: { id: action.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'AI 도구 실행에 실패했습니다.',
          },
        }).catch(() => null);
        throw error;
      }
    }

    const preview = this.toTaskDraftPreview(action.preview);
    const project = await this.findProjectForTaskWrite(member, preview.projectId);
    const validAssigneeIds = new Set(project.assigneeCandidates.map((candidate) => candidate.id));
    const invalidAssignee = preview.tasks.find((task) => task.assigneeId && !validAssigneeIds.has(task.assigneeId));
    if (invalidAssignee) {
      throw new ValidationError('담당자로 지정할 수 없는 멤버가 업무 초안에 포함되어 있습니다.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentAction = await tx.aiAgentAction.findUnique({ where: { id: action.id } });
        if (!currentAction || currentAction.status !== 'PENDING_APPROVAL') {
          throw new ValidationError('이미 처리된 AI 액션입니다.');
        }

        const lastTask = await tx.task.findFirst({
          where: { projectId: preview.projectId, status: 'TODO' },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        let nextOrder = lastTask?.order || 0;
        const tasks = [];

        for (const draft of preview.tasks) {
          nextOrder += 1;
          const task = await tx.task.create({
            data: {
              projectId: preview.projectId,
              title: draft.title,
              description: draft.description,
              priority: draft.priority,
              assigneeId: draft.assigneeId || undefined,
              reporterId: member.id,
              dueDate: this.toDueDate(draft.dueDate),
              order: nextOrder,
            },
            include: this.taskInclude,
          });

          await this.activityLogService.createWithTransaction(tx, {
            taskId: task.id,
            memberId: member.id,
            action: 'created',
            details: {
              title: task.title,
              source: 'ai_agent_action',
              aiAgentActionId: action.id,
            },
          });

          tasks.push(task);
        }

        const result = {
          createdCount: tasks.length,
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            projectId: task.projectId,
          })),
        };

        const updatedAction = await tx.aiAgentAction.update({
          where: { id: action.id },
          data: {
            status: 'EXECUTED',
            reviewedById: member.id,
            reviewedAt: new Date(),
            executedAt: new Date(),
            result: result as Prisma.InputJsonValue,
          },
        });

        return {
          action: this.toAgentActionItem(updatedAction),
          tasks,
          createdCount: tasks.length,
        };
      });
    } catch (error) {
      await this.prisma.aiAgentAction.update({
        where: { id: action.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'AI 액션 실행에 실패했습니다.',
        },
      }).catch(() => null);
      throw error;
    }
  }

  async rejectAgentAction(actionId: number, member: MemberContext) {
    const action = await this.findActionForMember(actionId, member);
    if (action.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('이미 처리된 AI 액션입니다.');
    }

    const updatedAction = await this.prisma.aiAgentAction.update({
      where: { id: action.id },
      data: {
        status: 'REJECTED',
        reviewedById: member.id,
        reviewedAt: new Date(),
      },
    });

    return this.toAgentActionItem(updatedAction);
  }

  async ask(member: MemberContext, input: AskAiAssistantInput): Promise<AiAssistantResult> {
    const prompt = this.sanitizePrompt(input.prompt);
    const scope = await this.resolveScope(member, input.scope);
    const [context, accountMemory] = await Promise.all([
      this.collectContext(member, scope),
      this.collectAccountMemory(member, scope),
    ]);
    const sourceCounts = {
      tasks: context.tasks.length,
      meetings: context.meetings.length,
      projects: context.projects.length,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.recordRun(member, prompt, scope, this.buildLocalAnswer(prompt, context), { model: 'local' });
    }

    try {
      const openai = new OpenAI({ apiKey });
      const model = process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_MEETING_MODEL || 'gpt-4o-mini';
      const response = await openai.responses.create({
        model,
        ...this.responseCacheOptions(member, 'readonly-assistant', scope, model),
        input: [
          {
            role: 'system',
            content: this.staticReadOnlyInstructions(),
          },
          {
            role: 'user',
            content: [
              `사용자 질문: ${prompt}`,
              `조회 범위: ${scope.label} (${scope.type})`,
              '',
              'Saved account memory:',
              this.toAccountMemoryText(accountMemory),
              '',
              '현재 INTRUTH 컨텍스트:',
              this.toContextText(context),
            ].join('\n'),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'intruth_readonly_assistant',
            strict: true,
            schema: AI_ASSISTANT_SCHEMA,
          },
        },
      });

      const parsed = JSON.parse(response.output_text || '{}') as Partial<AiAssistantResult>;
      const usage = this.extractUsage(response, model);
      return this.recordRun(member, prompt, scope, {
        scope: {
          type: scope.type,
          id: scope.id,
          label: scope.label,
        },
        answer: String(parsed.answer || '').trim(),
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String).filter(Boolean).slice(0, 5) : [],
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.map(String).filter(Boolean).slice(0, 4)
          : [],
        kakaoBrief: String(parsed.kakaoBrief || parsed.answer || '').trim(),
        sourceCounts,
        generatedAt: new Date().toISOString(),
        mode: 'openai',
      }, usage);
    } catch (error) {
      await this.recordFailure(member, prompt, scope, error, sourceCounts);
      throw error;
    }
  }
}
