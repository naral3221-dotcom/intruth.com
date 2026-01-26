/**
 * Activity Log Service
 * 활동 로그 기록 관련 비즈니스 로직
 */
import { PrismaClient } from '@prisma/client';
import type { TransactionClient } from '../shared/database.js';

export interface CreateActivityLogInput {
  taskId: string;
  memberId: string;
  action: 'created' | 'updated' | 'moved' | 'deleted' | 'commented';
  details?: Record<string, unknown>;
}

export class ActivityLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 활동 로그 생성
   */
  async create(input: CreateActivityLogInput) {
    return this.prisma.activityLog.create({
      data: {
        taskId: input.taskId,
        memberId: input.memberId,
        action: input.action,
        details: input.details ? JSON.stringify(input.details) : null,
      },
      include: {
        member: {
          select: { id: true, name: true, avatarUrl: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * 트랜잭션 내에서 활동 로그 생성
   */
  async createWithTransaction(
    tx: TransactionClient,
    input: CreateActivityLogInput
  ) {
    return tx.activityLog.create({
      data: {
        taskId: input.taskId,
        memberId: input.memberId,
        action: input.action,
        details: input.details ? JSON.stringify(input.details) : null,
      },
    });
  }

  /**
   * 업무별 활동 로그 조회
   */
  async findByTaskId(taskId: string, limit: number = 50) {
    return this.prisma.activityLog.findMany({
      where: { taskId },
      include: {
        member: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 최근 활동 로그 조회
   */
  async findRecent(params: {
    limit?: number;
    memberId?: string;
    projectId?: string;
  }) {
    const { limit = 50, memberId, projectId } = params;

    return this.prisma.activityLog.findMany({
      where: {
        ...(memberId && { memberId }),
        ...(projectId && { task: { projectId } }),
      },
      include: {
        member: {
          select: { id: true, name: true, avatarUrl: true },
        },
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
  }
}
