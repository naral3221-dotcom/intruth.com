/**
 * Dashboard API Source
 * Dashboard 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { DashboardStats, TeamProgress, ActivityLog, Task } from '@/types';
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
    const [stats, myTasks, teamProgress, recentActivities] = await Promise.all([
      this.getStats(filters),
      this.getMyTasks(),
      this.getTeamProgress(),
      this.getRecentActivities({ limit: 20 }),
    ]);

    return {
      stats,
      myTasks,
      recentProjects: [],
      teamProgress,
      recentActivities,
    };
  }

  async getStats(filters?: DashboardApiFilters): Promise<DashboardStats> {
    void filters;
    return this.httpClient.get<DashboardStats>('/dashboard/summary');
  }

  async getMyTasks(): Promise<Task[]> {
    return this.httpClient.get<Task[]>('/dashboard/my-tasks');
  }

  async getMyOverdueTasks(): Promise<Task[]> {
    return this.httpClient.get<Task[]>('/dashboard/my-overdue');
  }

  async getMyUpcomingTasks(days: number = 7): Promise<Task[]> {
    return this.httpClient.get<Task[]>(`/dashboard/my-upcoming?days=${days}`);
  }

  async getTeamProgress(): Promise<TeamProgress[]> {
    return this.httpClient.get<TeamProgress[]>('/dashboard/team-progress');
  }

  async getMemberProgress(memberId: string): Promise<TeamProgress> {
    return this.httpClient.get<TeamProgress>(`/dashboard/member-progress/${memberId}`);
  }

  async getRecentActivities(params?: ActivityApiListParams): Promise<ActivityLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.memberId) searchParams.set('memberId', params.memberId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.action) searchParams.set('actionType', params.action);
    const query = searchParams.toString();
    return this.httpClient.get<ActivityLog[]>(`/dashboard/recent-activities${query ? `?${query}` : ''}`);
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    const projects = await this.httpClient.get<Array<{
      id: string;
      name: string;
      status: ProjectProgress['status'];
      total: number;
      taskStats: { done: number };
      completionRate: number;
    }>>('/dashboard/projects-progress');

    return projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      totalTasks: project.total,
      completedTasks: project.taskStats.done,
      progressPercent: project.completionRate,
      status: project.status,
    }));
  }

  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    const projects = await this.getProjectsProgress();
    const project = projects.find((item) => item.projectId === projectId);

    if (!project) {
      throw new Error('프로젝트 진행 현황을 찾을 수 없습니다.');
    }

    return project;
  }
}
