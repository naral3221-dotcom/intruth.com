import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderPlus,
  ListTodo,
  MessageCircle,
  Plus,
  Share2,
  Users,
} from 'lucide-react';
import type {
  ActivityLog,
  DashboardStats,
  Meeting,
  Task,
} from '@/types';
import type { ProjectStats } from '../hooks/useDashboard';
import { cn } from '@/core/utils/cn';
import { shareKakaoText, type ShareResult } from '@/shared/share/kakaoShare';
import { createShareUrl } from '@/shared/share/shareConfig';
import { toast } from '@/stores/toastStore';
import { ScheduleCalendar } from './ScheduleCalendar';

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
    toast.success('공유 내용이 복사되었습니다.');
    return;
  }

  toast.info('공유를 완료했습니다.');
}

function QuickTile({
  icon: Icon,
  label,
  tone,
  onClick,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
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

  const todayTaskCount = myTasks.filter((task) => isToday(task.dueDate)).length;
  const projectCompletion = projectStats.total
    ? Math.round((projectStats.completed / projectStats.total) * 100)
    : 0;

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

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-foreground px-4 py-5 text-background">
        <p className="text-sm opacity-75">오늘의 리더십 보드</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">
          {memberName || '리더'}님, 확인할 일이 있어요
        </h1>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{stats.overdue}</p>
            <p className="text-xs opacity-75">지연</p>
          </div>
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{todayTaskCount}</p>
            <p className="text-xs opacity-75">오늘</p>
          </div>
          <div className="rounded-lg bg-background/10 p-3">
            <p className="text-xl font-bold">{upcomingMeetings.length}</p>
            <p className="text-xs opacity-75">회의</p>
          </div>
        </div>
      </section>

      <ScheduleCalendar tasks={myTasks} meetings={meetings} compact />

      <section className="grid grid-cols-3 gap-2">
        <QuickTile icon={Plus} label="업무" tone="text-green-600" onClick={onCreateTask} />
        <QuickTile icon={MessageCircle} label="회의" tone="text-cyan-700" onClick={onCreateMeeting} />
        <QuickTile icon={ClipboardCheck} label="출석" tone="text-amber-600" to="/attendance/check" />
        <QuickTile icon={FolderPlus} label="프로젝트" tone="text-purple-600" onClick={onCreateProject} />
        <QuickTile
          icon={Share2}
          label={sharingBrief ? '공유중' : '브리핑'}
          tone="text-indigo-600"
          onClick={() => void handleShareWeeklyBrief()}
        />
      </section>

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
