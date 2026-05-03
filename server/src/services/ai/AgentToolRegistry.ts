import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from '../ActivityLogService.js';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';

export type AgentToolName =
  | 'create_project'
  | 'create_meeting'
  | 'create_tasks'
  | 'create_team'
  | 'create_routine'
  | 'update_project'
  | 'update_meeting'
  | 'update_task'
  | 'update_routine'
  | 'prepare_kakao_share'
  | 'prepare_meeting_pdf';

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

export interface AgentDiffItem {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

export interface AgentShareIntent {
  id: string;
  type: 'kakao_text' | 'meeting_pdf';
  title: string;
  text: string;
  path: string;
  buttonTitle?: string | null;
  entityType?: 'project' | 'task' | 'meeting' | 'routine' | 'generic';
  entityId?: string | null;
  meetingId?: number | null;
}

export interface AgentToolCallPreview {
  id: string;
  toolName: AgentToolName;
  label: string;
  summary: string;
  args: {
    targetId?: string | null;
    taskId?: string | null;
    meetingId?: number | string | null;
    routineId?: string | null;
    title?: string;
    description?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    teamId?: string | null;
    teamName?: string | null;
    meetingDate?: string | null;
    content?: string | null;
    color?: string | null;
    status?: string | null;
    dueDate?: string | null;
    targetType?: string | null;
    buttonTitle?: string | null;
    path?: string | null;
    priority?: string | null;
    repeatType?: string | null;
    repeatDays?: number[];
    estimatedMinutes?: number | null;
    isActive?: boolean | null;
    assigneeName?: string | null;
    tasks?: AgentTaskDraft[];
    agendas?: AgentAgendaDraft[];
    diffs?: AgentDiffItem[];
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
const TASK_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']);
const PROJECT_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ON_HOLD']);
const MEETING_STATUSES = new Set(['DRAFT', 'PUBLISHED']);
const AGENT_TOOL_NAMES = new Set<AgentToolName>([
  'create_project',
  'create_meeting',
  'create_tasks',
  'create_team',
  'create_routine',
  'update_project',
  'update_meeting',
  'update_task',
  'update_routine',
  'prepare_kakao_share',
  'prepare_meeting_pdf',
]);
const WEEKDAY_OFFSETS: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

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
      {
        name: 'create_routine',
        description: '반복 업무 루틴을 생성합니다. 요일, 프로젝트, 담당자 이름, 예상 시간을 함께 지정할 수 있습니다.',
        approvalRequired: true,
      },
      {
        name: 'update_project',
        description: '기존 프로젝트의 이름, 설명, 상태를 수정합니다. targetId 또는 projectId가 필요하며 서버가 변경 전/후 diff를 계산합니다.',
        approvalRequired: true,
      },
      {
        name: 'update_meeting',
        description: '기존 회의자료의 제목, 날짜, 팀/프로젝트, 본문, 요약, 상태를 수정합니다. targetId 또는 meetingId가 필요합니다.',
        approvalRequired: true,
      },
      {
        name: 'update_task',
        description: '기존 업무의 제목, 설명, 상태, 우선순위, 마감일, 담당자를 수정합니다. targetId 또는 taskId가 필요합니다.',
        approvalRequired: true,
      },
      {
        name: 'update_routine',
        description: '기존 반복 업무 루틴의 제목, 설명, 반복 요일, 우선순위, 예상 시간, 활성 상태를 수정합니다. targetId 또는 routineId가 필요합니다.',
        approvalRequired: true,
      },
      {
        name: 'prepare_kakao_share',
        description: '프로젝트, 업무, 회의자료, 루틴 또는 직접 작성한 문구를 카카오톡/Web Share/클립보드 공유용 payload로 준비합니다. 실제 전송은 클라이언트 버튼으로 수행합니다.',
        approvalRequired: true,
      },
      {
        name: 'prepare_meeting_pdf',
        description: '회의자료를 PDF 파일 공유/다운로드용 payload로 준비합니다. 실제 PDF 생성과 카카오/네이티브 파일 공유는 클라이언트에서 수행합니다.',
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

  private parseOptionalDateTime(value: unknown) {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeTaskStatus(value: unknown) {
    const status = String(value || '').toUpperCase();
    if (TASK_STATUSES.has(status)) return status;
    if (/완료|끝|done/.test(String(value || '').toLowerCase())) return 'DONE';
    if (/검토|review/.test(String(value || '').toLowerCase())) return 'REVIEW';
    if (/진행|doing|progress/.test(String(value || '').toLowerCase())) return 'IN_PROGRESS';
    if (/대기|todo|할 일/.test(String(value || '').toLowerCase())) return 'TODO';
    return null;
  }

  private normalizeProjectStatus(value: unknown) {
    const status = String(value || '').toUpperCase();
    if (PROJECT_STATUSES.has(status)) return status;
    if (/완료|끝|done|complete/.test(String(value || '').toLowerCase())) return 'COMPLETED';
    if (/보류|hold/.test(String(value || '').toLowerCase())) return 'ON_HOLD';
    if (/보관|archive/.test(String(value || '').toLowerCase())) return 'ARCHIVED';
    if (/진행|active/.test(String(value || '').toLowerCase())) return 'ACTIVE';
    return null;
  }

  private normalizeMeetingStatus(value: unknown) {
    const status = String(value || '').toUpperCase();
    if (MEETING_STATUSES.has(status)) return status;
    if (/공개|발행|게시|publish/.test(String(value || '').toLowerCase())) return 'PUBLISHED';
    if (/초안|임시|draft/.test(String(value || '').toLowerCase())) return 'DRAFT';
    return null;
  }

  private optionalText(value: unknown, maxLength: number) {
    if (value === undefined || value === null) return undefined;
    const text = compactWhitespace(String(value));
    return text ? text.slice(0, maxLength) : undefined;
  }

  private parseNumberId(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private formatDiffValue(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return value.toISOString().slice(0, 16).replace('T', ' ');
    if (typeof value === 'boolean') return value ? '활성' : '비활성';
    if (Array.isArray(value)) return value.length ? value.join(', ') : null;
    return compactWhitespace(String(value)).slice(0, 240) || null;
  }

  private buildDiffs(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    labels: Record<string, string>
  ): AgentDiffItem[] {
    return Object.keys(after)
      .map((field) => {
        const beforeValue = this.formatDiffValue(before[field]);
        const afterValue = this.formatDiffValue(after[field]);
        if (beforeValue === afterValue) return null;
        return {
          field,
          label: labels[field] || field,
          before: beforeValue,
          after: afterValue,
        };
      })
      .filter((item): item is AgentDiffItem => Boolean(item));
  }

  private buildUpdateSummary(entityLabel: string, title: string, diffs: AgentDiffItem[]) {
    const fields = diffs.map((diff) => diff.label).join(', ');
    return `${entityLabel} "${title}"의 ${fields}을(를) 수정합니다.`;
  }

  private compactShareText(value: unknown, fallback = '') {
    const text = compactWhitespace(String(value || fallback));
    return text.length > 900 ? `${text.slice(0, 897)}...` : text;
  }

  private formatDateForShare(value?: Date | null) {
    if (!value) return '일시 미정';
    return value.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatDateOnlyForShare(value?: Date | null) {
    if (!value) return '마감 없음';
    return value.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  }

  private stripHtml(value?: string | null) {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private shareIntentId(type: AgentShareIntent['type'], entityType: string, entityId: string | number) {
    return `${type}-${entityType}-${entityId}-${Date.now().toString(36)}`;
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

  private parseRepeatDays(prompt: string) {
    if (/매일|매일마다|날마다|daily/.test(prompt)) {
      return { repeatType: 'daily', repeatDays: ALL_DAYS };
    }

    if (/평일|월-금|월~금|weekday/.test(prompt)) {
      return { repeatType: 'weekly', repeatDays: WEEKDAYS };
    }

    const shortDays: Array<[RegExp, number]> = [
      [/일요일|주일/, 0],
      [/월요일|월요|월\b/, 1],
      [/화요일|화요|화\b/, 2],
      [/수요일|수요|수\b/, 3],
      [/목요일|목요|목\b/, 4],
      [/금요일|금요|금\b/, 5],
      [/토요일|토요|토\b/, 6],
    ];
    const days = shortDays
      .filter(([pattern]) => pattern.test(prompt))
      .map(([, value]) => value);
    const uniqueDays = [...new Set(days)].sort((a, b) => a - b);

    if (uniqueDays.length > 0) {
      return { repeatType: 'custom', repeatDays: uniqueDays };
    }

    return { repeatType: 'weekly', repeatDays: WEEKDAYS };
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
    const wantsRoutine = /루틴|반복|정기|routine|recurring/.test(normalized);

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

    if (wantsRoutine && wantsCreate) {
      const title = this.inferTitle(prompt, '새 루틴');
      const repeat = this.parseRepeatDays(prompt);
      tools.push({
        id: `tool-${tools.length + 1}`,
        toolName: 'create_routine',
        label: '루틴 생성',
        summary: `"${title}" 반복 루틴을 생성합니다.`,
        args: {
          title,
          description: 'AI 에이전트가 제안한 반복 업무 루틴입니다.',
          projectId: projectId || null,
          priority: 'MEDIUM',
          repeatType: repeat.repeatType,
          repeatDays: repeat.repeatDays,
          estimatedMinutes: null,
          assigneeName: null,
        },
      });
    }

    if (wantsTask && wantsCreate && !wantsRoutine) {
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
        if (!AGENT_TOOL_NAMES.has(toolName as AgentToolName)) return null;
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

  private isAdmin(member: AgentMemberContext) {
    return Boolean(member.permissions?.system?.manage_settings);
  }

  private async findProjectForAccess(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        ownerId: true,
        owner: { select: { id: true, name: true, email: true, username: true, isActive: true } },
        members: {
          select: {
            role: true,
            memberId: true,
            member: { select: { id: true, name: true, email: true, username: true, isActive: true } },
          },
        },
      },
    });

    if (!project) throw new ValidationError('대상 프로젝트를 찾을 수 없습니다.');
    return project;
  }

  private canAccessProject(
    project: { ownerId: string; members: Array<{ memberId: string }> },
    member: AgentMemberContext
  ) {
    return this.isAdmin(member)
      || project.ownerId === member.id
      || project.members.some((item) => item.memberId === member.id);
  }

  private async ensureProjectWrite(projectId: string, member: AgentMemberContext) {
    const project = await this.findProjectForAccess(projectId);

    const canWrite = this.hasPermission(member, 'task', 'create')
      && this.canAccessProject(project, member);
    if (!canWrite) throw new ForbiddenError('선택한 프로젝트에 업무를 만들 권한이 없습니다.');

    return project;
  }

  private async ensureProjectEdit(projectId: string, member: AgentMemberContext) {
    const project = await this.findProjectForAccess(projectId);
    const canEdit = this.hasPermission(member, 'project', 'edit') && this.canAccessProject(project, member);
    if (!canEdit) throw new ForbiddenError('선택한 프로젝트를 수정할 권한이 없습니다.');
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

  private normalizeRoutineRepeat(tool: AgentToolCallPreview) {
    const requestedType = ['daily', 'weekly', 'custom'].includes(String(tool.args.repeatType))
      ? String(tool.args.repeatType)
      : 'weekly';

    const providedDays = Array.isArray(tool.args.repeatDays)
      ? tool.args.repeatDays
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [];
    const uniqueDays = [...new Set(providedDays)].sort((a, b) => a - b);

    if (uniqueDays.length > 0) {
      const isEveryDay = uniqueDays.length === 7;
      const isWeekdays = uniqueDays.length === WEEKDAYS.length && WEEKDAYS.every((day, index) => uniqueDays[index] === day);
      return {
        repeatType: isEveryDay ? 'daily' : isWeekdays && requestedType === 'weekly' ? 'weekly' : 'custom',
        repeatDays: uniqueDays,
      };
    }

    if (requestedType === 'daily') return { repeatType: requestedType, repeatDays: ALL_DAYS };
    if (requestedType === 'weekly') return { repeatType: requestedType, repeatDays: WEEKDAYS };

    return {
      repeatType: 'custom',
      repeatDays: WEEKDAYS,
    };
  }

  private normalizeEstimatedMinutes(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const minutes = Number(value);
    return Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440 ? Math.round(minutes) : null;
  }

  private async executeCreateRoutine(tool: AgentToolCallPreview, member: AgentMemberContext, fallbackProjectId?: string | null) {
    if (!this.hasPermission(member, 'task', 'create')) {
      throw new ForbiddenError('루틴을 생성할 권한이 없습니다.');
    }

    const title = compactWhitespace(String(tool.args.title || ''));
    if (!title) throw new ValidationError('루틴 제목이 비어 있습니다.');

    const projectId = tool.args.projectId || fallbackProjectId || null;
    let assigneeCandidates: Array<{ id: string; name: string; email: string; username: string | null; isActive: boolean }> = [];

    if (projectId) {
      const project = await this.ensureProjectWrite(projectId, member);
      assigneeCandidates = [
        project.owner,
        ...project.members.map((item) => item.member),
      ];
    } else {
      assigneeCandidates = await this.prisma.member.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, username: true, isActive: true },
        take: 100,
      });
    }

    const assigneeId = this.matchAssigneeId(tool.args.assigneeName, assigneeCandidates) || member.id;
    const repeat = this.normalizeRoutineRepeat(tool);
    if (repeat.repeatDays.length === 0) {
      throw new ValidationError('루틴 반복 요일이 비어 있습니다.');
    }

    return this.prisma.routineTask.create({
      data: {
        title: title.slice(0, 160),
        description: tool.args.description ? String(tool.args.description).slice(0, 1000) : null,
        repeatType: repeat.repeatType,
        repeatDays: repeat.repeatDays,
        projectId,
        priority: this.normalizePriority(tool.args.priority),
        estimatedMinutes: this.normalizeEstimatedMinutes(tool.args.estimatedMinutes),
        createdById: member.id,
        assignees: {
          create: {
            memberId: assigneeId,
          },
        },
      },
      select: { id: true, title: true, projectId: true, repeatType: true, repeatDays: true },
    });
  }

  private async prepareUpdateProject(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope) {
    const targetId = this.optionalText(tool.args.targetId || tool.args.projectId || scope?.projectId, 120);
    if (!targetId) throw new ValidationError('수정할 프로젝트 ID가 필요합니다.');

    const project = await this.ensureProjectEdit(targetId, member);
    const data: { name?: string; description?: string | null; status?: string } = {};
    const title = this.optionalText(tool.args.title, 120);
    const description = this.optionalText(tool.args.description, 1000);
    const status = tool.args.status ? this.normalizeProjectStatus(tool.args.status) : null;

    if (title) data.name = title;
    if (description !== undefined) data.description = description;
    if (tool.args.status && !status) throw new ValidationError('프로젝트 상태 값이 올바르지 않습니다.');
    if (status) data.status = status;

    const after: Record<string, unknown> = {};
    if (data.name !== undefined) after.name = data.name;
    if (data.description !== undefined) after.description = data.description;
    if (data.status !== undefined) after.status = data.status;

    const diffs = this.buildDiffs(
      { name: project.name, description: project.description, status: project.status },
      after,
      { name: '이름', description: '설명', status: '상태' }
    );

    if (diffs.length === 0) throw new ValidationError('프로젝트에서 실제로 바뀔 내용이 없습니다.');
    return { project, data, diffs };
  }

  private async prepareUpdateMeeting(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope) {
    const targetId = this.parseNumberId(tool.args.meetingId || tool.args.targetId || scope?.meetingId);
    if (!targetId) throw new ValidationError('수정할 회의자료 ID가 필요합니다.');

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        title: true,
        meetingDate: true,
        projectId: true,
        teamId: true,
        content: true,
        summary: true,
        authorId: true,
        status: true,
      },
    });
    if (!meeting) throw new ValidationError('수정할 회의자료를 찾을 수 없습니다.');

    const canEdit = this.isAdmin(member) || meeting.authorId === member.id;
    if (!canEdit) throw new ForbiddenError('선택한 회의자료를 수정할 권한이 없습니다.');

    const data: {
      title?: string;
      meetingDate?: Date;
      projectId?: string | null;
      teamId?: string | null;
      content?: string;
      summary?: string | null;
      status?: string;
    } = {};
    const title = this.optionalText(tool.args.title, 160);
    const content = this.optionalText(tool.args.content, 6000);
    const summary = this.optionalText(tool.args.description, 1000);
    const projectId = this.optionalText(tool.args.projectId, 120);
    const teamId = this.optionalText(tool.args.teamId, 120);
    const meetingDate = tool.args.meetingDate ? this.parseOptionalDateTime(tool.args.meetingDate) : null;
    const status = tool.args.status ? this.normalizeMeetingStatus(tool.args.status) : null;

    if (title) data.title = title;
    if (content !== undefined) data.content = content;
    if (summary !== undefined) data.summary = summary;
    if (projectId) {
      const project = await this.findProjectForAccess(projectId);
      if (!this.canAccessProject(project, member)) throw new ForbiddenError('연결할 프로젝트 권한이 없습니다.');
      data.projectId = projectId;
    }
    if (teamId) data.teamId = teamId;
    if (tool.args.meetingDate && !meetingDate) throw new ValidationError('회의 날짜 형식이 올바르지 않습니다.');
    if (meetingDate) data.meetingDate = meetingDate;
    if (tool.args.status && !status) throw new ValidationError('회의자료 상태 값이 올바르지 않습니다.');
    if (status) data.status = status;

    const after: Record<string, unknown> = {};
    if (data.title !== undefined) after.title = data.title;
    if (data.meetingDate !== undefined) after.meetingDate = data.meetingDate;
    if (data.projectId !== undefined) after.projectId = data.projectId;
    if (data.teamId !== undefined) after.teamId = data.teamId;
    if (data.content !== undefined) after.content = data.content;
    if (data.summary !== undefined) after.summary = data.summary;
    if (data.status !== undefined) after.status = data.status;

    const diffs = this.buildDiffs(
      {
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        projectId: meeting.projectId,
        teamId: meeting.teamId,
        content: meeting.content,
        summary: meeting.summary,
        status: meeting.status,
      },
      after,
      {
        title: '제목',
        meetingDate: '회의 날짜',
        projectId: '프로젝트',
        teamId: '팀',
        content: '본문',
        summary: '요약',
        status: '상태',
      }
    );

    if (diffs.length === 0) throw new ValidationError('회의자료에서 실제로 바뀔 내용이 없습니다.');
    return { meeting, data, diffs };
  }

  private async prepareUpdateTask(tool: AgentToolCallPreview, member: AgentMemberContext) {
    const targetId = this.optionalText(tool.args.taskId || tool.args.targetId, 120);
    if (!targetId) throw new ValidationError('수정할 업무 ID가 필요합니다.');

    const task = await this.prisma.task.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        reporterId: true,
        projectId: true,
        assignee: { select: { id: true, name: true } },
        project: {
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
        },
      },
    });
    if (!task) throw new ValidationError('수정할 업무를 찾을 수 없습니다.');

