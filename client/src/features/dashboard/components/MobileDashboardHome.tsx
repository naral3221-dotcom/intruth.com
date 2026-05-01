import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderPlus,
  Loader2,
  ListTodo,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  ActivityLog,
  AiAgentAction,
  AiAssistantHistoryItem,
  AiAssistantResult,
  AiAssistantScopeType,
  DashboardStats,
  Meeting,
  Task,
} from '@/types';
import type { ProjectStats } from '../hooks/useDashboard';
import { cn } from '@/core/utils/cn';
import { shareKakaoText, type ShareResult } from '@/shared/share/kakaoShare';
import { createShareUrl } from '@/shared/share/shareConfig';
import {
  approveAiAgentAction,
  askAiAssistant,
  createAiTaskDraftAction,
  listAiAgentActions,
  listAiAssistantRuns,
  rejectAiAgentAction,
} from '@/shared/ai/assistantApi';
import { useTaskStore } from '@/stores/taskStore';
import { toast } from '@/stores/toastStore';

interface MobileDashboardHomeProps {
  memberName?: string;
  stats: DashboardStats;
  projectStats: ProjectStats;
  myTasks: Task[];
  meetings: Meeting[];
  activities: ActivityLog[];
  onCreateTask: () => void;
  onCreateMeeting: () => void;
  onCreateProject: () => void;
}

