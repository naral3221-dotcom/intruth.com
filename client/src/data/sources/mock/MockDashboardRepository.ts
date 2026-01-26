/**
 * Mock Dashboard Repository
 * IDashboardRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
// @ts-nocheck - Mock 파일은 프로덕션에서 사용되지 않음
import type {
  IDashboardRepository,
  DashboardFilters,
  DashboardData,
  ActivityListParams,
  ProjectProgress
} from '@/domain/repositories/IDashboardRepository';
import type { DashboardStats, TeamProgress, ActivityLog, Task, Project } from '@/types';
import { MockStorage } from './MockStorage';

export class MockDashboardRepository implements IDashboardRepository {
  private storage = MockStorage.getInstance();

  async getDashboardData(filters?: DashboardFilters): Promise<DashboardData> {
    await this.storage.delay(400);

    const [stats, myTasks, recentProjects, teamProgress, recentActivities] = await Promise.all([
      this.getStats(filters),
      this.getMyTasks(),
      this.getRecentProjects(),
      this.getTeamProgress(),
      this.getRecentActivities({ limit: 10 }),
    ]);

    return {
      stats,
      myTasks,
      recentProjects,
      teamProgress,
      recentActivities,
    };
  }

  async getStats(filters?: DashboardFilters): Promise<DashboardStats> {
    await this.storage.delay(200);
    let tasks = [...this.storage.tasks];
    const projects = [...this.storage.projects];

    // 필터 적용
    if (filters?.projectId) {
      tasks = tasks.filter((t) => t.projectId === filters.projectId);
    }

    const now = new Date();

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'DONE').length,
      todoTasks: tasks.filter((t) => t.status === 'TODO').length,
      inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      reviewTasks: tasks.filter((t) => t.status === 'REVIEW').length,
      overdueTasks: tasks.filter((t) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
      ).length,
      completionRate: tasks.length > 0
        ? Math.round((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100)
        : 0,
    };
  }

  async getMyTasks(): Promise<Task[]> {
    await this.storage.delay(200);
    const currentMember = this.storage.getCurrentMember();
    const tasks = this.storage.tasks;

    return tasks
      .filter((t) =>
        t.assignee?.id === currentMember.id ||
        t.assignees?.some((a) => a.id === currentMember.id)
      )
      .filter((t) => t.status !== 'DONE')
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 10);
  }

  async getMyOverdueTasks(): Promise<Task[]> {
    await this.storage.delay(200);
    const currentMember = this.storage.getCurrentMember();
    const tasks = this.storage.tasks;
    const now = new Date();

    return tasks.filter((t) =>
      (t.assignee?.id === currentMember.id ||
        t.assignees?.some((a) => a.id === currentMember.id)) &&
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== 'DONE'
    );
  }

  async getMyUpcomingTasks(days: number = 7): Promise<Task[]> {
    await this.storage.delay(200);
    const currentMember = this.storage.getCurrentMember();
    const tasks = this.storage.tasks;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return tasks.filter((t) =>
      (t.assignee?.id === currentMember.id ||
        t.assignees?.some((a) => a.id === currentMember.id)) &&
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      new Date(t.dueDate) <= futureDate &&
      t.status !== 'DONE'
    );
  }

  async getTeamProgress(): Promise<TeamProgress[]> {
    await this.storage.delay(200);
    const members = this.storage.members;
    const tasks = this.storage.tasks;

    return members.map((member) => {
      const memberTasks = tasks.filter((t) =>
        t.assignee?.id === member.id ||
        t.assignees?.some((a) => a.id === member.id)
      );

      const completedTasks = memberTasks.filter((t) => t.status === 'DONE').length;
      const totalTasks = memberTasks.length;

      return {
        memberId: member.id,
        memberName: member.name,
        avatarUrl: member.avatarUrl,
        totalTasks,
        completedTasks,
        inProgressTasks: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
        progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    });
  }

  async getMemberProgress(memberId: string): Promise<TeamProgress> {
    await this.storage.delay(200);
    const member = this.storage.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    const tasks = this.storage.tasks.filter((t) =>
      t.assignee?.id === memberId ||
      t.assignees?.some((a) => a.id === memberId)
    );

    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const totalTasks = tasks.length;

    return {
      memberId: member.id,
      memberName: member.name,
      avatarUrl: member.avatarUrl,
      totalTasks,
      completedTasks,
      inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  async getRecentActivities(params?: ActivityListParams): Promise<ActivityLog[]> {
    await this.storage.delay(200);
    let activities = [...this.storage.activities];

    if (params?.taskId) {
      activities = activities.filter((a) => a.taskId === params.taskId);
    }
    if (params?.memberId) {
      activities = activities.filter((a) => a.memberId === params.memberId);
    }
    if (params?.projectId) {
      activities = activities.filter((a) => a.task?.project?.id === params.projectId);
    }
    if (params?.action) {
      activities = activities.filter((a) => a.action === params.action);
    }

    // 정렬 (최신순)
    activities.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 페이지네이션
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;

    return activities.slice(offset, offset + limit);
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    await this.storage.delay(200);
    const projects = this.storage.projects;
    const tasks = this.storage.tasks;

    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const completedTasks = projectTasks.filter((t) => t.status === 'DONE').length;
      const totalTasks = projectTasks.length;

      return {
        projectId: project.id,
        projectName: project.name,
        totalTasks,
        completedTasks,
        progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        status: project.status,
      };
    });
  }

  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    await this.storage.delay(200);
    const project = this.storage.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const projectTasks = this.storage.tasks.filter((t) => t.projectId === projectId);
    const completedTasks = projectTasks.filter((t) => t.status === 'DONE').length;
    const totalTasks = projectTasks.length;

    return {
      projectId: project.id,
      projectName: project.name,
      totalTasks,
      completedTasks,
      progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      status: project.status,
    };
  }

  // Private helper method
  private async getRecentProjects(): Promise<Project[]> {
    const projects = [...this.storage.projects];
    return projects
      .sort((a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      )
      .slice(0, 5);
  }
}
