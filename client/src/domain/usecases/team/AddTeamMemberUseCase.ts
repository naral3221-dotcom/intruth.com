/**
 * AddTeamMemberUseCase
 * 팀 멤버 추가 Use Case
 */
import type { TeamMember } from '@/types';
import type { ITeamRepository, AddTeamMemberDTO } from '@/domain/repositories/ITeamRepository';
import type { UseCase } from '../UseCase';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface AddTeamMemberInput {
  teamId: string;
  data: AddTeamMemberDTO;
}

export class AddTeamMemberUseCase implements UseCase<AddTeamMemberInput, TeamMember> {
  constructor(private teamRepository: ITeamRepository) {}

  async execute(input: AddTeamMemberInput): Promise<TeamMember> {
    this.validate(input);
    return this.teamRepository.addMember(input.teamId, input.data);
  }

  private validate(input: AddTeamMemberInput): void {
    if (!input.teamId?.trim()) {
      throw new ValidationError('팀 ID는 필수입니다.');
    }

    if (!input.data.memberId?.trim()) {
      throw new ValidationError('멤버 ID는 필수입니다.');
    }
  }
}
