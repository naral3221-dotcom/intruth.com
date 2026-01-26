/**
 * GetDashboardDataUseCase
 * 대시보드 데이터 조회 Use Case
 */
import type { IDashboardRepository, DashboardData, DashboardFilters } from '@/domain/repositories/IDashboardRepository';
import type { UseCaseNoInput } from '../UseCase';

export class GetDashboardDataUseCase implements UseCaseNoInput<DashboardData> {
  constructor(
    private dashboardRepository: IDashboardRepository,
    private filters?: DashboardFilters
  ) {}

  async execute(): Promise<DashboardData> {
    return this.dashboardRepository.getDashboardData(this.filters);
  }
}
