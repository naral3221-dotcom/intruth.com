import { create } from 'zustand';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import {
  createTaskUseCase,
  updateTaskUseCase,
  updateTaskStatusUseCase,
  deleteTaskUseCase,
  TaskValidationError,
} from '@/di/storeUseCases';
import { taskRepository } from '@/di/storeRepositories';
import { toast } from '@/stores/toastStore';

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;  // 단일 담당자 (하위 호환)
  assigneeIds?: string[];  // 다중 담당자
  startDate?: string;
  dueDate?: string;
  parentId?: string;  // 하위 업무 생성 시 상위 업무 ID
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchTasks: (projectId?: string) => Promise<void>;
  addTask: (data: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task> & { assigneeIds?: string[] }) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTasks: (tasks: Task[]) => void;

  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const tasks = await taskRepository.findAll(projectId ? { projectId } : undefined);
      set({ tasks, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('업무 목록 로드 실패', message);
    }
  },

  addTask: async (data: CreateTaskInput) => {
    set({ loading: true, error: null });
    try {
      // Use Case를 통해 유효성 검증 후 생성
      const newTask = await createTaskUseCase.execute(data);

      // 하위 업무인 경우 부모 업무의 subtasks에 추가
      if (data.parentId) {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === data.parentId) {
              return {
                ...task,
                subtasks: [...(task.subtasks || []), newTask],
                _count: {
                  subtasks: (task._count?.subtasks || 0) + 1,
                  comments: task._count?.comments || 0,
                },
              };
            }
            return task;
          }),
          loading: false,
        }));
      } else {
        // 일반 업무인 경우 tasks 배열에 추가
        set((state) => ({
          tasks: [...state.tasks, newTask],
          loading: false,
        }));
      }
      toast.success('업무 추가 완료', `"${newTask.title}" 업무가 생성되었습니다.`);
      return newTask;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      // 유효성 검증 에러는 별도 처리
      if (error instanceof TaskValidationError) {
        toast.error('입력 오류', message);
      } else {
        toast.error('업무 추가 실패', message);
      }
      throw error;
    }
  },

  updateTask: async (id: string, data: Partial<Task> & { assigneeIds?: string[] }) => {
    const previousTasks = get().tasks;

    // Optimistic update - 최상위 tasks와 subtasks 모두 확인
    set((state) => ({
      tasks: state.tasks.map((task) => {
        // 최상위 task인 경우
        if (task.id === id) {
          return { ...task, ...data, updatedAt: new Date().toISOString() };
        }
        // subtask인 경우
        if (task.subtasks) {
          const updatedSubtasks = task.subtasks.map((subtask) =>
            subtask.id === id ? { ...subtask, ...data, updatedAt: new Date().toISOString() } : subtask
          );
          // subtask가 변경되었는지 확인
          if (updatedSubtasks.some((st, idx) => st !== task.subtasks![idx])) {
            return { ...task, subtasks: updatedSubtasks };
          }
        }
        return task;
      }),
    }));

    try {
      // Use Case를 통해 유효성 검증 후 업데이트
      const updatedTask = await updateTaskUseCase.execute({ id, data });

      // 서버 응답으로 store 업데이트 (정확한 데이터 동기화)
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id === id) {
            return updatedTask;
          }
          // subtask인 경우
          if (task.subtasks) {
            const updatedSubtasks = task.subtasks.map((subtask) =>
              subtask.id === id ? updatedTask : subtask
            );
            if (updatedSubtasks.some((st, idx) => st !== task.subtasks![idx])) {
              return { ...task, subtasks: updatedSubtasks };
            }
          }
          return task;
        }),
      }));

      toast.success('업무 수정 완료', '업무가 성공적으로 수정되었습니다.');
    } catch (error) {
      // Rollback on error
      const message = (error as Error).message;
      set({ tasks: previousTasks, error: message });
      if (error instanceof TaskValidationError) {
        toast.error('입력 오류', message);
      } else {
        toast.error('업무 수정 실패', message);
      }
      throw error;
    }
  },

  updateTaskStatus: async (id: string, status: TaskStatus) => {
    const previousTasks = get().tasks;

    // Optimistic update - 최상위 tasks와 subtasks 모두 확인
    set((state) => ({
      tasks: state.tasks.map((task) => {
        // 최상위 task인 경우
        if (task.id === id) {
          return { ...task, status, updatedAt: new Date().toISOString() };
        }
        // subtask인 경우
        if (task.subtasks) {
          const updatedSubtasks = task.subtasks.map((subtask) =>
            subtask.id === id ? { ...subtask, status, updatedAt: new Date().toISOString() } : subtask
          );
          // subtask가 변경되었는지 확인
          if (updatedSubtasks.some((st, idx) => st !== task.subtasks![idx])) {
            return { ...task, subtasks: updatedSubtasks };
          }
        }
        return task;
      }),
    }));

    try {
      // Use Case를 통해 상태 업데이트
      const updatedTask = await updateTaskStatusUseCase.execute({ id, status });

      // 서버 응답으로 해당 task 업데이트 (정확한 데이터 동기화)
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id === id) {
            return updatedTask;
          }
          // subtask인 경우
          if (task.subtasks) {
            const updatedSubtasks = task.subtasks.map((subtask) =>
              subtask.id === id ? updatedTask : subtask
            );
            if (updatedSubtasks.some((st, idx) => st !== task.subtasks![idx])) {
              return { ...task, subtasks: updatedSubtasks };
            }
          }
          return task;
        }),
      }));
    } catch (error) {
      // Rollback on error
      const message = (error as Error).message;
      set({ tasks: previousTasks, error: message });
      toast.error('상태 변경 실패', message);
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    const previousTasks = get().tasks;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));

    try {
      // Use Case를 통해 삭제
      await deleteTaskUseCase.execute(id);
      toast.success('업무 삭제 완료', '업무가 삭제되었습니다.');
    } catch (error) {
      // Rollback on error
      const message = (error as Error).message;
      set({ tasks: previousTasks, error: message });
      toast.error('업무 삭제 실패', message);
      throw error;
    }
  },

  setTasks: (tasks: Task[]) => set({ tasks }),

  getTasksByStatus: (status: TaskStatus) => {
    return get().tasks.filter((task) => task.status === status);
  },

  getTasksByProject: (projectId: string) => {
    return get().tasks.filter((task) => task.projectId === projectId);
  },

  getTasksByAssignee: (assigneeId: string) => {
    return get().tasks.filter((task) => task.assignee?.id === assigneeId);
  },
}));
