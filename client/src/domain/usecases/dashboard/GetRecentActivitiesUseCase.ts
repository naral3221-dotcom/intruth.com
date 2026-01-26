/**
 * GetRecentActivitiesUseCase
 * 최근 활동 로그 조회 Use Case
 */
import type { ActivityLog } from '@/types';
import type { IDashboardRepository, ActivityListParams } from '@/domain/repositories/IDashboardRepository';
import type { UseCaseNoInput } from '../UseCase';

export class GetRecentActivitiesUseCase implements UseCaseNoInput<ActivityLog[]> {
  constructor(
    private dashboardRepository: IDashboardRepository,
    private params?: ActivityListParams
  ) {}

  async execute(): Promise<ActivityLog[]> {
    return this.dashboardRepository.getRecentActivities(this.params);
  }
}
