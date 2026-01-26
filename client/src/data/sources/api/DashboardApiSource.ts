/**
 * Dashboard API Source
 * Dashboard 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { DashboardStats, TeamProgress, ActivityLog, Task, Project } from '@/types';
import type { DashboardData, ProjectProgress } from '@/domain/repositories/IDashboardRepository';

export interface DashboardApiFilters {
  startDate?: string;
  endDate?: string;
  teamId?: string;
  projectId?: string;
}

export interface ActivityApiListParams {
  limit?: number;
  offset?: number;
  taskId?: string;
  memberId?: string;
  projectId?: string;
  action?: string;
}

export class DashboardApiSource {
  constructor(private httpClient: HttpClient) {}

  async getDashboardData(filters?: DashboardApiFilters): Promise<DashboardData> {
    const searchParams = new URLSearchParams();
    if (filters?.startDate) searchParams.set('startDate', filters.startDate);
    if (filters?.endDate) searchParams.set('endDate', filters.endDate);
    if (filters?.teamId) searchParams.set('teamId', filters.teamId);
    if (filters?.projectId) searchParams.set('projectId', filters.projectId);
    const query = searchParams.toString();
    return this.httpClient.get<DashboardData>(`/dashboard.php${query ? `?${query}` : ''}`);
  }

  async getStats(filters?: DashboardApiFilters): Promise<DashboardStats> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'stats');
    if (filters?.startDate) searchParams.set('startDate', filters.startDate);
    if (filters?.endDate) searchParams.set('endDate', filters.endDate);
    if (filters?.teamId) searchParams.set('teamId', filters.teamId);
    if (filters?.projectId) searchParams.set('projectId', filters.projectId);
    return this.httpClient.get<DashboardStats>(`/dashboard.php?${searchParams.toString()}`);
  }

  async getMyTasks(): Promise<Task[]> {
    return this.httpClient.get<Task[]>('/dashboard.php?action=my-tasks');
  }

  async getMyOverdueTasks(): Promise<Task[]> {
    return this.httpClient.get<Task[]>('/dashboard.php?action=my-overdue');
  }

  async getMyUpcomingTasks(days: number = 7): Promise<Task[]> {
    return this.httpClient.get<Task[]>(`/dashboard.php?action=my-upcoming&days=${days}`);
  }

  async getTeamProgress(): Promise<TeamProgress[]> {
    return this.httpClient.get<TeamProgress[]>('/dashboard.php?action=team-progress');
  }

  async getMemberProgress(memberId: string): Promise<TeamProgress> {
    return this.httpClient.get<TeamProgress>(`/dashboard.php?action=member-progress&memberId=${memberId}`);
  }

  async getRecentActivities(params?: ActivityApiListParams): Promise<ActivityLog[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'activities');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.memberId) searchParams.set('memberId', params.memberId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.action) searchParams.set('actionType', params.action);
    return this.httpClient.get<ActivityLog[]>(`/dashboard.php?${searchParams.toString()}`);
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    return this.httpClient.get<ProjectProgress[]>('/dashboard.php?action=projects-progress');
  }

  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    return this.httpClient.get<ProjectProgress>(`/dashboard.php?action=project-progress&projectId=${projectId}`);
  }
}
