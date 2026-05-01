/**
 * AI Assistant Service
 * 읽기 전용 사역 운영 비서
 */
import OpenAI from 'openai';
import { Prisma, PrismaClient } from '@prisma/client';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';

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

export class AiAssistantService {
  constructor(private prisma: PrismaClient) {}

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

  private estimateCostUsd(usage: AiAssistantUsageLog) {
    const inputRate = Number(process.env.OPENAI_ASSISTANT_INPUT_COST_PER_1M || 0);
    const outputRate = Number(process.env.OPENAI_ASSISTANT_OUTPUT_COST_PER_1M || 0);
    const inputTokens = Number(usage.inputTokens || 0);
    const outputTokens = Number(usage.outputTokens || 0);

    if (!inputRate && !outputRate) return null;

    return Number((((inputTokens / 1_000_000) * inputRate) + ((outputTokens / 1_000_000) * outputRate)).toFixed(6));
  }

  private extractUsage(response: { model?: string | null; usage?: any }, model: string): AiAssistantUsageLog {
    const usage = response.usage;
    const result: AiAssistantUsageLog = {
      model: response.model || model,
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      cachedTokens: usage?.input_tokens_details?.cached_tokens ?? null,
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

  async ask(member: MemberContext, input: AskAiAssistantInput): Promise<AiAssistantResult> {
    const prompt = this.sanitizePrompt(input.prompt);
    const scope = await this.resolveScope(member, input.scope);
    const context = await this.collectContext(member, scope);
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
        input: [
          {
            role: 'system',
            content: [
              '너는 INTRUTH 교회 리더십 운영 도구의 읽기 전용 AI 비서다.',
              '제공된 업무/회의/프로젝트 컨텍스트만 근거로 한국어로 답한다.',
              '업무 생성, 수정, 삭제, 일정 변경을 실제로 수행했다고 말하지 않는다.',
              '필요하면 다음 승인 단계에서 사람이 실행할 수 있는 제안만 한다.',
              '모바일에서 읽기 좋게 짧은 문단과 구체적인 체크 포인트를 사용한다.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `사용자 질문: ${prompt}`,
              `조회 범위: ${scope.label} (${scope.type})`,
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
