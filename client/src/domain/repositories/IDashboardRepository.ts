/**
 * Dashboard Repository 인터페이스
 * 대시보드 데이터 접근을 위한 추상화 계층
 */
import type { DashboardStats, TeamProgress, ActivityLog, Task, Project } from '@/types';

// DTO (Data Transfer Objects)
export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  teamId?: string;
  projectId?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  myTasks: Task[];
  recentProjects: Project[];
  teamProgress: TeamProgress[];
  recentActivities: ActivityLog[];
}

export interface ActivityListParams {
  limit?: number;
  offset?: number;
  taskId?: string;
  memberId?: string;
  projectId?: string;
  action?: string;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  status: Project['status'];
}

// Repository 인터페이스
export interface IDashboardRepository {
  // Dashboard data (대시보드 데이터)
  getDashboardData(filters?: DashboardFilters): Promise<DashboardData>;
  getStats(filters?: DashboardFilters): Promise<DashboardStats>;

  // My tasks (내 업무)
  getMyTasks(): Promise<Task[]>;
  getMyOverdueTasks(): Promise<Task[]>;
  getMyUpcomingTasks(days?: number): Promise<Task[]>;

  // Team progress (팀 진행 현황)
  getTeamProgress(): Promise<TeamProgress[]>;
  getMemberProgress(memberId: string): Promise<TeamProgress>;

  // Activities (활동 로그)
  getRecentActivities(params?: ActivityListParams): Promise<ActivityLog[]>;

  // Project progress (프로젝트 진행 현황)
  getProjectsProgress(): Promise<ProjectProgress[]>;
  getProjectProgress(projectId: string): Promise<ProjectProgress>;
}
