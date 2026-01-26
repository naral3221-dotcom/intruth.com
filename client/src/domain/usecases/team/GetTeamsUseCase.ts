/**
 * GetTeamsUseCase
 * 팀 목록 조회 Use Case
 */
import type { Team } from '@/types';
import type { ITeamRepository, TeamListParams } from '@/domain/repositories/ITeamRepository';
import type { UseCaseNoInput } from '../UseCase';

export class GetTeamsUseCase implements UseCaseNoInput<Team[]> {
  constructor(
    private teamRepository: ITeamRepository,
    private params?: TeamListParams
  ) {}

  async execute(): Promise<Team[]> {
    return this.teamRepository.findAll(this.params);
  }
}