interface AssistantScopeOption {
  key: string;
  type: AiAssistantScopeType;
  id?: string;
  label: string;
  detail: string;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isToday(value?: string) {
  if (!value) return false;
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const date = new Date(value);
  return date >= today && date < tomorrow;
}

function isWithinNextDays(value: string | undefined, days: number) {
  if (!value) return false;
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(today.getDate() + days);
  const date = new Date(value);
  return date >= today && date < end;
}

function formatShortDate(value?: string) {
  if (!value) return '날짜 없음';
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function notifyShareResult(result: ShareResult) {
  if (result === 'kakao' || result === 'native') {
    toast.success('공유 화면을 열었습니다.');
    return;
  }

  if (result === 'copied') {
    toast.success('공유 내용을 복사했습니다.');
    return;
  }

  toast.info('공유를 완료했습니다.');
}

function scopeKey(type: AiAssistantScopeType, id?: string) {
  return `${type}:${id || 'all'}`;
}

function QuickTile({
  icon: Icon,
  label,
  tone,
  onClick,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: string;
  onClick?: () => void;
  to?: string;
}) {
  const className = cn(
    'flex min-h-20 flex-col justify-between rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted',
    tone
  );

  const content = (
    <>
      <Icon className="h-5 w-5" />
      <span className="whitespace-nowrap text-xs font-semibold text-foreground">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < startOfToday() && task.status !== 'DONE';

  return (
    <Link
      to={`/tasks?taskId=${task.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
        )}
      >
        {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {task.project?.name || '프로젝트 없음'} · {formatShortDate(task.dueDate)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      to={`/meetings?meetingId=${meeting.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{meeting.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatShortDate(meeting.meetingDate)}
          {meeting.location ? ` · ${meeting.location}` : ''}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function priorityLabel(priority: Task['priority']) {
  const labels = {
    LOW: '낮음',
    MEDIUM: '보통',
    HIGH: '높음',
    URGENT: '긴급',
  };
  return labels[priority] || priority;
}

function AiTaskDraftActionBlock({
  action,
  busy,
  onApprove,
  onReject,
}: {
  action: AiAgentAction;
  busy: boolean;
  onApprove: (actionId: number) => void;
  onReject: (actionId: number) => void;
}) {
  const { preview } = action;
  const isPending = action.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">승인 대기 업무 초안</p>
          <h3 className="mt-1 text-sm font-bold text-foreground">
            {preview.projectName} · {preview.tasks.length}개
          </h3>
          {preview.brief && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{preview.brief}</p>
          )}
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold',
          isPending ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground'
        )}>
          {isPending ? '확인 필요' : action.status}
        </span>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {preview.tasks.map((task, index) => (
          <div key={`${task.title}-${index}`} className="space-y-1 px-3 py-2">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{task.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {priorityLabel(task.priority)}
              {task.dueDate ? ` · ${formatShortDate(task.dueDate)}` : ''}
              {task.assigneeName ? ` · ${task.assigneeName}` : ''}
            </p>
          </div>
        ))}
      </div>

      {isPending && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onReject(action.id)}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border text-sm font-semibold text-foreground disabled:opacity-60"
          >
            거절
          </button>
          <button
            type="button"
            onClick={() => onApprove(action.id)}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            업무 만들기
          </button>
        </div>
      )}
    </div>
  );
}

export function MobileDashboardHome({
  memberName,
  stats,
  projectStats,
  myTasks,
  meetings,
  activities,
  onCreateTask,
  onCreateMeeting,
  onCreateProject,
}: MobileDashboardHomeProps) {
  const [sharingBrief, setSharingBrief] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState('이번 주 우선순위를 정리해줘');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResult, setAssistantResult] = useState<AiAssistantResult | null>(null);
  const [assistantHistory, setAssistantHistory] = useState<AiAssistantHistoryItem[]>([]);
  const [assistantHistoryLoading, setAssistantHistoryLoading] = useState(false);
  const [assistantScopeKey, setAssistantScopeKey] = useState(scopeKey('GLOBAL'));
  const [sharingAssistant, setSharingAssistant] = useState(false);
  const [assistantActions, setAssistantActions] = useState<AiAgentAction[]>([]);
  const [assistantActionsLoading, setAssistantActionsLoading] = useState(false);
  const [draftingTasks, setDraftingTasks] = useState(false);
  const [reviewingActionId, setReviewingActionId] = useState<number | null>(null);

  const focusTasks = useMemo(() => {
    const today = startOfToday();
    const candidates = myTasks
      .filter((task) => task.status !== 'DONE')
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });

    const urgent = candidates.filter((task) => task.dueDate && new Date(task.dueDate) < today);
    const dueToday = candidates.filter((task) => isToday(task.dueDate));
    const inProgress = candidates.filter((task) => task.status === 'IN_PROGRESS' || task.status === 'REVIEW');

    return [...urgent, ...dueToday, ...inProgress, ...candidates]
      .filter((task, index, array) => array.findIndex((item) => item.id === task.id) === index)
      .slice(0, 4);
  }, [myTasks]);

  const upcomingMeetings = useMemo(() => {
    const today = startOfToday();
    return meetings
      .filter((meeting) => new Date(meeting.meetingDate) >= today)
      .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
      .slice(0, 3);
  }, [meetings]);

  const weeklyTasks = useMemo(() => {
    return myTasks
      .filter((task) => task.status !== 'DONE' && isWithinNextDays(task.dueDate, 7))
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [myTasks]);

  const weeklyMeetings = useMemo(() => {
    return meetings
      .filter((meeting) => isWithinNextDays(meeting.meetingDate, 7))
      .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  }, [meetings]);

  const projectCompletion = projectStats.total
    ? Math.round((projectStats.completed / projectStats.total) * 100)
    : 0;

  const assistantScopeOptions = useMemo<AssistantScopeOption[]>(() => {
    const options: AssistantScopeOption[] = [
      { key: scopeKey('GLOBAL'), type: 'GLOBAL', label: '전체', detail: '내 업무와 회의' },
    ];
    const projectOptions = new Map<string, AssistantScopeOption>();

    myTasks.forEach((task) => {
      if (task.project?.id && task.project.name) {
        projectOptions.set(task.project.id, {
          key: scopeKey('PROJECT', task.project.id),
          type: 'PROJECT',
          id: task.project.id,
          label: task.project.name,
          detail: '프로젝트',
        });
      }
    });

    meetings.forEach((meeting) => {
      if (meeting.project?.id && meeting.project.name) {
        projectOptions.set(meeting.project.id, {
          key: scopeKey('PROJECT', meeting.project.id),
          type: 'PROJECT',
          id: meeting.project.id,
          label: meeting.project.name,
          detail: '프로젝트',
        });
      }
    });

    const meetingOptions = meetings
      .slice()
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
      .slice(0, 8)
      .map((meeting) => ({
        key: scopeKey('MEETING', String(meeting.id)),
        type: 'MEETING' as const,
        id: String(meeting.id),
        label: meeting.title,
        detail: `회의 · ${formatShortDate(meeting.meetingDate)}`,
      }));

    return [...options, ...Array.from(projectOptions.values()).slice(0, 8), ...meetingOptions];
  }, [meetings, myTasks]);

  const selectedAssistantScope = assistantScopeOptions.find((option) => option.key === assistantScopeKey)
    || assistantScopeOptions[0];

  const handleShareWeeklyBrief = async () => {
    setSharingBrief(true);
    try {
      const taskLines = weeklyTasks.slice(0, 5).map((task) => (
        `- ${formatShortDate(task.dueDate)} ${task.title}`
      ));
      const meetingLines = weeklyMeetings.slice(0, 5).map((meeting) => (
        `- ${formatShortDate(meeting.meetingDate)} ${meeting.title}`
      ));
      const text = [
        '[INTRUTH 이번 주 브리핑]',
        `업무 ${weeklyTasks.length}개`,
        taskLines.length ? taskLines.join('\n') : '- 예정된 업무 없음',
        `회의 ${weeklyMeetings.length}건`,
        meetingLines.length ? meetingLines.join('\n') : '- 예정된 회의 없음',
      ].join('\n');

      const result = await shareKakaoText({
        title: 'INTRUTH',
        text,
        url: createShareUrl('/'),
        buttonTitle: 'INTRUTH 열기',
      });
      notifyShareResult(result);
    } catch {
      toast.error('공유에 실패했습니다.');
    } finally {
      setSharingBrief(false);
    }
  };

  const loadAssistantHistory = async () => {
    setAssistantHistoryLoading(true);
    try {
      const runs = await listAiAssistantRuns(6);
      setAssistantHistory(runs);
    } catch (error) {
      toast.error('AI 기록을 불러오지 못했습니다.', (error as Error).message);
    } finally {
      setAssistantHistoryLoading(false);
    }
  };

  const loadAssistantActions = async () => {
    setAssistantActionsLoading(true);
    try {
      const actions = await listAiAgentActions(8);
      setAssistantActions(actions);
    } catch (error) {
      toast.error('AI 승인 대기 목록을 불러오지 못했습니다.', (error as Error).message);
    } finally {
      setAssistantActionsLoading(false);
    }
  };

  const handleAskAssistant = async (prompt = assistantPrompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setAssistantOpen(true);
    setAssistantPrompt(trimmed);
    setAssistantLoading(true);
    try {
      const result = await askAiAssistant(trimmed, {
        type: selectedAssistantScope.type,
        id: selectedAssistantScope.id,
      });
      setAssistantResult(result);
      void loadAssistantHistory();
    } catch (error) {
      toast.error('AI 브리핑을 만들지 못했습니다.', (error as Error).message);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleOpenAssistant = () => {
    setAssistantOpen(true);
    if (assistantHistory.length === 0 && !assistantHistoryLoading) {
      void loadAssistantHistory();
    }
    if (assistantActions.length === 0 && !assistantActionsLoading) {
      void loadAssistantActions();
    }
  };

  const handleSelectAssistantHistory = (item: AiAssistantHistoryItem) => {
    setAssistantPrompt(item.prompt);
    const key = scopeKey(item.scope.type, item.scope.id);
    if (assistantScopeOptions.some((option) => option.key === key)) {
      setAssistantScopeKey(key);
    }
    if (item.status === 'COMPLETED') {
      setAssistantResult(item);
    }
  };

  const handleCreateTaskDraft = async () => {
    const trimmed = assistantPrompt.trim();
    if (!trimmed) return;

    if (selectedAssistantScope.type === 'GLOBAL') {
      toast.warning('업무 초안에는 프로젝트 범위가 필요합니다.', '조회 범위에서 프로젝트나 프로젝트가 연결된 회의를 선택해주세요.');
      return;
    }

    setAssistantOpen(true);
    setDraftingTasks(true);
    try {
      const result = await createAiTaskDraftAction(trimmed, {
        type: selectedAssistantScope.type,
        id: selectedAssistantScope.id,
      });
      setAssistantResult(result.assistant);
      setAssistantActions((actions) => [
        result.action,
        ...actions.filter((action) => action.id !== result.action.id),
      ].slice(0, 8));
      toast.success('업무 초안 생성 완료', `${result.action.preview.tasks.length}개 업무를 승인 카드로 만들었습니다.`);
      void loadAssistantHistory();
    } catch (error) {
      toast.error('업무 초안을 만들지 못했습니다.', (error as Error).message);
    } finally {
      setDraftingTasks(false);
    }
  };

  const handleApproveAction = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      const result = await approveAiAgentAction(actionId);
      setAssistantActions((actions) => actions.map((action) => (
        action.id === actionId ? result.action : action
      )));

      const taskStore = useTaskStore.getState();
      const existingIds = new Set(taskStore.tasks.map((task) => task.id));
      taskStore.setTasks([
        ...taskStore.tasks,
        ...result.tasks.filter((task) => !existingIds.has(task.id)),
      ]);

      toast.success('AI 업무 생성 완료', `${result.createdCount}개 업무가 생성되었습니다.`);
    } catch (error) {
      toast.error('AI 업무 생성에 실패했습니다.', (error as Error).message);
      void loadAssistantActions();
    } finally {
      setReviewingActionId(null);
    }
  };

  const handleRejectAction = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      const action = await rejectAiAgentAction(actionId);
      setAssistantActions((actions) => actions.map((item) => (
        item.id === actionId ? action : item
      )));
      toast.info('AI 업무 초안을 보류했습니다.');
    } catch (error) {
      toast.error('AI 업무 초안 거절에 실패했습니다.', (error as Error).message);
    } finally {
      setReviewingActionId(null);
    }
  };

  const handleShareAssistantBrief = async () => {
    if (!assistantResult) return;

    setSharingAssistant(true);
    try {
      const result = await shareKakaoText({
        title: 'INTRUTH AI 브리핑',
        text: assistantResult.kakaoBrief || assistantResult.answer,
        url: createShareUrl('/'),
        buttonTitle: 'INTRUTH 열기',
      });
      notifyShareResult(result);
    } catch {
      toast.error('AI 브리핑 공유에 실패했습니다.');
    } finally {
      setSharingAssistant(false);
    }
  };

  const visibleAssistantActions = assistantActions
    .filter((action) => action.actionType === 'CREATE_TASKS')
    .sort((a, b) => {
      if (a.status === 'PENDING_APPROVAL' && b.status !== 'PENDING_APPROVAL') return -1;
      if (a.status !== 'PENDING_APPROVAL' && b.status === 'PENDING_APPROVAL') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-foreground px-4 py-5 text-background">
        <p className="text-sm opacity-75">오늘의 리더십 보드</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">{memberName || '리더'}님, 확인할 일이 있어요</h1>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{stats.overdue}</p>
            <p className="text-xs opacity-75">지연</p>
          </div>
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{myTasks.filter((task) => isToday(task.dueDate)).length}</p>
            <p className="text-xs opacity-75">오늘</p>
          </div>
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{upcomingMeetings.length}</p>
            <p className="text-xs opacity-75">회의</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <QuickTile icon={Plus} label="업무" tone="text-green-600" onClick={onCreateTask} />
        <QuickTile icon={MessageCircle} label="회의" tone="text-cyan-700" onClick={onCreateMeeting} />
        <QuickTile icon={ClipboardCheck} label="출석" tone="text-amber-600" to="/attendance/check" />
        <QuickTile icon={FolderPlus} label="프로젝트" tone="text-purple-600" onClick={onCreateProject} />
        <QuickTile icon={Sparkles} label="AI" tone="text-rose-600" onClick={handleOpenAssistant} />
        <QuickTile icon={Share2} label={sharingBrief ? '공유중' : '브리핑'} tone="text-indigo-600" onClick={() => void handleShareWeeklyBrief()} />
      </section>

      {assistantOpen && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-rose-600" />
              AI 브리핑
            </h2>
            {assistantResult && (
              <button
                type="button"
                onClick={() => void handleShareAssistantBrief()}
                disabled={sharingAssistant}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {sharingAssistant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                공유
              </button>
            )}
          </div>

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAskAssistant();
            }}
          >
            <label className="block text-xs font-semibold text-muted-foreground">
              조회 범위
              <select
                value={assistantScopeKey}
                onChange={(event) => setAssistantScopeKey(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {assistantScopeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} · {option.detail}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <input
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                className="aboard-input min-w-0 flex-1"
                placeholder="무엇을 확인할까요?"
              />
              <button
                type="submit"
                disabled={assistantLoading || !assistantPrompt.trim()}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleCreateTaskDraft()}
              disabled={draftingTasks || !assistantPrompt.trim() || selectedAssistantScope.type === 'GLOBAL'}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {draftingTasks ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              업무 초안 만들기
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {['지연 위험만 알려줘', '다음 회의 준비를 알려줘', '카카오로 보낼 요약을 만들어줘'].map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void handleAskAssistant(question)}
                className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {question}
              </button>
            ))}
          </div>

          {(visibleAssistantActions.length > 0 || assistantActionsLoading) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">승인 대기</p>
                <button
                  type="button"
                  onClick={() => void loadAssistantActions()}
                  disabled={assistantActionsLoading}
                  className="inline-flex min-h-8 items-center justify-center rounded-lg px-2 text-xs font-semibold text-primary disabled:opacity-60"
                >
                  {assistantActionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '새로고침'}
                </button>
              </div>
              {visibleAssistantActions.map((action) => (
                <AiTaskDraftActionBlock
                  key={action.id}
                  action={action}
                  busy={reviewingActionId === action.id}
                  onApprove={(actionId) => void handleApproveAction(actionId)}
                  onReject={(actionId) => void handleRejectAction(actionId)}
                />
              ))}
            </div>
          )}

          {(assistantHistory.length > 0 || assistantHistoryLoading) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">최근 요청</p>
                <button
                  type="button"
                  onClick={() => void loadAssistantHistory()}
                  disabled={assistantHistoryLoading}
                  className="inline-flex min-h-8 items-center justify-center rounded-lg px-2 text-xs font-semibold text-primary disabled:opacity-60"
                >
                  {assistantHistoryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '새로고침'}
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {assistantHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAssistantHistory(item)}
                    className="min-h-20 w-48 shrink-0 rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="line-clamp-2 text-xs font-semibold text-foreground">{item.prompt}</span>
                    <span className="mt-2 block text-[11px] text-muted-foreground">
                      {item.scope.label} · {formatShortDate(item.createdAt)}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {item.mode === 'openai' ? 'OpenAI' : 'Local'}
                      {item.usage?.totalTokens ? ` · ${item.usage.totalTokens.toLocaleString()} tokens` : ''}
                    </span>
                    {item.status === 'FAILED' && (
                      <span className="mt-1 block text-[11px] text-amber-600">실패</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {assistantResult && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{assistantResult.answer}</p>
              </div>
              {assistantResult.highlights.length > 0 && (
                <div className="space-y-2">
                  {assistantResult.highlights.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex gap-2 text-sm text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                {assistantResult.scope.label} · 업무 {assistantResult.sourceCounts.tasks}개 · 회의 {assistantResult.sourceCounts.meetings}건 · 프로젝트 {assistantResult.sourceCounts.projects}개
                {assistantResult.usage?.totalTokens ? ` · ${assistantResult.usage.totalTokens.toLocaleString()} tokens` : ''}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">우선 확인</h2>
          <Link to="/my-tasks" className="text-sm font-medium text-primary">
            전체 보기
          </Link>
        </div>
        {focusTasks.length > 0 ? (
          <div className="space-y-2">
            {focusTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
            <p className="mt-2 text-sm font-semibold text-foreground">급한 업무가 없습니다</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">다가오는 회의</h2>
          <button type="button" onClick={onCreateMeeting} className="text-sm font-medium text-primary">
            새 회의
          </button>
        </div>
        {upcomingMeetings.length > 0 ? (
          <div className="space-y-2">
            {upcomingMeetings.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreateMeeting}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card p-4 text-left"
          >
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">이번 주 회의를 등록하세요</span>
          </button>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/projects" className="rounded-lg border border-border bg-card p-4">
          <FolderPlus className="h-5 w-5 text-purple-600" />
          <p className="mt-3 text-2xl font-bold text-foreground">{projectCompletion}%</p>
          <p className="text-xs text-muted-foreground">프로젝트 완료율</p>
        </Link>
        <Link to="/team" className="rounded-lg border border-border bg-card p-4">
          <Users className="h-5 w-5 text-blue-600" />
          <p className="mt-3 text-2xl font-bold text-foreground">{stats.members}</p>
          <p className="text-xs text-muted-foreground">함께 섬기는 멤버</p>
        </Link>
      </section>

      {activities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">최근 변경</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="truncate text-sm font-semibold text-foreground">
              {activities[0].member?.name || '멤버'} · {activities[0].action}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {activities[0].task?.title || '업무 활동'} · {formatShortDate(activities[0].createdAt)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
