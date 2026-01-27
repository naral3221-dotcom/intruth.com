/**
 * Team API Source
 * Team 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { Team, TeamMember, TeamMemberRole } from '@/types';
import type { TeamStats } from '@/domain/repositories/ITeamRepository';

export interface TeamApiListParams {
  search?: string;
  leaderId?: string;
}

export interface TeamApiCreateInput {
  name: string;
  description?: string;
  color: string;
  leaderId?: string;
}

export interface TeamApiUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  leaderId?: string;
}

export class TeamApiSource {
  constructor(private httpClient: HttpClient) {}

  async list(params?: TeamApiListParams): Promise<Team[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.leaderId) searchParams.set('leaderId', params.leaderId);
    const query = searchParams.toString();
    return this.httpClient.get<Team[]>(`/teams${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Team> {
    return this.httpClient.get<Team>(`/teams?id=${id}`);
  }

  async create(data: TeamApiCreateInput): Promise<Team> {
    return this.httpClient.post<Team>('/teams', data);
  }

  async update(id: string, data: TeamApiUpdateInput): Promise<Team> {
    return this.httpClient.put<Team>(`/teams?id=${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/teams?id=${id}`);
  }

  // Members
  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.httpClient.get<TeamMember[]>(`/teams?id=${teamId}&action=members`);
  }

  async addMember(teamId: string, memberId: string, role?: TeamMemberRole): Promise<TeamMember> {
    return this.httpClient.post<TeamMember>(`/teams?id=${teamId}&action=member`, {
      memberId,
      role
    });
  }

  async updateMemberRole(teamId: string, memberId: string, role: TeamMemberRole): Promise<TeamMember> {
    return this.httpClient.patch<TeamMember>(
      `/teams?id=${teamId}&action=member&memberId=${memberId}`,
      { role }
    );
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.httpClient.delete<void>(
      `/teams?id=${teamId}&action=member&memberId=${memberId}`
    );
  }

  // Stats
  async getStats(teamId: string): Promise<TeamStats> {
    return this.httpClient.get<TeamStats>(`/teams?id=${teamId}&action=stats`);
  }

  async getAllStats(): Promise<TeamStats[]> {
    return this.httpClient.get<TeamStats[]>('/teams?action=stats');
  }

  // Leader
  async setLeader(teamId: string, memberId: string): Promise<Team> {
    return this.httpClient.patch<Team>(`/teams?id=${teamId}`, { leaderId: memberId });
  }
}
