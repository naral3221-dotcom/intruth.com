/**
 * Update Project Use Case
 * 프로젝트 수정 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IProjectRepository, UpdateProjectDTO } from '@/domain/repositories/IProjectRepository';
import type { Project } from '@/types';
import { ValidationError } from './CreateProjectUseCase';

export interface UpdateProjectInput {
  projectId: string;
  data: UpdateProjectDTO;
}

export class UpdateProjectUseCase implements UseCase<UpdateProjectInput, Project> {
  constructor(private projectRepository: IProjectRepository) {}

  async execute(input: UpdateProjectInput): Promise<Project> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.projectRepository.update(input.projectId, input.data);
  }

  private validate(input: UpdateProjectInput): void {
    // 필수 필드 검증
    if (!input.projectId) {
      throw new ValidationError('프로젝트 ID는 필수입니다.');
    }

    // 이름 검증 (이름이 있는 경우)
    if (input.data.name !== undefined) {
      if (!input.data.name.trim()) {
        throw new ValidationError('프로젝트 이름은 비워둘 수 없습니다.');
      }
      if (input.data.name.length > 100) {
        throw new ValidationError('프로젝트 이름은 100자를 초과할 수 없습니다.');
      }
    }

    // 날짜 검증
    if (input.data.startDate && input.data.endDate) {
      const start = new Date(input.data.startDate);
      const end = new Date(input.data.endDate);

      if (end < start) {
        throw new ValidationError('종료일은 시작일 이후여야 합니다.');
      }
    }

    // 상태 검증
    const validStatuses = ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ON_HOLD'];
    if (input.data.status && !validStatuses.includes(input.data.status)) {
      throw new ValidationError('유효하지 않은 프로젝트 상태입니다.');
    }
  }
}
