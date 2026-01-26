/**
 * Task Repository 구현체
 * ITaskRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
 */
import type {
  ITaskRepository,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskListParams,
  UpdateTaskStatusDTO
} from '@/domain/repositories/ITaskRepository';
import type { Task, Comment, ActivityLog } from '@/types';
import { TaskApiSource } from '../sources/api/TaskApiSource';

export class TaskRepository implements ITaskRepository {
  constructor(private readonly apiSource: TaskApiSource) {}

  async findAll(params?: TaskListParams): Promise<Task[]> {
    return this.apiSource.list(params);
  }

  async findById(id: string): Promise<Task> {
    return this.apiSource.get(id);
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return this.findAll({ projectId });
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    return this.findAll({ assigneeId });
  }

  async create(data: CreateTaskDTO): Promise<Task> {
    return this.apiSource.create({
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeIds: data.assigneeIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
      folderUrl: data.folderUrl,
      parentId: data.parentId,
    });
  }

  async update(id: string, data: UpdateTaskDTO): Promise<Task> {
    return this.apiSource.update(id, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigneeIds: data.assigneeIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      folderUrl: data.folderUrl,
    });
  }

  async updateStatus(id: string, data: UpdateTaskStatusDTO): Promise<Task> {
    return this.apiSource.updateStatus(id, data.status, data.order);
  }

  async updateOrder(id: string, order: number): Promise<Task> {
    return this.apiSource.updateOrder(id, order);
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.apiSource.deleteMany(ids);
    return result.deletedCount;
  }

  async updateMany(ids: string[], data: UpdateTaskDTO): Promise<Task[]> {
    return this.apiSource.updateMany(ids, {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigneeIds: data.assigneeIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      folderUrl: data.folderUrl,
    });
  }

  async getComments(taskId: string): Promise<Comment[]> {
    return this.apiSource.getComments(taskId);
  }

  async addComment(taskId: string, content: string): Promise<Comment> {
    return this.apiSource.addComment(taskId, content);
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    return this.apiSource.deleteComment(taskId, commentId);
  }

  async getSubtasks(taskId: string): Promise<Task[]> {
    return this.apiSource.getSubtasks(taskId);
  }

  async getActivities(taskId: string): Promise<ActivityLog[]> {
    return this.apiSource.getActivities(taskId);
  }
}
