/**
 * Task Service
 * 업무 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { ActivityLogService } from './ActivityLogService.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

// Input DTOs
export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  reporterId: string;
  startDate?: Date;
  dueDate?: Date;
  parentId?: string;
  folderUrl?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  folderUrl?: string;
}

export interface UpdateTaskStatusInput {
  status: string;
  order?: number;
}

export interface TaskListParams {
  projectId?: string;
  status?: string;
  assigneeId?: string;
}

export class TaskService {
  private readonly defaultInclude = {
    assignee: { select: { id: true, name: true, avatarUrl: true } },
    reporter: { select: { id: true, name: true, avatarUrl: true } },
    labels: { include: { label: true } },
    _count: { select: { subtasks: true, comments: true } },
  };

  constructor(
    private prisma: PrismaClient,
    private activityLogService: ActivityLogService
  ) {}

  /**
   * 업무 목록 조회
   */
  async findAll(params: TaskListParams) {
    const where: Prisma.TaskWhereInput = {};
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;
    if (params.assigneeId) where.assigneeId = params.assigneeId;

    return this.prisma.task.findMany({
      where,
      include: this.defaultInclude,
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * 업무 상세 조회
   */
  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude,
        project: { select: { id: true, name: true } },
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            position: true,
          },
        },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return task;
  }

  /**
   * 업무 생성
   */
  async create(input: CreateTaskInput) {
    // 유효성 검증
    if (!input.title?.trim()) {
      throw new ValidationError('업무 제목은 필수입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 마지막 순서 가져오기
      const lastTask = await tx.task.findFirst({
        where: { projectId: input.projectId, status: 'TODO' },
        orderBy: { order: 'desc' },
      });

      const task = await tx.task.create({
        data: {
          projectId: input.projectId,
          title: input.title.trim(),
          description: input.description,
          priority: input.priority || 'MEDIUM',
          assigneeId: input.assigneeId,
          reporterId: input.reporterId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          parentId: input.parentId,
          folderUrl: input.folderUrl,
          order: (lastTask?.order || 0) + 1,
        },
        include: this.defaultInclude,
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId: input.reporterId,
        action: 'created',
        details: { title: task.title },
      });

      return task;
    });
  }

  /**
   * 업무 수정
   */
  async update(id: string, input: UpdateTaskInput, memberId: string) {
    // 업무 존재 확인
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          title: input.title?.trim(),
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
          actualHours: input.actualHours,
          folderUrl: input.folderUrl,
        },
        include: this.defaultInclude,
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId,
        action: 'updated',
        details: { title: task.title },
      });

      return task;
    });
  }

  /**
   * 업무 상태 변경
   */
  async updateStatus(id: string, input: UpdateTaskStatusInput, memberId: string) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          status: input.status,
          order: input.order ?? existingTask.order,
        },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId: task.id,
        memberId,
        action: 'moved',
        details: {
          from: existingTask.status,
          to: input.status,
        },
      });

      return task;
    });
  }

  /**
   * 업무 순서 변경
   */
  async updateOrder(id: string, order: number) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.prisma.task.update({
      where: { id },
      data: { order },
      include: this.defaultInclude,
    });
  }

  /**
   * 업무 삭제
   */
  async delete(id: string) {
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    await this.prisma.task.delete({ where: { id } });
  }

  /**
   * 여러 업무 일괄 삭제
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) {
      throw new ValidationError('삭제할 업무 ID가 없습니다.');
    }

    const result = await this.prisma.task.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }

  /**
   * 여러 업무 일괄 수정
   */
  async updateMany(ids: string[], input: UpdateTaskInput, memberId: string) {
    if (!ids || ids.length === 0) {
      throw new ValidationError('수정할 업무 ID가 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 업무 일괄 수정
      await tx.task.updateMany({
        where: { id: { in: ids } },
        data: {
          title: input.title?.trim(),
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
          actualHours: input.actualHours,
          folderUrl: input.folderUrl,
        },
      });

      // 수정된 업무 목록 조회
      const updatedTasks = await tx.task.findMany({
        where: { id: { in: ids } },
        include: this.defaultInclude,
      });

      // 각 업무에 대해 활동 로그 기록
      for (const task of updatedTasks) {
        await this.activityLogService.createWithTransaction(tx, {
          taskId: task.id,
          memberId,
          action: 'updated',
          details: { title: task.title, batchUpdate: true },
        });
      }

      return updatedTasks;
    });
  }

  /**
   * 댓글 추가
   */
  async addComment(taskId: string, authorId: string, content: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    if (!content?.trim()) {
      throw new ValidationError('댓글 내용은 필수입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId,
          authorId,
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // 활동 로그 기록
      await this.activityLogService.createWithTransaction(tx, {
        taskId,
        memberId: authorId,
        action: 'commented',
        details: { commentId: comment.id },
      });

      return comment;
    });
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(taskId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new NotFoundError('댓글을 찾을 수 없습니다.');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  /**
   * 업무 활동 로그 조회
   */
  async getActivities(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('업무를 찾을 수 없습니다.');
    }

    return this.activityLogService.findByTaskId(taskId);
  }
}
