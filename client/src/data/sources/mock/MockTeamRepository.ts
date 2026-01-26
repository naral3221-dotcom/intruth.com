/**
 * Mock Team Repository
 * ITeamRepository 인터페이스를 구현하여 Mock 데이터 제공
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
import { MockStorage } from './MockStorage';

export class MockTeamRepository implements ITeamRepository {
  private storage = MockStorage.getInstance();

  async findAll(params?: TeamListParams): Promise<Team[]> {
    await this.storage.delay(300);
    let teams = [...this.storage.teams];

    if (params?.leaderId) {
      teams = teams.filter((t) => t.leaderId === params.leaderId);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      teams = teams.filter((t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    // 팀에 멤버 수 추가
    teams = teams.map((team) => ({
      ...team,
      _count: {
        members: this.storage.teamMembers.filter((tm) => tm.teamId === team.id).length,
      },
    }));

    return teams;
  }

  async findById(id: string): Promise<Team> {
    await this.storage.delay(200);
    const team = this.storage.teams.find((t) => t.id === id);
    if (!team) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    return {
      ...team,
      _count: {
        members: this.storage.teamMembers.filter((tm) => tm.teamId === id).length,
      },
    };
  }

  async findByLeaderId(leaderId: string): Promise<Team[]> {
    return this.findAll({ leaderId });
  }

  async create(data: CreateTeamDTO): Promise<Team> {
    await this.storage.delay(300);
    const teams = this.storage.teams;
    const members = this.storage.members;

    const leader = data.leaderId
      ? members.find((m) => m.id === data.leaderId)
      : undefined;

    const newTeam: Team = {
      id: this.storage.generateId('team'),
      name: data.name,
      description: data.description,
      color: data.color,
      leaderId: data.leaderId,
      leader,
      _count: { members: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    teams.push(newTeam);
    this.storage.teams = teams;

    return newTeam;
  }

  async update(id: string, data: UpdateTeamDTO): Promise<Team> {
    await this.storage.delay(200);
    const teams = this.storage.teams;
    const members = this.storage.members;
    const index = teams.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    // 리더 변경 처리
    let leader = teams[index].leader;
    if (data.leaderId !== undefined) {
      leader = data.leaderId
        ? members.find((m) => m.id === data.leaderId)
        : undefined;
    }

    teams[index] = {
      ...teams[index],
      ...data,
      leader,
      updatedAt: new Date().toISOString(),
    };

    this.storage.teams = teams;
    return teams[index];
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);
    const teams = this.storage.teams;
    const index = teams.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    teams.splice(index, 1);
    this.storage.teams = teams;

    // 팀 멤버도 삭제
    const teamMembers = this.storage.teamMembers.filter((tm) => tm.teamId !== id);
    this.storage.teamMembers = teamMembers;
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    await this.storage.delay(200);
    const teamMembers = this.storage.teamMembers.filter((tm) => tm.teamId === teamId);
    const members = this.storage.members;

    return teamMembers.map((tm) => ({
      ...tm,
      member: members.find((m) => m.id === tm.memberId),
    }));
  }

  async addMember(teamId: string, data: AddTeamMemberDTO): Promise<TeamMember> {
    await this.storage.delay(200);
    const teamMembers = this.storage.teamMembers;
    const members = this.storage.members;

    // 이미 팀에 있는지 확인
    const existing = teamMembers.find(
      (tm) => tm.teamId === teamId && tm.memberId === data.memberId
    );
    if (existing) {
      throw new Error('이미 팀에 소속된 멤버입니다.');
    }

    const member = members.find((m) => m.id === data.memberId);
    if (!member) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    const newTeamMember: TeamMember = {
      id: this.storage.generateId('team-member'),
      teamId,
      memberId: data.memberId,
      role: data.role || 'MEMBER',
      member,
      createdAt: new Date().toISOString(),
    };

    teamMembers.push(newTeamMember);
    this.storage.teamMembers = teamMembers;

    return newTeamMember;
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: TeamMemberRole
  ): Promise<TeamMember> {
    await this.storage.delay(200);
    const teamMembers = this.storage.teamMembers;
    const index = teamMembers.findIndex(
      (tm) => tm.teamId === teamId && tm.memberId === memberId
    );

    if (index === -1) {
      throw new Error('팀 멤버를 찾을 수 없습니다.');
    }

    teamMembers[index] = {
      ...teamMembers[index],
      role,
    };

    this.storage.teamMembers = teamMembers;
    return teamMembers[index];
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.storage.delay(200);
    const teamMembers = this.storage.teamMembers;
    const index = teamMembers.findIndex(
      (tm) => tm.teamId === teamId && tm.memberId === memberId
    );

    if (index === -1) {
      throw new Error('팀 멤버를 찾을 수 없습니다.');
    }

    teamMembers.splice(index, 1);
    this.storage.teamMembers = teamMembers;
  }

  async getStats(teamId: string): Promise<TeamStats> {
    await this.storage.delay(200);
    const teamMembers = this.storage.teamMembers.filter((tm) => tm.teamId === teamId);
    const tasks = this.storage.tasks;
    const projects = this.storage.projects;

    // 팀 멤버들의 업무 통계
    const memberIds = teamMembers.map((tm) => tm.memberId);
    const teamTasks = tasks.filter((t) =>
      t.assignee?.id && memberIds.includes(t.assignee.id) ||
      t.assignees?.some((a) => memberIds.includes(a.id))
    );

    // 팀 프로젝트 수 (팀장이 속한 프로젝트 또는 팀 멤버가 담당한 프로젝트)
    const teamProjectIds = new Set(teamTasks.map((t) => t.projectId).filter(Boolean));

    return {
      teamId,
      memberCount: teamMembers.length,
      projectCount: teamProjectIds.size,
      taskStats: {
        todo: teamTasks.filter((t) => t.status === 'TODO').length,
        inProgress: teamTasks.filter((t) => t.status === 'IN_PROGRESS').length,
        review: teamTasks.filter((t) => t.status === 'REVIEW').length,
        done: teamTasks.filter((t) => t.status === 'DONE').length,
        total: teamTasks.length,
      },
    };
  }

  async getAllStats(): Promise<TeamStats[]> {
    await this.storage.delay(300);
    const teams = this.storage.teams;
    const stats: TeamStats[] = [];

    for (const team of teams) {
      const teamStats = await this.getStats(team.id);
      stats.push(teamStats);
    }

    return stats;
  }

  async setLeader(teamId: string, memberId: string): Promise<Team> {
    return this.update(teamId, { leaderId: memberId });
  }
}
