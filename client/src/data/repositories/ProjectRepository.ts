/**
 * Project Repository 구현체
 * IProjectRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
 */
import type {
  IProjectRepository,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectListParams,
  AddProjectMemberDTO
} from '@/domain/repositories/IProjectRepository';
import type { Project, ProjectMember, TaskLabel, Team } from '@/types';
import { ProjectApiSource } from '../sources/api/ProjectApiSource';

export class ProjectRepository implements IProjectRepository {
  constructor(private readonly apiSource: ProjectApiSource) {}

  async findAll(params?: ProjectListParams): Promise<Project[]> {
    return this.apiSource.list({
      status: params?.status,
      teamId: params?.teamId,
    });
  }

  async findById(id: string): Promise<Project> {
    return this.apiSource.get(id);
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.findAll({ teamId });
  }

  async create(data: CreateProjectDTO): Promise<Project> {
    return this.apiSource.create({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      teamId: data.teamId,
      teamIds: data.teamIds,
      teamAssignments: data.teamAssignments,
    });
  }

  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    return this.apiSource.update(id, {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      teamIds: data.teamIds,
      teamAssignments: data.teamAssignments,
    });
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    return this.apiSource.getMembers(projectId);
  }

  async addMember(projectId: string, data: AddProjectMemberDTO): Promise<ProjectMember> {
    return this.apiSource.addMember(projectId, data.memberId, data.role);
  }

  async updateMemberRole(projectId: string, memberId: string, role: ProjectMember['role']): Promise<ProjectMember> {
    return this.apiSource.updateMemberRole(projectId, memberId, role);
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    return this.apiSource.removeMember(projectId, memberId);
  }

  async getLabels(projectId: string): Promise<TaskLabel[]> {
    return this.apiSource.getLabels(projectId);
  }

  async addLabel(projectId: string, data: Omit<TaskLabel, 'id' | 'projectId'>): Promise<TaskLabel> {
    return this.apiSource.addLabel(projectId, data);
  }

  async updateLabel(projectId: string, labelId: string, data: Partial<TaskLabel>): Promise<TaskLabel> {
    return this.apiSource.updateLabel(projectId, labelId, data);
  }

  async removeLabel(projectId: string, labelId: string): Promise<void> {
    return this.apiSource.removeLabel(projectId, labelId);
  }

  async getTeams(projectId: string): Promise<Team[]> {
    return this.apiSource.getTeams(projectId);
  }

  async addTeam(projectId: string, teamId: string, assigneeIds?: string[]): Promise<void> {
    return this.apiSource.addTeam(projectId, teamId, assigneeIds);
  }

  async removeTeam(projectId: string, teamId: string): Promise<void> {
    return this.apiSource.removeTeam(projectId, teamId);
  }

  async updateTeamAssignees(projectId: string, teamId: string, assigneeIds: string[]): Promise<void> {
    return this.apiSource.updateTeamAssignees(projectId, teamId, assigneeIds);
  }
}
