/**
 * Project Repository 인터페이스
 * 프로젝트 데이터 접근을 위한 추상화 계층
 */
import type { Project, ProjectMember, TaskLabel, Team, Member } from '@/types';

// DTO (Data Transfer Objects)
export interface TeamAssignmentDTO {
  teamId: string;
  assigneeIds: string[];
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teamId?: string;
  teamIds?: string[];
  teamAssignments?: TeamAssignmentDTO[];
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  status?: Project['status'];
  startDate?: string;
  endDate?: string;
  teamIds?: string[];
  teamAssignments?: TeamAssignmentDTO[];
}

export interface ProjectListParams {
  status?: Project['status'];
  teamId?: string;
  search?: string;
}

export interface AddProjectMemberDTO {
  memberId: string;
  role?: ProjectMember['role'];
}

// Repository 인터페이스
export interface IProjectRepository {
  // Query methods (조회)
  findAll(params?: ProjectListParams): Promise<Project[]>;
  findById(id: string): Promise<Project>;
  findByTeamId(teamId: string): Promise<Project[]>;

  // Command methods (변경)
  create(data: CreateProjectDTO): Promise<Project>;
  update(id: string, data: UpdateProjectDTO): Promise<Project>;
  delete(id: string): Promise<void>;

  // Member methods (멤버 관리)
  getMembers(projectId: string): Promise<ProjectMember[]>;
  addMember(projectId: string, data: AddProjectMemberDTO): Promise<ProjectMember>;
  updateMemberRole(projectId: string, memberId: string, role: ProjectMember['role']): Promise<ProjectMember>;
  removeMember(projectId: string, memberId: string): Promise<void>;

  // Label methods (라벨 관리)
  getLabels(projectId: string): Promise<TaskLabel[]>;
  addLabel(projectId: string, data: Omit<TaskLabel, 'id' | 'projectId'>): Promise<TaskLabel>;
  updateLabel(projectId: string, labelId: string, data: Partial<TaskLabel>): Promise<TaskLabel>;
  removeLabel(projectId: string, labelId: string): Promise<void>;

  // Team methods (팀 연결)
  getTeams(projectId: string): Promise<Team[]>;
  addTeam(projectId: string, teamId: string, assigneeIds?: string[]): Promise<void>;
  removeTeam(projectId: string, teamId: string): Promise<void>;
  updateTeamAssignees(projectId: string, teamId: string, assigneeIds: string[]): Promise<void>;
}
