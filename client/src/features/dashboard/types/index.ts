import type { Task, DashboardStats as GlobalDashboardStats, TeamProgress } from '@/types';

// Re-export from global types
export type DashboardStats = GlobalDashboardStats;

// Team member progress with task stats
export interface TeamMemberProgress extends TeamProgress {
    id: string;
    name: string;
    taskStats: {
        todo: number;
        inProgress: number;
        review: number;
        done: number;
    };
}

// Activity feed item (별도 정의, ActivityLog와 유사하지만 단순화된 버전)
export interface ActivityItem {
    id: string;
    action: string;
    member: {
        id: string;
        name: string;
    };
    task?: {
        id: string;
        title: string;
        project?: { id: string; name: string };
    };
    createdAt: string;
}

// Dashboard data interface
export interface DashboardData {
    stats: DashboardStats | null;
    myTasks: Task[];
    teamProgress: TeamMemberProgress[];
    activities: ActivityItem[];
}
