/**
 * Update Task Use Case
 * 업무 수정 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { ITaskRepository, UpdateTaskDTO } from '@/domain/repositories/ITaskRepository';
import type { Task } from '@/types';
import { ValidationError } from './CreateTaskUseCase';

export interface UpdateTaskInput {
  taskId: string;
  data: UpdateTaskDTO;
}

export class UpdateTaskUseCase implements UseCase<UpdateTaskInput, Task> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(input: UpdateTaskInput): Promise<Task> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.taskRepository.update(input.taskId, input.data);
  }

  private validate(input: UpdateTaskInput): void {
    // 필수 필드 검증
    if (!input.taskId) {
      throw new ValidationError('업무 ID는 필수입니다.');
    }

    // 제목 길이 검증 (제목이 있는 경우)
    if (input.data.title !== undefined) {
      if (!input.data.title.trim()) {
        throw new ValidationError('업무 제목은 비워둘 수 없습니다.');
      }
      if (input.data.title.length > 200) {
        throw new ValidationError('업무 제목은 200자를 초과할 수 없습니다.');
      }
    }

    // 날짜 검증
    if (input.data.startDate && input.data.dueDate) {
      const start = new Date(input.data.startDate);
      const due = new Date(input.data.dueDate);

      if (due < start) {
        throw new ValidationError('마감일은 시작일 이후여야 합니다.');
      }
    }

    // 시간 검증
    if (input.data.estimatedHours !== undefined && input.data.estimatedHours < 0) {
      throw new ValidationError('예상 시간은 0 이상이어야 합니다.');
    }

    if (input.data.actualHours !== undefined && input.data.actualHours < 0) {
      throw new ValidationError('실제 시간은 0 이상이어야 합니다.');
    }
  }
}
