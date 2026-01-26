/**
 * Delete Task Use Case
 * 업무 삭제 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { ITaskRepository } from '@/domain/repositories/ITaskRepository';
import { ValidationError } from './CreateTaskUseCase';

export class DeleteTaskUseCase implements UseCase<string, void> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(taskId: string): Promise<void> {
    // 비즈니스 규칙 검증
    this.validate(taskId);

    await this.taskRepository.delete(taskId);
  }

  private validate(taskId: string): void {
    if (!taskId) {
      throw new ValidationError('삭제할 업무 ID는 필수입니다.');
    }
  }
}
