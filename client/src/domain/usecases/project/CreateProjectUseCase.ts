/**
 * Create Project Use Case
 * 프로젝트 생성 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IProjectRepository, CreateProjectDTO } from '@/domain/repositories/IProjectRepository';
import type { Project } from '@/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CreateProjectUseCase implements UseCase<CreateProjectDTO, Project> {
  constructor(private projectRepository: IProjectRepository) {}

  async execute(input: CreateProjectDTO): Promise<Project> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.projectRepository.create(input);
  }

  private validate(input: CreateProjectDTO): void {
    // 필수 필드 검증
    if (!input.name?.trim()) {
      throw new ValidationError('프로젝트 이름은 필수입니다.');
    }

    // 이름 길이 검증
    if (input.name.length > 100) {
      throw new ValidationError('프로젝트 이름은 100자를 초과할 수 없습니다.');
    }

    // 날짜 검증
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      if (end < start) {
        throw new ValidationError('종료일은 시작일 이후여야 합니다.');
      }
    }
  }
}
