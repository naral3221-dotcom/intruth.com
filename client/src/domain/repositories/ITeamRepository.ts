/**
 * Team Repository 인터페이스
 * 팀 데이터 접근을 위한 추상화 계층
 */
import type { Team, TeamMember, TeamMemberRole, Member } from '@/types';

// DTO (Data Transfer Objects)
export interface CreateTeamDTO {
  name: string;
  description?: string;
  color: string;
  leaderId?: string;
}

export interface UpdateTeamDTO {
  name?: string;
  description?: string;
  color?: string;
  leaderId?: string;
}

export interface TeamListParams {
  search?: string;
  leaderId?: string;
}

export interface AddTeamMemberDTO {
  memberId: string;
  role?: TeamMemberRole;
}

export interface TeamStats {
  teamId: string;
  memberCount: number;
  projectCount: number;
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    total: number;
  };
}

// Repository 인터페이스
export interface ITeamRepository {
  // Query methods (조회)
  findAll(params?: TeamListParams): Promise<Team[]>;
  findById(id: string): Promise<Team>;
  findByLeaderId(leaderId: string): Promise<Team[]>;

  // Command methods (변경)
  create(data: CreateTeamDTO): Promise<Team>;
  update(id: string, data: UpdateTeamDTO): Promise<Team>;
  delete(id: string): Promise<void>;

  // Member methods (멤버 관리)
  getMembers(teamId: string): Promise<TeamMember[]>;
  addMember(teamId: string, data: AddTeamMemberDTO): Promise<TeamMember>;
  updateMemberRole(teamId: string, memberId: string, role: TeamMemberRole): Promise<TeamMember>;
  removeMember(teamId: string, memberId: string): Promise<void>;

  // Stats methods (통계)
  getStats(teamId: string): Promise<TeamStats>;
  getAllStats(): Promise<TeamStats[]>;

  // Leader methods (팀장 관련)
  setLeader(teamId: string, memberId: string): Promise<Team>;
}
