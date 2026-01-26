/**
 * Mock Project Repository
 * IProjectRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
import type {
  IProjectRepository,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectListParams,
  AddProjectMemberDTO
} from '@/domain/repositories/IProjectRepository';
import type { Project, ProjectMember, TaskLabel, Team, Member } from '@/types';
import { MockStorage } from './MockStorage';

export class MockProjectRepository implements IProjectRepository {
  private storage = MockStorage.getInstance();

  async findAll(params?: ProjectListParams): Promise<Project[]> {
    await this.storage.delay(300);
    let projects = [...this.storage.projects];

    if (params?.status) {
      projects = projects.filter((p) => p.status === params.status);
    }
    if (params?.teamId) {
      projects = projects.filter((p) =>
        p.teamId === params.teamId ||
        p.teamIds?.includes(params.teamId!)
      );
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      projects = projects.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    return projects;
  }

  async findById(id: string): Promise<Project> {
    await this.storage.delay(200);
    const project = this.storage.projects.find((p) => p.id === id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }
    return project;
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.findAll({ teamId });
  }

  async create(data: CreateProjectDTO): Promise<Project> {
    await this.storage.delay(300);

    const projects = this.storage.projects;
    const teams = this.storage.teams;
    const currentMember = this.storage.getCurrentMember();

    // 팀 정보 가져오기
    let team: Team | undefined;
    let teamsData: Team[] | undefined;

    if (data.teamId) {
      team = teams.find((t) => t.id === data.teamId);
    }
    if (data.teamIds && data.teamIds.length > 0) {
      teamsData = data.teamIds
        .map((id) => teams.find((t) => t.id === id))
        .filter((t): t is Team => t !== undefined);
    }

    const newProject: Project = {
      id: this.storage.generateId('project'),
      name: data.name,
      description: data.description,
      status: 'ACTIVE',
      startDate: data.startDate,
      endDate: data.endDate,
      owner: currentMember,
      teamId: data.teamId,
      team: team ? { id: team.id, name: team.name, color: team.color } : undefined,
      teamIds: data.teamIds,
      teams: teamsData,
      teamAssignments: data.teamAssignments?.map((ta) => ({
        teamId: ta.teamId,
        team: teams.find((t) => t.id === ta.teamId),
        assigneeIds: ta.assigneeIds,
        assignees: ta.assigneeIds
          .map((id) => this.storage.members.find((m) => m.id === id))
          .filter((m): m is Member => m !== undefined),
      })),
      members: [
        {
          id: this.storage.generateId('pm'),
          projectId: '',
          memberId: currentMember.id,
          role: 'OWNER',
          member: currentMember,
          joinedAt: new Date().toISOString(),
        },
      ],
      labels: [],
      _count: { tasks: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newProject.members![0].projectId = newProject.id;
    projects.push(newProject);
    this.storage.projects = projects;

    return newProject;
  }

  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const teams = this.storage.teams;
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 팀 정보 업데이트
    let teamsData: Team[] | undefined;
    if (data.teamIds) {
      teamsData = data.teamIds
        .map((teamId) => teams.find((t) => t.id === teamId))
        .filter((t): t is Team => t !== undefined);
    }

    projects[index] = {
      ...projects[index],
      ...data,
      teams: teamsData ?? projects[index].teams,
      teamAssignments: data.teamAssignments?.map((ta) => ({
        teamId: ta.teamId,
        team: teams.find((t) => t.id === ta.teamId),
        assigneeIds: ta.assigneeIds,
        assignees: ta.assigneeIds
          .map((memberId) => this.storage.members.find((m) => m.id === memberId))
          .filter((m): m is Member => m !== undefined),
      })) ?? projects[index].teamAssignments,
      updatedAt: new Date().toISOString(),
    };

    this.storage.projects = projects;
    return projects[index];
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    projects.splice(index, 1);
    this.storage.projects = projects;

    // 관련 태스크도 삭제
    const tasks = this.storage.tasks.filter((t) => t.projectId !== id);
    this.storage.tasks = tasks;
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    await this.storage.delay(200);
    const project = await this.findById(projectId);
    return project.members || [];
  }

  async addMember(projectId: string, data: AddProjectMemberDTO): Promise<ProjectMember> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const members = this.storage.members;
    const index = projects.findIndex((p) => p.id === projectId);

    if (index === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const member = members.find((m) => m.id === data.memberId);
    if (!member) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    const newProjectMember: ProjectMember = {
      id: this.storage.generateId('pm'),
      projectId,
      memberId: data.memberId,
      role: data.role || 'VIEWER',
      member,
      joinedAt: new Date().toISOString(),
    };

    if (!projects[index].members) {
      projects[index].members = [];
    }
    projects[index].members!.push(newProjectMember);
    this.storage.projects = projects;

    return newProjectMember;
  }

  async updateMemberRole(projectId: string, memberId: string, role: ProjectMember['role']): Promise<ProjectMember> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const memberIndex = projects[projectIndex].members?.findIndex((m) => m.memberId === memberId);
    if (memberIndex === undefined || memberIndex === -1) {
      throw new Error('프로젝트 멤버를 찾을 수 없습니다.');
    }

    projects[projectIndex].members![memberIndex].role = role;
    this.storage.projects = projects;

    return projects[projectIndex].members![memberIndex];
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const memberIndex = projects[projectIndex].members?.findIndex((m) => m.memberId === memberId);
    if (memberIndex === undefined || memberIndex === -1) {
      throw new Error('프로젝트 멤버를 찾을 수 없습니다.');
    }

    projects[projectIndex].members!.splice(memberIndex, 1);
    this.storage.projects = projects;
  }

  async getLabels(projectId: string): Promise<TaskLabel[]> {
    await this.storage.delay(200);
    const project = await this.findById(projectId);
    return project.labels || [];
  }

  async addLabel(projectId: string, data: Omit<TaskLabel, 'id' | 'projectId'>): Promise<TaskLabel> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const index = projects.findIndex((p) => p.id === projectId);

    if (index === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const newLabel: TaskLabel = {
      id: this.storage.generateId('label'),
      projectId,
      ...data,
    };

    if (!projects[index].labels) {
      projects[index].labels = [];
    }
    projects[index].labels!.push(newLabel);
    this.storage.projects = projects;

    return newLabel;
  }

  async updateLabel(projectId: string, labelId: string, data: Partial<TaskLabel>): Promise<TaskLabel> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const labelIndex = projects[projectIndex].labels?.findIndex((l) => l.id === labelId);
    if (labelIndex === undefined || labelIndex === -1) {
      throw new Error('라벨을 찾을 수 없습니다.');
    }

    projects[projectIndex].labels![labelIndex] = {
      ...projects[projectIndex].labels![labelIndex],
      ...data,
    };
    this.storage.projects = projects;

    return projects[projectIndex].labels![labelIndex];
  }

  async removeLabel(projectId: string, labelId: string): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const labelIndex = projects[projectIndex].labels?.findIndex((l) => l.id === labelId);
    if (labelIndex === undefined || labelIndex === -1) {
      throw new Error('라벨을 찾을 수 없습니다.');
    }

    projects[projectIndex].labels!.splice(labelIndex, 1);
    this.storage.projects = projects;
  }

  async getTeams(projectId: string): Promise<Team[]> {
    await this.storage.delay(200);
    const project = await this.findById(projectId);
    return project.teams || (project.team ? [project.team as Team] : []);
  }

  async addTeam(projectId: string, teamId: string, assigneeIds?: string[]): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const teams = this.storage.teams;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    if (!projects[projectIndex].teamIds) {
      projects[projectIndex].teamIds = [];
    }
    if (!projects[projectIndex].teams) {
      projects[projectIndex].teams = [];
    }

    projects[projectIndex].teamIds!.push(teamId);
    projects[projectIndex].teams!.push(team);

    if (assigneeIds && assigneeIds.length > 0) {
      if (!projects[projectIndex].teamAssignments) {
        projects[projectIndex].teamAssignments = [];
      }
      projects[projectIndex].teamAssignments!.push({
        teamId,
        team,
        assigneeIds,
        assignees: assigneeIds
          .map((id) => this.storage.members.find((m) => m.id === id))
          .filter((m): m is Member => m !== undefined),
      });
    }

    this.storage.projects = projects;
  }

  async removeTeam(projectId: string, teamId: string): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    projects[projectIndex].teamIds = projects[projectIndex].teamIds?.filter((id) => id !== teamId);
    projects[projectIndex].teams = projects[projectIndex].teams?.filter((t) => t.id !== teamId);
    projects[projectIndex].teamAssignments = projects[projectIndex].teamAssignments?.filter(
      (ta) => ta.teamId !== teamId
    );

    this.storage.projects = projects;
  }

  async updateTeamAssignees(projectId: string, teamId: string, assigneeIds: string[]): Promise<void> {
    await this.storage.delay(200);

    const projects = this.storage.projects;
    const teams = this.storage.teams;
    const projectIndex = projects.findIndex((p) => p.id === projectId);

    if (projectIndex === -1) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    if (!projects[projectIndex].teamAssignments) {
      projects[projectIndex].teamAssignments = [];
    }

    const assignmentIndex = projects[projectIndex].teamAssignments!.findIndex(
      (ta) => ta.teamId === teamId
    );

    const assignees = assigneeIds
      .map((id) => this.storage.members.find((m) => m.id === id))
      .filter((m): m is Member => m !== undefined);

    if (assignmentIndex !== -1) {
      projects[projectIndex].teamAssignments![assignmentIndex] = {
        teamId,
        team,
        assigneeIds,
        assignees,
      };
    } else {
      projects[projectIndex].teamAssignments!.push({
        teamId,
        team,
        assigneeIds,
        assignees,
      });
    }

    this.storage.projects = projects;
  }
}
