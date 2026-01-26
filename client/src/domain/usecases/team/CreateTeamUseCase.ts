/**
 * CreateTeamUseCase
 * 팀 생성 Use Case
 */
import type { Team } from '@/types';
import type { ITeamRepository, CreateTeamDTO } from '@/domain/repositories/ITeamRepository';
import type { UseCase } from '../UseCase';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CreateTeamUseCase implements UseCase<CreateTeamDTO, Team> {
  constructor(private teamRepository: ITeamRepository) {}

  async execute(input: CreateTeamDTO): Promise<Team> {
    this.validate(input);
    return this.teamRepository.create(input);
  }

  private validate(input: CreateTeamDTO): void {
    if (!input.name?.trim()) {
      throw new ValidationError('팀 이름은 필수입니다.');
    }

    if (input.name.trim().length > 50) {
      throw new ValidationError('팀 이름은 50자 이내여야 합니다.');
    }

    if (!input.color?.trim()) {
      throw new ValidationError('팀 색상은 필수입니다.');
    }
  }
}
