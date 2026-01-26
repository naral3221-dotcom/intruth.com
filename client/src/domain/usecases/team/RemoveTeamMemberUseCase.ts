/**
 * RemoveTeamMemberUseCase
 * 팀 멤버 제거 Use Case
 */
import type { ITeamRepository } from '@/domain/repositories/ITeamRepository';
import type { UseCase } from '../UseCase';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface RemoveTeamMemberInput {
  teamId: string;
  memberId: string;
}

export class RemoveTeamMemberUseCase implements UseCase<RemoveTeamMemberInput, void> {
  constructor(private teamRepository: ITeamRepository) {}

  async execute(input: RemoveTeamMemberInput): Promise<void> {
    this.validate(input);
    await this.teamRepository.removeMember(input.teamId, input.memberId);
  }

  private validate(input: RemoveTeamMemberInput): void {
    if (!input.teamId?.trim()) {
      throw new ValidationError('팀 ID는 필수입니다.');
    }

    if (!input.memberId?.trim()) {
      throw new ValidationError('멤버 ID는 필수입니다.');
    }
  }
}
