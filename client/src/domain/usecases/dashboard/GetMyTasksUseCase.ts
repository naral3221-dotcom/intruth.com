/**
 * GetMyTasksUseCase
 * 내 업무 조회 Use Case
 */
import type { Task } from '@/types';
import type { IDashboardRepository } from '@/domain/repositories/IDashboardRepository';
import type { UseCaseNoInput } from '../UseCase';

export class GetMyTasksUseCase implements UseCaseNoInput<Task[]> {
  constructor(private dashboardRepository: IDashboardRepository) {}

  async execute(): Promise<Task[]> {
    return this.dashboardRepository.getMyTasks();
  }
}
