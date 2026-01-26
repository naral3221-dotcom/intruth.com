/**
 * Get Tasks Use Case
 * 업무 목록 조회 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { ITaskRepository, TaskListParams } from '@/domain/repositories/ITaskRepository';
import type { Task } from '@/types';

export class GetTasksUseCase implements UseCase<TaskListParams | undefined, Task[]> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(params?: TaskListParams): Promise<Task[]> {
    return this.taskRepository.findAll(params);
  }
}
