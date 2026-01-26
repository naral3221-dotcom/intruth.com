/**
 * Routine Repository 인터페이스
 * 루틴 업무 데이터 접근을 위한 추상화 계층
 */
import type { RoutineTask, CreateRoutineInput } from '@/types';

// DTO (Data Transfer Objects)
export interface RoutineListParams {
  personal?: boolean;
  dayOfWeek?: number; // 0=일, 1=월, ..., 6=토
  projectId?: string;
  all?: boolean;
}

export interface UpdateRoutineDTO {
  title?: string;
  description?: string;
  daysOfWeek?: number[];
  priority?: string;
  projectId?: string;
  assigneeIds?: string[];
  isActive?: boolean;
}

export interface CompleteResult {
  success: boolean;
  completed: boolean;
  date: string;
}

// Repository 인터페이스
export interface IRoutineRepository {
  // Query methods (조회)
  findByDay(params?: RoutineListParams): Promise<RoutineTask[]>;
  findToday(params?: { personal?: boolean }): Promise<RoutineTask[]>;
  findAll(params?: RoutineListParams): Promise<RoutineTask[]>;
  findByProject(projectId: string): Promise<RoutineTask[]>;
  findById(id: string): Promise<RoutineTask>;

  // Command methods (변경)
  create(data: CreateRoutineInput): Promise<RoutineTask>;
  update(id: string, data: UpdateRoutineDTO): Promise<RoutineTask>;
  delete(id: string): Promise<void>;

  // Completion methods (완료 체크)
  complete(id: string): Promise<CompleteResult>;
  uncomplete(id: string): Promise<CompleteResult>;
}
