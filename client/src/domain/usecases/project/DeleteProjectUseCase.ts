/**
 * Delete Project Use Case
 * 프로젝트 삭제 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import { ValidationError } from './CreateProjectUseCase';

export class DeleteProjectUseCase implements UseCase<string, void> {
  constructor(private projectRepository: IProjectRepository) {}

  async execute(projectId: string): Promise<void> {
    // 비즈니스 규칙 검증
    this.validate(projectId);

    await this.projectRepository.delete(projectId);
  }

  private validate(projectId: string): void {
    if (!projectId) {
      throw new ValidationError('삭제할 프로젝트 ID는 필수입니다.');
    }
  }
}
