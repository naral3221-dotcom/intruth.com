/**
 * Create Task Use Case
 * 업무 생성 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { ITaskRepository, CreateTaskDTO } from '@/domain/repositories/ITaskRepository';
import type { Task } from '@/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CreateTaskUseCase implements UseCase<CreateTaskDTO, Task> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(input: CreateTaskDTO): Promise<Task> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.taskRepository.create(input);
  }

  private validate(input: CreateTaskDTO): void {
    // 필수 필드 검증
    if (!input.title?.trim()) {
      throw new ValidationError('업무 제목은 필수입니다.');
    }

    if (!input.projectId) {
      throw new ValidationError('프로젝트는 필수입니다.');
    }

    // 제목 길이 검증
    if (input.title.length > 200) {
      throw new ValidationError('업무 제목은 200자를 초과할 수 없습니다.');
    }

    // 날짜 검증
    if (input.startDate && input.dueDate) {
      const start = new Date(input.startDate);
      const due = new Date(input.dueDate);

      if (due < start) {
        throw new ValidationError('마감일은 시작일 이후여야 합니다.');
      }
    }
  }
}
