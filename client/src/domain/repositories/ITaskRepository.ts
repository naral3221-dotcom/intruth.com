/**
 * Task Repository 인터페이스
 * 업무(Task) 데이터 접근을 위한 추상화 계층
 */
import type { Task, TaskStatus, TaskPriority, Comment } from '@/types';

// DTO (Data Transfer Objects)
export interface CreateTaskDTO {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  folderUrl?: string;
  parentId?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  folderUrl?: string;
}

export interface TaskListParams {
  projectId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  search?: string;
}

export interface UpdateTaskStatusDTO {
  status: TaskStatus;
  order?: number;
}

// Repository 인터페이스
export interface ITaskRepository {
  // Query methods (조회)
  findAll(params?: TaskListParams): Promise<Task[]>;
  findById(id: string): Promise<Task>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByAssigneeId(assigneeId: string): Promise<Task[]>;

  // Command methods (변경)
  create(data: CreateTaskDTO): Promise<Task>;
  update(id: string, data: UpdateTaskDTO): Promise<Task>;
  updateStatus(id: string, data: UpdateTaskStatusDTO): Promise<Task>;
  updateOrder(id: string, order: number): Promise<Task>;
  delete(id: string): Promise<void>;

  // Batch methods (일괄 작업)
  deleteMany(ids: string[]): Promise<number>;
  updateMany(ids: string[], data: UpdateTaskDTO): Promise<Task[]>;

  // Comment methods (댓글)
  getComments(taskId: string): Promise<Comment[]>;
  addComment(taskId: string, content: string): Promise<Comment>;
  deleteComment(taskId: string, commentId: string): Promise<void>;

  // Subtask methods (하위 업무)
  getSubtasks(taskId: string): Promise<Task[]>;

  // Activity methods (활동 로그)
  getActivities(taskId: string): Promise<import('@/types').ActivityLog[]>;
}
