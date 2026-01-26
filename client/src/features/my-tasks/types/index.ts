import type { Task, TaskStatus, TaskPriority } from '@/types';

export type TaskFilter = 'all' | TaskStatus;
export type TaskSort = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type ViewMode = 'list' | 'calendar' | 'timeline';

export interface MyTaskStats {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    completedThisWeek: number;
    dueTodayCount: number;
    dueThisWeekCount: number;
}

export interface WeeklyProgress {
    day: string;
    date: string;
    completed: number;
    created: number;
}

export interface UrgentTask extends Task {
    daysUntilDue: number;
    isOverdue: boolean;
}

export type { Task, TaskStatus, TaskPriority };
