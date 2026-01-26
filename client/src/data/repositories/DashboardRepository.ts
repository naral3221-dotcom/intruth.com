/**
 * Dashboard Repository 구현체
 * IDashboardRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
 */
import type {
  IDashboardRepository,
  DashboardFilters,
  DashboardData,
  ActivityListParams,
  ProjectProgress
} from '@/domain/repositories/IDashboardRepository';
import type { DashboardStats, TeamProgress, ActivityLog, Task } from '@/types';
import { DashboardApiSource } from '../sources/api/DashboardApiSource';

export class DashboardRepository implements IDashboardRepository {
  constructor(private readonly apiSource: DashboardApiSource) {}

  async getDashboardData(filters?: DashboardFilters): Promise<DashboardData> {
    return this.apiSource.getDashboardData(filters);
  }

  async getStats(filters?: DashboardFilters): Promise<DashboardStats> {
    return this.apiSource.getStats(filters);
  }

  async getMyTasks(): Promise<Task[]> {
    return this.apiSource.getMyTasks();
  }

  async getMyOverdueTasks(): Promise<Task[]> {
    return this.apiSource.getMyOverdueTasks();
  }

  async getMyUpcomingTasks(days?: number): Promise<Task[]> {
    return this.apiSource.getMyUpcomingTasks(days);
  }

  async getTeamProgress(): Promise<TeamProgress[]> {
    return this.apiSource.getTeamProgress();
  }

  async getMemberProgress(memberId: string): Promise<TeamProgress> {
    return this.apiSource.getMemberProgress(memberId);
  }

  async getRecentActivities(params?: ActivityListParams): Promise<ActivityLog[]> {
    return this.apiSource.getRecentActivities(params);
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    return this.apiSource.getProjectsProgress();
  }

  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    return this.apiSource.getProjectProgress(projectId);
  }
}
