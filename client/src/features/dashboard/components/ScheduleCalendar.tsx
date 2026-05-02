import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  ListTodo,
} from 'lucide-react';
import type { Meeting, Task } from '@/types';
import { cn } from '@/core/utils/cn';

interface ScheduleCalendarProps {
  tasks: Task[];
  meetings: Meeting[];
  compact?: boolean;
}

interface CalendarEvent {
  id: string;
  type: 'meeting' | 'task';
  title: string;
  date: Date;
  to: string;
  meta?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonth(value: Date) {
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function getMonthCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildCalendarEvents(tasks: Task[], meetings: Meeting[]) {
  const meetingEvents: CalendarEvent[] = meetings.map((meeting) => ({
    id: `meeting-${meeting.id}`,
    type: 'meeting',
    title: meeting.title,
    date: new Date(meeting.meetingDate),
    to: `/meetings/${meeting.id}`,
    meta: meeting.team?.name,
  }));

  const taskEvents: CalendarEvent[] = tasks
    .filter((task) => task.dueDate && task.status !== 'DONE')
    .map((task) => ({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      date: new Date(task.dueDate as string),
      to: `/tasks?taskId=${task.id}`,
      meta: task.project?.name,
    }));

  return [...meetingEvents, ...taskEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function ScheduleCalendar({ tasks, meetings, compact = false }: ScheduleCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const events = useMemo(() => buildCalendarEvents(tasks, meetings), [meetings, tasks]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = getDateKey(event.date);
      const current = map.get(key) || [];
      current.push(event);
      map.set(key, current);
    });
    return map;
  }, [events]);

  const cells = useMemo(() => getMonthCells(visibleMonth), [visibleMonth]);
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => startOfDay(event.date) >= today)
      .slice(0, compact ? 3 : 5);
  }, [compact, events, today]);

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const resetMonth = () => {
    setVisibleMonth(startOfDay(new Date()));
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CalendarDays className="h-4 w-4" />
            일정표
          </div>
          <h2 className="mt-1 text-xl font-bold text-foreground lg:text-2xl">{formatMonth(visibleMonth)}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetMonth}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
          >
            이번 달
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-muted px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs"
          >
            {day}
          </div>
        ))}

        {cells.map((date) => {
          const key = getDateKey(date);
          const dayEvents = eventsByDate.get(key) || [];
          const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
          const isToday = key === getDateKey(today);
          const visibleEvents = dayEvents.slice(0, compact ? 2 : 3);

          return (
            <div
              key={key}
              className={cn(
                'min-h-20 bg-card p-1.5 sm:min-h-28 sm:p-2 lg:min-h-32',
                !isCurrentMonth && 'bg-muted/40 text-muted-foreground'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                    !isCurrentMonth && !isToday && 'text-muted-foreground'
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {visibleEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={event.to}
                    className={cn(
                      'block truncate rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight sm:text-[11px]',
                      event.type === 'meeting'
                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    )}
                  >
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > visibleEvents.length && (
                  <div className="px-1.5 text-[10px] font-medium text-muted-foreground">
                    +{dayEvents.length - visibleEvents.length}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <FileText className="h-3.5 w-3.5" />
            회의자료
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <ListTodo className="h-3.5 w-3.5" />
            업무 마감
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            다가오는 일정
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={event.to}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-muted"
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      event.type === 'meeting' ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    {event.type === 'meeting' ? <FileText className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatShortDate(event.date)}
                      {event.meta ? ` · ${event.meta}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              예정된 일정이 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
