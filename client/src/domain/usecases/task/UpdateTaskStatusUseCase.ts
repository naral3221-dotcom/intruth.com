/**
 * Update Task Status Use Case
 * 업무 상태 변경 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { ITaskRepository, UpdateTaskStatusDTO } from '@/domain/repositories/ITaskRepository';
import type { Task, TaskStatus } from '@/types';

export interface UpdateTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  order?: number;
}

export class UpdateTaskStatusUseCase implements UseCase<UpdateTaskStatusInput, Task> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(input: UpdateTaskStatusInput): Promise<Task> {
    // 상태 전이 규칙 검증 (필요시 활성화)
    // await this.validateStatusTransition(input.taskId, input.status);

    const dto: UpdateTaskStatusDTO = {
      status: input.status,
      order: input.order,
    };

    return this.taskRepository.updateStatus(input.taskId, dto);
  }

  /**
   * 상태 전이 규칙 검증 (선택적)
   * 예: DONE에서 TODO로의 직접 이동 방지
   */
  private async validateStatusTransition(
    taskId: string,
    newStatus: TaskStatus
  ): Promise<void> {
    const currentTask = await this.taskRepository.findById(taskId);

    // 예시: 완료된 업무는 TODO로 직접 이동 불가
    // if (currentTask.status === 'DONE' && newStatus === 'TODO') {
    //   throw new Error('완료된 업무는 TODO로 직접 이동할 수 없습니다. IN_PROGRESS를 거쳐야 합니다.');
    // }
  }
}
