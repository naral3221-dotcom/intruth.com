/**
 * UpdateTeamUseCase
 * 팀 수정 Use Case
 */
import type { Team } from '@/types';
import type { ITeamRepository, UpdateTeamDTO } from '@/domain/repositories/ITeamRepository';
import type { UseCase } from '../UseCase';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface UpdateTeamInput {
  teamId: string;
  data: UpdateTeamDTO;
}

export class UpdateTeamUseCase implements UseCase<UpdateTeamInput, Team> {
  constructor(private teamRepository: ITeamRepository) {}

  async execute(input: UpdateTeamInput): Promise<Team> {
    this.validate(input);
    return this.teamRepository.update(input.teamId, input.data);
  }

  private validate(input: UpdateTeamInput): void {
    if (!input.teamId?.trim()) {
      throw new ValidationError('팀 ID는 필수입니다.');
    }

    if (input.data.name !== undefined && !input.data.name?.trim()) {
      throw new ValidationError('팀 이름은 빈 값일 수 없습니다.');
    }

    if (input.data.name && input.data.name.trim().length > 50) {
      throw new ValidationError('팀 이름은 50자 이내여야 합니다.');
    }
  }
}
