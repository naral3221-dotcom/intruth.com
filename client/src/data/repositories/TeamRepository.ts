/**
 * Team Repository 구현체
 * ITeamRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
 */
import type {
  ITeamRepository,
  CreateTeamDTO,
  UpdateTeamDTO,
  TeamListParams,
  AddTeamMemberDTO,
  TeamStats
} from '@/domain/repositories/ITeamRepository';
import type { Team, TeamMember, TeamMemberRole } from '@/types';
import { TeamApiSource } from '../sources/api/TeamApiSource';

export class TeamRepository implements ITeamRepository {
  constructor(private readonly apiSource: TeamApiSource) {}

  async findAll(params?: TeamListParams): Promise<Team[]> {
    return this.apiSource.list({
      search: params?.search,
      leaderId: params?.leaderId,
    });
  }

  async findById(id: string): Promise<Team> {
    return this.apiSource.get(id);
  }

  async findByLeaderId(leaderId: string): Promise<Team[]> {
    return this.findAll({ leaderId });
  }

  async create(data: CreateTeamDTO): Promise<Team> {
    return this.apiSource.create({
      name: data.name,
      description: data.description,
      color: data.color,
      leaderId: data.leaderId,
    });
  }

  async update(id: string, data: UpdateTeamDTO): Promise<Team> {
    return this.apiSource.update(id, {
      name: data.name,
      description: data.description,
      color: data.color,
      leaderId: data.leaderId,
    });
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.apiSource.getMembers(teamId);
  }

  async addMember(teamId: string, data: AddTeamMemberDTO): Promise<TeamMember> {
    return this.apiSource.addMember(teamId, data.memberId, data.role);
  }

  async updateMemberRole(teamId: string, memberId: string, role: TeamMemberRole): Promise<TeamMember> {
    return this.apiSource.updateMemberRole(teamId, memberId, role);
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    return this.apiSource.removeMember(teamId, memberId);
  }

  async getStats(teamId: string): Promise<TeamStats> {
    return this.apiSource.getStats(teamId);
  }

  async getAllStats(): Promise<TeamStats[]> {
    return this.apiSource.getAllStats();
  }

  async setLeader(teamId: string, memberId: string): Promise<Team> {
    return this.apiSource.setLeader(teamId, memberId);
  }
}
