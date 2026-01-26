/**
 * Dashboard Service
 * 대시보드 관련 비즈니스 로직
 */
import { PrismaClient } from '@prisma/client';

// Output DTOs
export interface DashboardSummary {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  projects: number;
  members: number;
}

export interface MemberProgress {
  id: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  total: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  task: {
    id: string;
    title: string;
    project: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 전체 요약 통계
   */
  async getSummary(): Promise<DashboardSummary> {
    const [totalTasks, tasksByStatus, projectCount, memberCount, overdueCount] =
      await Promise.all([
        this.prisma.task.count(),
        this.prisma.task.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.project.count({ where: { status: 'ACTIVE' } }),
        this.prisma.member.count({ where: { isActive: true } }),
        this.prisma.task.count({
          where: {
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        }),
      ]);

    const stats: DashboardSummary = {
      total: totalTasks,
      todo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      overdue: overdueCount,
      projects: projectCount,
      members: memberCount,
    };

    tasksByStatus.forEach((t) => {
      switch (t.status) {
        case 'TODO':
          stats.todo = t._count.id;
          break;
        case 'IN_PROGRESS':
          stats.inProgress = t._count.id;
          break;
        case 'REVIEW':
          stats.review = t._count.id;
          break;
        case 'DONE':
          stats.done = t._count.id;
          break;
      }
    });

    return stats;
  }

  /**
   * 내 업무 현황 (미완료 업무만)
   */
  async getMyTasks(memberId: string, limit: number = 10) {
    return this.prisma.task.findMany({
      where: {
        assigneeId: memberId,
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true } },
        labels: { include: { label: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: limit,
    });
  }

  /**
   * 내 지연된 업무
   */
  async getMyOverdueTasks(memberId: string) {
    return this.prisma.task.findMany({
      where: {
        assigneeId: memberId,
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * 내 다가오는 업무 (7일 이내)
   */
  async getMyUpcomingTasks(memberId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.prisma.task.findMany({
      where: {
        assigneeId: memberId,
        dueDate: {
          gte: now,
          lte: futureDate,
        },
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * 팀 진행 현황
   */
  async getTeamProgress(): Promise<MemberProgress[]> {
    const members = await this.prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        _count: {
          select: {
            assignedTasks: true,
          },
        },
      },
    });

    const progress = await Promise.all(
      members.map(async (member) => {
        const taskStats = await this.prisma.task.groupBy({
          by: ['status'],
          where: { assigneeId: member.id },
          _count: { id: true },
        });

        const stats = { todo: 0, inProgress: 0, review: 0, done: 0 };
        taskStats.forEach((t) => {
          switch (t.status) {
            case 'TODO':
              stats.todo = t._count.id;
              break;
            case 'IN_PROGRESS':
              stats.inProgress = t._count.id;
              break;
            case 'REVIEW':
              stats.review = t._count.id;
              break;
            case 'DONE':
              stats.done = t._count.id;
              break;
          }
        });

        return {
          id: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
          department: member.department,
          taskStats: stats,
          total: member._count.assignedTasks,
        };
      })
    );

    return progress;
  }

  /**
   * 멤버별 진행 현황
   */
  async getMemberProgress(memberId: string): Promise<MemberProgress | null> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        _count: {
          select: {
            assignedTasks: true,
          },
        },
      },
    });

    if (!member) {
      return null;
    }

    const taskStats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { assigneeId: memberId },
      _count: { id: true },
    });

    const stats = { todo: 0, inProgress: 0, review: 0, done: 0 };
    taskStats.forEach((t) => {
      switch (t.status) {
        case 'TODO':
          stats.todo = t._count.id;
          break;
        case 'IN_PROGRESS':
          stats.inProgress = t._count.id;
          break;
        case 'REVIEW':
          stats.review = t._count.id;
          break;
        case 'DONE':
          stats.done = t._count.id;
          break;
      }
    });

    return {
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      department: member.department,
      taskStats: stats,
      total: member._count.assignedTasks,
    };
  }

  /**
   * 최근 활동 조회
   */
  async getRecentActivities(limit: number = 20): Promise<RecentActivity[]> {
    const activities = await this.prisma.activityLog.findMany({
      include: {
        member: { select: { id: true, name: true, avatarUrl: true } },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities;
  }

  /**
   * 프로젝트별 진행 현황
   */
  async getProjectsProgress() {
    const projects = await this.prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    const progress = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await this.prisma.task.groupBy({
          by: ['status'],
          where: { projectId: project.id },
          _count: { id: true },
        });

        const stats = { todo: 0, inProgress: 0, review: 0, done: 0 };
        taskStats.forEach((t) => {
          switch (t.status) {
            case 'TODO':
              stats.todo = t._count.id;
              break;
            case 'IN_PROGRESS':
              stats.inProgress = t._count.id;
              break;
            case 'REVIEW':
              stats.review = t._count.id;
              break;
            case 'DONE':
              stats.done = t._count.id;
              break;
          }
        });

        const total = project._count.tasks;
        const completionRate = total > 0 ? Math.round((stats.done / total) * 100) : 0;

        return {
          ...project,
          taskStats: stats,
          total,
          completionRate,
        };
      })
    );

    return progress;
  }
}