    const canEdit = this.hasPermission(member, 'task', 'edit')
      && (this.isAdmin(member)
        || task.project.ownerId === member.id
        || task.project.members.some((item) => item.memberId === member.id)
        || task.assigneeId === member.id
        || task.reporterId === member.id);
    if (!canEdit) throw new ForbiddenError('선택한 업무를 수정할 권한이 없습니다.');

    const data: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      dueDate?: Date | null;
      assigneeId?: string | null;
    } = {};
    const title = this.optionalText(tool.args.title, 160);
    const description = this.optionalText(tool.args.description, 2000);
    const status = tool.args.status ? this.normalizeTaskStatus(tool.args.status) : null;
    const priority = tool.args.priority ? this.normalizePriority(tool.args.priority) : null;
    const parsedDueDate = tool.args.dueDate ? this.parseDueDate(tool.args.dueDate) : null;
    const assigneeName = this.optionalText(tool.args.assigneeName, 120);

    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (tool.args.status && !status) throw new ValidationError('업무 상태 값이 올바르지 않습니다.');
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (tool.args.dueDate && !parsedDueDate) throw new ValidationError('업무 마감일은 YYYY-MM-DD 형식이어야 합니다.');
    if (parsedDueDate) data.dueDate = new Date(`${parsedDueDate}T00:00:00.000Z`);

    const assigneeCandidates = [
      task.project.owner,
      ...task.project.members.map((item) => item.member),
    ]
      .filter((candidate) => candidate.isActive)
      .filter((candidate, index, items) => items.findIndex((item) => item.id === candidate.id) === index);
    const matchedAssigneeId = assigneeName ? this.matchAssigneeId(assigneeName, assigneeCandidates) : null;
    const matchedAssignee = matchedAssigneeId ? assigneeCandidates.find((candidate) => candidate.id === matchedAssigneeId) : null;
    if (assigneeName && !matchedAssigneeId) throw new ValidationError('담당자로 지정할 수 있는 멤버를 찾지 못했습니다.');
    if (matchedAssigneeId) data.assigneeId = matchedAssigneeId;

    const after: Record<string, unknown> = {};
    if (data.title !== undefined) after.title = data.title;
    if (data.description !== undefined) after.description = data.description;
    if (data.status !== undefined) after.status = data.status;
    if (data.priority !== undefined) after.priority = data.priority;
    if (data.dueDate !== undefined) after.dueDate = data.dueDate;
    if (data.assigneeId !== undefined) after.assignee = matchedAssignee?.name || null;

    const diffs = this.buildDiffs(
      {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignee: task.assignee?.name || null,
      },
      after,
      {
        title: '제목',
        description: '설명',
        status: '상태',
        priority: '우선순위',
        dueDate: '마감일',
        assignee: '담당자',
      }
    );

    if (diffs.length === 0) throw new ValidationError('업무에서 실제로 바뀔 내용이 없습니다.');
    return { task, data, diffs };
  }

  private async prepareUpdateRoutine(tool: AgentToolCallPreview, member: AgentMemberContext) {
    const targetId = this.optionalText(tool.args.routineId || tool.args.targetId, 120);
    if (!targetId) throw new ValidationError('수정할 루틴 ID가 필요합니다.');

    const routine = await this.prisma.routineTask.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        title: true,
        description: true,
        repeatType: true,
        repeatDays: true,
        projectId: true,
        priority: true,
        estimatedMinutes: true,
        isActive: true,
        createdById: true,
        assignees: { select: { memberId: true } },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: { select: { id: true, name: true, email: true, username: true, isActive: true } },
            members: {
              select: {
                role: true,
                memberId: true,
                member: { select: { id: true, name: true, email: true, username: true, isActive: true } },
              },
            },
          },
        },
      },
    });
    if (!routine) throw new ValidationError('수정할 루틴을 찾을 수 없습니다.');

    const canEdit = this.isAdmin(member)
      || routine.createdById === member.id
      || routine.assignees.some((item) => item.memberId === member.id)
      || (routine.project && this.hasPermission(member, 'task', 'edit') && this.canAccessProject(routine.project, member));
    if (!canEdit) throw new ForbiddenError('선택한 루틴을 수정할 권한이 없습니다.');

    const data: {
      title?: string;
      description?: string | null;
      repeatType?: string;
      repeatDays?: number[];
      projectId?: string | null;
      priority?: string;
      estimatedMinutes?: number | null;
      isActive?: boolean;
    } = {};
    const title = this.optionalText(tool.args.title, 160);
    const description = this.optionalText(tool.args.description, 1000);
    const projectId = this.optionalText(tool.args.projectId, 120);
    const priority = tool.args.priority ? this.normalizePriority(tool.args.priority) : null;
    const shouldUpdateRepeat = Boolean(tool.args.repeatType) || (Array.isArray(tool.args.repeatDays) && tool.args.repeatDays.length > 0);
    const repeat = shouldUpdateRepeat ? this.normalizeRoutineRepeat(tool) : null;

    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (projectId) {
      const project = await this.findProjectForAccess(projectId);
      if (!this.canAccessProject(project, member)) throw new ForbiddenError('연결할 프로젝트 권한이 없습니다.');
      data.projectId = projectId;
    }
    if (priority) data.priority = priority;
    if (tool.args.estimatedMinutes !== undefined && tool.args.estimatedMinutes !== null) {
      data.estimatedMinutes = this.normalizeEstimatedMinutes(tool.args.estimatedMinutes);
    }
    if (typeof tool.args.isActive === 'boolean') data.isActive = tool.args.isActive;
    if (repeat) {
      data.repeatType = repeat.repeatType;
      data.repeatDays = repeat.repeatDays;
    }

    const after: Record<string, unknown> = {};
    if (data.title !== undefined) after.title = data.title;
    if (data.description !== undefined) after.description = data.description;
    if (data.projectId !== undefined) after.projectId = data.projectId;
    if (data.priority !== undefined) after.priority = data.priority;
    if (data.estimatedMinutes !== undefined) after.estimatedMinutes = data.estimatedMinutes;
    if (data.isActive !== undefined) after.isActive = data.isActive;
    if (data.repeatType !== undefined) after.repeatType = data.repeatType;
    if (data.repeatDays !== undefined) after.repeatDays = data.repeatDays;

    const diffs = this.buildDiffs(
      {
        title: routine.title,
        description: routine.description,
        projectId: routine.projectId,
        priority: routine.priority,
        estimatedMinutes: routine.estimatedMinutes,
        isActive: routine.isActive,
        repeatType: routine.repeatType,
        repeatDays: routine.repeatDays,
      },
      after,
      {
        title: '제목',
        description: '설명',
        projectId: '프로젝트',
        priority: '우선순위',
        estimatedMinutes: '예상 시간',
        isActive: '활성 상태',
        repeatType: '반복 방식',
        repeatDays: '반복 요일',
      }
    );

    if (diffs.length === 0) throw new ValidationError('루틴에서 실제로 바뀔 내용이 없습니다.');
    return { routine, data, diffs };
  }

  async enrichToolPlanPreview(preview: AgentToolPlanPreview, member: AgentMemberContext, scope?: AgentToolScope): Promise<AgentToolPlanPreview> {
    const tools: AgentToolCallPreview[] = [];

    for (const tool of preview.tools) {
      if (tool.toolName === 'update_project') {
        const prepared = await this.prepareUpdateProject(tool, member, scope);
        tools.push({
          ...tool,
          summary: this.buildUpdateSummary('프로젝트', prepared.project.name, prepared.diffs),
          args: { ...tool.args, targetId: prepared.project.id, projectId: prepared.project.id, diffs: prepared.diffs },
        });
        continue;
      }

      if (tool.toolName === 'update_meeting') {
        const prepared = await this.prepareUpdateMeeting(tool, member, scope);
        tools.push({
          ...tool,
          summary: this.buildUpdateSummary('회의자료', prepared.meeting.title, prepared.diffs),
          args: { ...tool.args, targetId: String(prepared.meeting.id), meetingId: prepared.meeting.id, diffs: prepared.diffs },
        });
        continue;
      }

      if (tool.toolName === 'update_task') {
        const prepared = await this.prepareUpdateTask(tool, member);
        tools.push({
          ...tool,
          summary: this.buildUpdateSummary('업무', prepared.task.title, prepared.diffs),
          args: { ...tool.args, targetId: prepared.task.id, taskId: prepared.task.id, diffs: prepared.diffs },
        });
        continue;
      }

      if (tool.toolName === 'update_routine') {
        const prepared = await this.prepareUpdateRoutine(tool, member);
        tools.push({
          ...tool,
          summary: this.buildUpdateSummary('루틴', prepared.routine.title, prepared.diffs),
          args: { ...tool.args, targetId: prepared.routine.id, routineId: prepared.routine.id, diffs: prepared.diffs },
        });
        continue;
      }

      tools.push(tool);
    }

    return { ...preview, tools };
  }

  private async executeUpdateProject(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope) {
    const prepared = await this.prepareUpdateProject(tool, member, scope);
    const updated = await this.prisma.project.update({
      where: { id: prepared.project.id },
      data: prepared.data,
      select: { id: true, name: true },
    });
    return { ...updated, diffs: prepared.diffs };
  }

  private async executeUpdateMeeting(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope) {
    const prepared = await this.prepareUpdateMeeting(tool, member, scope);
    const updated = await this.prisma.meeting.update({
      where: { id: prepared.meeting.id },
      data: prepared.data,
      select: { id: true, title: true, projectId: true },
    });
    return { ...updated, diffs: prepared.diffs };
  }

  private async executeUpdateTask(tool: AgentToolCallPreview, member: AgentMemberContext) {
    const prepared = await this.prepareUpdateTask(tool, member);
    const updated = await this.prisma.task.update({
      where: { id: prepared.task.id },
      data: prepared.data,
      select: { id: true, title: true, projectId: true },
    });
    await this.activityLogService.create({
      taskId: prepared.task.id,
      memberId: member.id,
      action: 'updated',
      details: {
        source: 'ai_tool_plan',
        diffs: prepared.diffs,
      },
    });
    return { ...updated, diffs: prepared.diffs };
  }

  private async executeUpdateRoutine(tool: AgentToolCallPreview, member: AgentMemberContext) {
    const prepared = await this.prepareUpdateRoutine(tool, member);
    const updated = await this.prisma.routineTask.update({
      where: { id: prepared.routine.id },
      data: prepared.data,
      select: { id: true, title: true, projectId: true, repeatType: true, repeatDays: true },
    });
    return { ...updated, diffs: prepared.diffs };
  }

  private inferShareTarget(tool: AgentToolCallPreview, scope?: AgentToolScope) {
    const targetType = this.optionalText(tool.args.targetType, 40)?.toLowerCase() || null;
    const targetId = this.optionalText(tool.args.targetId, 120) || null;

    if (targetType) return { targetType, targetId };
    if (tool.args.taskId) return { targetType: 'task', targetId: String(tool.args.taskId) };
    if (tool.args.meetingId || scope?.meetingId) return { targetType: 'meeting', targetId: String(tool.args.meetingId || scope?.meetingId) };
    if (tool.args.routineId) return { targetType: 'routine', targetId: String(tool.args.routineId) };
    if (tool.args.projectId || scope?.projectId) return { targetType: 'project', targetId: String(tool.args.projectId || scope?.projectId) };
    if (targetId) return { targetType: 'project', targetId };
    return { targetType: 'generic', targetId: null };
  }

  private async ensureTaskReadable(taskId: string, member: AgentMemberContext) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        reporterId: true,
        projectId: true,
        project: {
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
        },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new ValidationError('공유할 업무를 찾을 수 없습니다.');

    const canRead = this.isAdmin(member)
      || this.canAccessProject(task.project, member)
      || task.assigneeId === member.id
      || task.reporterId === member.id;
    if (!canRead) throw new ForbiddenError('선택한 업무를 공유할 권한이 없습니다.');
    return task;
  }

  private async ensureMeetingReadable(meetingId: number, member: AgentMemberContext) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        meetingDate: true,
        content: true,
        summary: true,
        projectId: true,
        team: { select: { id: true, name: true, color: true } },
        authorId: true,
        attendees: { select: { memberId: true } },
        actionItems: {
          select: {
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
          take: 8,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!meeting) throw new ValidationError('공유할 회의자료를 찾을 수 없습니다.');

    const canReadByMeeting = this.isAdmin(member)
      || meeting.authorId === member.id
      || meeting.attendees.some((attendee) => attendee.memberId === member.id);
    const canReadByProject = meeting.projectId
      ? this.canAccessProject(await this.findProjectForAccess(meeting.projectId), member)
      : false;
    if (!canReadByMeeting && !canReadByProject) throw new ForbiddenError('선택한 회의자료를 공유할 권한이 없습니다.');
    return meeting;
  }

  private async ensureRoutineReadable(routineId: string, member: AgentMemberContext) {
    const routine = await this.prisma.routineTask.findUnique({
      where: { id: routineId },
      select: {
        id: true,
        title: true,
        description: true,
        repeatType: true,
        repeatDays: true,
        projectId: true,
        priority: true,
        estimatedMinutes: true,
        isActive: true,
        createdById: true,
        assignees: {
          select: {
            memberId: true,
            member: { select: { id: true, name: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            members: { select: { memberId: true } },
          },
        },
      },
    });
    if (!routine) throw new ValidationError('공유할 루틴을 찾을 수 없습니다.');

    const canRead = this.isAdmin(member)
      || routine.createdById === member.id
      || routine.assignees.some((assignee) => assignee.memberId === member.id)
      || (routine.project ? this.canAccessProject(routine.project, member) : false);
    if (!canRead) throw new ForbiddenError('선택한 루틴을 공유할 권한이 없습니다.');
    return routine;
  }

  private buildProjectShareIntent(project: Awaited<ReturnType<AgentToolRegistry['findProjectForAccess']>>, tool: AgentToolCallPreview): AgentShareIntent {
    const title = this.optionalText(tool.args.title, 120) || project.name;
    const body = this.compactShareText(tool.args.content, this.stripHtml(project.description) || '프로젝트 내용을 확인해주세요.');
    return {
      id: this.shareIntentId('kakao_text', 'project', project.id),
      type: 'kakao_text',
      title,
      text: [`[프로젝트] ${project.name}`, `상태: ${project.status}`, body].join('\n'),
      path: `/projects?projectId=${project.id}`,
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || '프로젝트 보기',
      entityType: 'project',
      entityId: project.id,
    };
  }

  private buildTaskShareIntent(task: Awaited<ReturnType<AgentToolRegistry['ensureTaskReadable']>>, tool: AgentToolCallPreview): AgentShareIntent {
    const title = this.optionalText(tool.args.title, 120) || task.title;
    const body = this.compactShareText(tool.args.content, this.stripHtml(task.description) || '업무 내용을 확인해주세요.');
    return {
      id: this.shareIntentId('kakao_text', 'task', task.id),
      type: 'kakao_text',
      title,
      text: [
        `[업무] ${task.title}`,
        `프로젝트: ${task.project.name}`,
        task.assignee?.name ? `담당: ${task.assignee.name}` : '담당자 없음',
        `상태: ${task.status} · 우선순위: ${task.priority}`,
        `마감: ${this.formatDateOnlyForShare(task.dueDate)}`,
        body,
      ].join('\n'),
      path: `/tasks?taskId=${task.id}`,
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || '업무 보기',
      entityType: 'task',
      entityId: task.id,
    };
  }

  private buildMeetingShareIntent(meeting: Awaited<ReturnType<AgentToolRegistry['ensureMeetingReadable']>>, tool: AgentToolCallPreview): AgentShareIntent {
    const title = this.optionalText(tool.args.title, 120) || meeting.title;
    const body = this.compactShareText(tool.args.content, this.stripHtml(meeting.summary || meeting.content) || '회의자료를 확인해주세요.');
    const actionLines = meeting.actionItems.length
      ? `\n할 일: ${meeting.actionItems.map((item) => item.title).join(', ')}`
      : '';
    return {
      id: this.shareIntentId('kakao_text', 'meeting', meeting.id),
      type: 'kakao_text',
      title,
      text: [
        `[회의] ${meeting.title}`,
        this.formatDateForShare(meeting.meetingDate),
        meeting.team?.name ? `팀: ${meeting.team.name}` : null,
        `${body}${actionLines}`,
      ].filter(Boolean).join('\n'),
      path: `/meetings/${meeting.id}`,
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || '회의 보기',
      entityType: 'meeting',
      entityId: String(meeting.id),
      meetingId: meeting.id,
    };
  }

  private buildRoutineShareIntent(routine: Awaited<ReturnType<AgentToolRegistry['ensureRoutineReadable']>>, tool: AgentToolCallPreview): AgentShareIntent {
    const title = this.optionalText(tool.args.title, 120) || routine.title;
    const body = this.compactShareText(tool.args.content, this.stripHtml(routine.description) || '반복 업무 루틴을 확인해주세요.');
    const assigneeText = routine.assignees.map((assignee) => assignee.member.name).join(', ') || '담당자 없음';
    return {
      id: this.shareIntentId('kakao_text', 'routine', routine.id),
      type: 'kakao_text',
      title,
      text: [
        `[루틴] ${routine.title}`,
        routine.project?.name ? `프로젝트: ${routine.project.name}` : null,
        `반복: ${routine.repeatType} (${routine.repeatDays.join(', ')})`,
        `담당: ${assigneeText}`,
        `우선순위: ${routine.priority}`,
        body,
      ].filter(Boolean).join('\n'),
      path: '/my-tasks',
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || '루틴 보기',
      entityType: 'routine',
      entityId: routine.id,
    };
  }

  private async executePrepareKakaoShare(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope): Promise<AgentShareIntent> {
    const { targetType, targetId } = this.inferShareTarget(tool, scope);

    if (targetType === 'project') {
      const projectId = targetId || tool.args.projectId || scope?.projectId;
      if (!projectId) throw new ValidationError('공유할 프로젝트 ID가 필요합니다.');
      const project = await this.findProjectForAccess(projectId);
      if (!this.canAccessProject(project, member)) throw new ForbiddenError('선택한 프로젝트를 공유할 권한이 없습니다.');
      return this.buildProjectShareIntent(project, tool);
    }

    if (targetType === 'task') {
      const taskId = targetId || tool.args.taskId;
      if (!taskId) throw new ValidationError('공유할 업무 ID가 필요합니다.');
      return this.buildTaskShareIntent(await this.ensureTaskReadable(taskId, member), tool);
    }

    if (targetType === 'meeting') {
      const meetingId = this.parseNumberId(targetId || tool.args.meetingId || scope?.meetingId);
      if (!meetingId) throw new ValidationError('공유할 회의자료 ID가 필요합니다.');
      return this.buildMeetingShareIntent(await this.ensureMeetingReadable(meetingId, member), tool);
    }

    if (targetType === 'routine') {
      const routineId = targetId || tool.args.routineId;
      if (!routineId) throw new ValidationError('공유할 루틴 ID가 필요합니다.');
      return this.buildRoutineShareIntent(await this.ensureRoutineReadable(routineId, member), tool);
    }

    const title = this.optionalText(tool.args.title, 120) || 'INTRUTH 공유';
    const text = this.compactShareText(tool.args.content || tool.args.description, '공유할 내용을 확인해주세요.');
    return {
      id: this.shareIntentId('kakao_text', 'generic', 'manual'),
      type: 'kakao_text',
      title,
      text,
      path: this.optionalText(tool.args.path, 200) || '/',
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || 'INTRUTH 열기',
      entityType: 'generic',
      entityId: null,
    };
  }

  private async executePrepareMeetingPdf(tool: AgentToolCallPreview, member: AgentMemberContext, scope?: AgentToolScope): Promise<AgentShareIntent> {
    const meetingId = this.parseNumberId(tool.args.meetingId || tool.args.targetId || scope?.meetingId);
    if (!meetingId) throw new ValidationError('PDF로 만들 회의자료 ID가 필요합니다.');
    const meeting = await this.ensureMeetingReadable(meetingId, member);
    return {
      id: this.shareIntentId('meeting_pdf', 'meeting', meeting.id),
      type: 'meeting_pdf',
      title: this.optionalText(tool.args.title, 120) || `${meeting.title} PDF`,
      text: this.compactShareText(tool.args.content || tool.args.description, `${meeting.title} 회의자료 PDF입니다.`),
      path: `/meetings/${meeting.id}`,
      buttonTitle: this.optionalText(tool.args.buttonTitle, 40) || 'PDF 공유',
      entityType: 'meeting',
      entityId: String(meeting.id),
      meetingId: meeting.id,
    };
  }

  async executeToolPlan(action: AgentToolActionRow, member: AgentMemberContext) {
    const preview = this.toToolPlanPreview(action.preview);
    const actionScope: AgentToolScope = {
      type: ['PROJECT', 'MEETING'].includes(action.scopeType) ? action.scopeType as AgentToolScope['type'] : 'GLOBAL',
      id: action.scopeId || undefined,
      label: action.scopeLabel || '전체',
      projectId: action.scopeType === 'PROJECT' && action.scopeId ? action.scopeId : undefined,
      meetingId: action.scopeType === 'MEETING' ? this.parseNumberId(action.scopeId) || undefined : undefined,
    };
    let currentProjectId: string | null = null;
    let currentMeetingId: number | null = null;
    const createdProjects = [];
    const createdTeams = [];
    const createdMeetings = [];
    const createdTasks = [];
    const createdRoutines = [];
    const updatedProjects = [];
    const updatedMeetings = [];
    const updatedTasks = [];
    const updatedRoutines = [];
    const shareIntents: AgentShareIntent[] = [];

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
        currentMeetingId = meeting.id;
        createdMeetings.push(meeting);
      }

      if (tool.toolName === 'create_tasks') {
        const result = await this.executeCreateTasks(tool, member, currentProjectId);
        currentProjectId = result.project.id;
        createdTasks.push(...result.tasks);
      }

      if (tool.toolName === 'create_routine') {
        const routine = await this.executeCreateRoutine(tool, member, currentProjectId);
        if (routine.projectId) currentProjectId = routine.projectId;
        createdRoutines.push(routine);
      }

      if (tool.toolName === 'update_project') {
        const project = await this.executeUpdateProject(tool, member, actionScope);
        currentProjectId = project.id;
        updatedProjects.push(project);
      }

      if (tool.toolName === 'update_meeting') {
        const meeting = await this.executeUpdateMeeting(tool, member, actionScope);
        currentMeetingId = meeting.id;
        if (meeting.projectId) currentProjectId = meeting.projectId;
        updatedMeetings.push(meeting);
      }

      if (tool.toolName === 'update_task') {
        const task = await this.executeUpdateTask(tool, member);
        currentProjectId = task.projectId;
        updatedTasks.push(task);
      }

      if (tool.toolName === 'update_routine') {
        const routine = await this.executeUpdateRoutine(tool, member);
        if (routine.projectId) currentProjectId = routine.projectId;
        updatedRoutines.push(routine);
      }

      if (tool.toolName === 'prepare_kakao_share') {
        shareIntents.push(await this.executePrepareKakaoShare(tool, member, {
          ...actionScope,
          projectId: currentProjectId || actionScope.projectId,
          meetingId: currentMeetingId || actionScope.meetingId,
        }));
      }

      if (tool.toolName === 'prepare_meeting_pdf') {
        shareIntents.push(await this.executePrepareMeetingPdf(tool, member, {
          ...actionScope,
          projectId: currentProjectId || actionScope.projectId,
          meetingId: currentMeetingId || actionScope.meetingId,
        }));
      }
    }

    return {
      createdCount: createdProjects.length + createdTeams.length + createdMeetings.length + createdTasks.length + createdRoutines.length,
      updatedCount: updatedProjects.length + updatedMeetings.length + updatedTasks.length + updatedRoutines.length,
      shareCount: shareIntents.length,
      projects: createdProjects,
      teams: createdTeams,
      meetings: createdMeetings,
      tasks: createdTasks,
      routines: createdRoutines,
      updatedProjects,
      updatedMeetings,
      updatedTasks,
      updatedRoutines,
      shareIntents,
    };
  }
}
