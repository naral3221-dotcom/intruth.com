/**
 * DeleteTeamUseCase
 * 팀 삭제 Use Case
 */
import type { ITeamRepository } from '@/domain/repositories/ITeamRepository';
import type { UseCase } from '../UseCase';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DeleteTeamUseCase implements UseCase<string, void> {
  constructor(private teamRepository: ITeamRepository) {}

  async execute(teamId: string): Promise<void> {
    this.validate(teamId);
    await this.teamRepository.delete(teamId);
  }

  private validate(teamId: string): void {
    if (!teamId?.trim()) {
      throw new ValidationError('팀 ID는 필수입니다.');
    }
  }
}
