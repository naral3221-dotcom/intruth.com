/**
 * Task API Source
 * Task 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { Task, TaskStatus, Comment, ActivityLog } from '@/types';

export interface TaskApiListParams {
  projectId?: string;
  status?: string;
  assigneeId?: string;
}

export interface TaskApiCreateInput {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  folderUrl?: string;
  parentId?: string;
}

export interface TaskApiUpdateInput {
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  folderUrl?: string;
}

export class TaskApiSource {
  constructor(private httpClient: HttpClient) {}

  async list(params?: TaskApiListParams): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
    const query = searchParams.toString();
    return this.httpClient.get<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Task> {
    return this.httpClient.get<Task>(`/tasks/${id}`);
  }

  async create(data: TaskApiCreateInput): Promise<Task> {
    return this.httpClient.post<Task>('/tasks', data);
  }

  async update(id: string, data: TaskApiUpdateInput): Promise<Task> {
    return this.httpClient.put<Task>(`/tasks/${id}`, data);
  }

  async updateStatus(id: string, status: TaskStatus, order?: number): Promise<Task> {
    return this.httpClient.patch<Task>(`/tasks/${id}/status`, { status, order });
  }

  async updateOrder(id: string, order: number): Promise<Task> {
    return this.httpClient.patch<Task>(`/tasks/${id}/order`, { order });
  }

  async delete(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/tasks/${id}`);
  }

  // Batch operations
  async deleteMany(ids: string[]): Promise<{ deletedCount: number }> {
    return this.httpClient.post<{ deletedCount: number }>('/tasks/batch/delete', { ids });
  }

  async updateMany(ids: string[], data: TaskApiUpdateInput): Promise<Task[]> {
    return this.httpClient.post<Task[]>('/tasks/batch/update', { ids, data });
  }

  // Comments
  async getComments(taskId: string): Promise<Comment[]> {
    return this.httpClient.get<Comment[]>(`/tasks/${taskId}/comments`);
  }

  async addComment(taskId: string, content: string): Promise<Comment> {
    return this.httpClient.post<Comment>(`/tasks/${taskId}/comments`, { content });
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await this.httpClient.delete<void>(`/tasks/${taskId}/comments/${commentId}`);
  }

  // Subtasks
  async getSubtasks(taskId: string): Promise<Task[]> {
    return this.httpClient.get<Task[]>(`/tasks?parentId=${taskId}`);
  }

  // Activities
  async getActivities(taskId: string): Promise<ActivityLog[]> {
    return this.httpClient.get<ActivityLog[]>(`/tasks/${taskId}/activities`);
  }
}
