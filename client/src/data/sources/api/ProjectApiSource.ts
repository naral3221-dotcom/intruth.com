/**
 * Project API Source
 * Project 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { Project, ProjectMember, TaskLabel, Team } from '@/types';

export interface ProjectApiListParams {
  status?: string;
  teamId?: string;
}

export interface TeamAssignmentInput {
  teamId: string;
  assigneeIds: string[];
}

export interface ProjectApiCreateInput {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teamId?: string;
  teamIds?: string[];
  teamAssignments?: TeamAssignmentInput[];
}

export interface ProjectApiUpdateInput {
  name?: string;
  description?: string;
  status?: Project['status'];
  startDate?: string;
  endDate?: string;
  teamIds?: string[];
  teamAssignments?: TeamAssignmentInput[];
}

export class ProjectApiSource {
  constructor(private httpClient: HttpClient) {}

  async list(params?: ProjectApiListParams): Promise<Project[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.teamId) searchParams.set('teamId', params.teamId);
    const query = searchParams.toString();
    return this.httpClient.get<Project[]>(`/projects.php${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Project> {
    return this.httpClient.get<Project>(`/projects.php?id=${id}`);
  }

  async create(data: ProjectApiCreateInput): Promise<Project> {
    return this.httpClient.post<Project>('/projects.php', data);
  }

  async update(id: string, data: ProjectApiUpdateInput): Promise<Project> {
    return this.httpClient.put<Project>(`/projects.php?id=${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/projects.php?id=${id}`);
  }

  // Members
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    return this.httpClient.get<ProjectMember[]>(`/projects.php?id=${projectId}&action=members`);
  }

  async addMember(projectId: string, memberId: string, role?: string): Promise<ProjectMember> {
    return this.httpClient.post<ProjectMember>(`/projects.php?id=${projectId}&action=member`, {
      memberId,
      role
    });
  }

  async updateMemberRole(projectId: string, memberId: string, role: string): Promise<ProjectMember> {
    return this.httpClient.patch<ProjectMember>(
      `/projects.php?id=${projectId}&action=member&memberId=${memberId}`,
      { role }
    );
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await this.httpClient.delete<void>(
      `/projects.php?id=${projectId}&action=member&memberId=${memberId}`
    );
  }

  // Labels
  async getLabels(projectId: string): Promise<TaskLabel[]> {
    return this.httpClient.get<TaskLabel[]>(`/projects.php?id=${projectId}&action=labels`);
  }

  async addLabel(projectId: string, data: { name: string; color: string }): Promise<TaskLabel> {
    return this.httpClient.post<TaskLabel>(`/projects.php?id=${projectId}&action=label`, data);
  }

  async updateLabel(projectId: string, labelId: string, data: Partial<TaskLabel>): Promise<TaskLabel> {
    return this.httpClient.patch<TaskLabel>(
      `/projects.php?id=${projectId}&action=label&labelId=${labelId}`,
      data
    );
  }

  async removeLabel(projectId: string, labelId: string): Promise<void> {
    await this.httpClient.delete<void>(
      `/projects.php?id=${projectId}&action=label&labelId=${labelId}`
    );
  }

  // Teams
  async getTeams(projectId: string): Promise<Team[]> {
    return this.httpClient.get<Team[]>(`/projects.php?id=${projectId}&action=teams`);
  }

  async addTeam(projectId: string, teamId: string, assigneeIds?: string[]): Promise<void> {
    await this.httpClient.post<void>(`/projects.php?id=${projectId}&action=team`, {
      teamId,
      assigneeIds
    });
  }

  async removeTeam(projectId: string, teamId: string): Promise<void> {
    await this.httpClient.delete<void>(
      `/projects.php?id=${projectId}&action=team&teamId=${teamId}`
    );
  }

  async updateTeamAssignees(projectId: string, teamId: string, assigneeIds: string[]): Promise<void> {
    await this.httpClient.patch<void>(
      `/projects.php?id=${projectId}&action=team&teamId=${teamId}`,
      { assigneeIds }
    );
  }
}
