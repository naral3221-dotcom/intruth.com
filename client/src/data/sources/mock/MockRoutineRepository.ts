/**
 * Mock Routine Repository
 * IRoutineRepository 인터페이스를 구현하여 Mock 루틴 데이터 제공
 */
// @ts-nocheck - Mock 파일은 프로덕션에서 사용되지 않음
import type { RoutineTask, CreateRoutineInput } from '@/types';
import type {
  IRoutineRepository,
  RoutineListParams,
  UpdateRoutineDTO,
  CompleteResult
} from '@/domain/repositories/IRoutineRepository';
import { MockStorage } from './MockStorage';

// 루틴 데이터를 위한 localStorage 키
const ROUTINE_STORAGE_KEY = 'workflow_routines';
const ROUTINE_COMPLETIONS_KEY = 'workflow_routine_completions';

export class MockRoutineRepository implements IRoutineRepository {
  private storage = MockStorage.getInstance();

  private getRoutines(): RoutineTask[] {
    try {
      const stored = localStorage.getItem(ROUTINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRoutines(routines: RoutineTask[]): void {
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(routines));
  }

  private getCompletions(): Record<string, string[]> {
    try {
      const stored = localStorage.getItem(ROUTINE_COMPLETIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveCompletions(completions: Record<string, string[]>): void {
    localStorage.setItem(ROUTINE_COMPLETIONS_KEY, JSON.stringify(completions));
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  async findByDay(params?: RoutineListParams): Promise<RoutineTask[]> {
    await this.storage.delay(300);

    const routines = this.getRoutines();
    const dayOfWeek = params?.dayOfWeek ?? new Date().getDay();

    return routines.filter((r) => {
      if (!r.isActive) return false;
      if (!r.daysOfWeek?.includes(dayOfWeek)) return false;
      if (params?.personal) {
        const currentMember = this.storage.getCurrentMember();
        if (!r.assignees?.some((a) => a.id === currentMember.id)) return false;
      }
      return true;
    });
  }

  async findToday(params?: { personal?: boolean }): Promise<RoutineTask[]> {
    return this.findByDay({ personal: params?.personal });
  }

  async findAll(params?: RoutineListParams): Promise<RoutineTask[]> {
    await this.storage.delay(300);

    let routines = this.getRoutines();

    if (params?.projectId) {
      routines = routines.filter((r) => r.projectId === params.projectId);
    }
    if (params?.personal) {
      const currentMember = this.storage.getCurrentMember();
      routines = routines.filter((r) =>
        r.assignees?.some((a) => a.id === currentMember.id)
      );
    }

    return routines;
  }

  async findByProject(projectId: string): Promise<RoutineTask[]> {
    return this.findAll({ projectId });
  }

  async findById(id: string): Promise<RoutineTask> {
    await this.storage.delay(200);

    const routines = this.getRoutines();
    const routine = routines.find((r) => r.id === id);

    if (!routine) {
      throw new Error('루틴을 찾을 수 없습니다.');
    }

    return routine;
  }

  async create(data: CreateRoutineInput): Promise<RoutineTask> {
    await this.storage.delay(300);

    const routines = this.getRoutines();
    const members = this.storage.members;
    const projects = this.storage.projects;
    const currentMember = this.storage.getCurrentMember();

    const assignees = data.assigneeIds
      ?.map((id) => members.find((m) => m.id === id))
      .filter((m) => m !== undefined) || [];

    const project = data.projectId
      ? projects.find((p) => p.id === data.projectId)
      : undefined;

    const newRoutine: RoutineTask = {
      id: this.storage.generateId('routine'),
      title: data.title,
      description: data.description,
      daysOfWeek: data.daysOfWeek || [],
      priority: data.priority || 'MEDIUM',
      projectId: data.projectId,
      project: project ? { id: project.id, name: project.name } : undefined,
      assignees,
      creatorId: currentMember.id,
      creator: currentMember,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    routines.push(newRoutine);
    this.saveRoutines(routines);

    return newRoutine;
  }

  async update(id: string, data: UpdateRoutineDTO): Promise<RoutineTask> {
    await this.storage.delay(200);

    const routines = this.getRoutines();
    const index = routines.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('루틴을 찾을 수 없습니다.');
    }

    const members = this.storage.members;
    const projects = this.storage.projects;

    let assignees = routines[index].assignees;
    if (data.assigneeIds) {
      assignees = data.assigneeIds
        .map((memberId) => members.find((m) => m.id === memberId))
        .filter((m) => m !== undefined) as typeof assignees;
    }

    let project = routines[index].project;
    if (data.projectId !== undefined) {
      project = data.projectId
        ? projects.find((p) => p.id === data.projectId)
        : undefined;
      if (project) {
        project = { id: project.id, name: project.name };
      }
    }

    routines[index] = {
      ...routines[index],
      ...data,
      assignees,
      project,
      updatedAt: new Date().toISOString(),
    };

    this.saveRoutines(routines);
    return routines[index];
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);

    const routines = this.getRoutines();
    const index = routines.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('루틴을 찾을 수 없습니다.');
    }

    routines.splice(index, 1);
    this.saveRoutines(routines);
  }

  async complete(id: string): Promise<CompleteResult> {
    await this.storage.delay(200);

    const completions = this.getCompletions();
    const today = this.getTodayString();

    if (!completions[id]) {
      completions[id] = [];
    }

    if (!completions[id].includes(today)) {
      completions[id].push(today);
    }

    this.saveCompletions(completions);

    return {
      success: true,
      completed: true,
      date: today,
    };
  }

  async uncomplete(id: string): Promise<CompleteResult> {
    await this.storage.delay(200);

    const completions = this.getCompletions();
    const today = this.getTodayString();

    if (completions[id]) {
      completions[id] = completions[id].filter((d) => d !== today);
    }

    this.saveCompletions(completions);

    return {
      success: true,
      completed: false,
      date: today,
    };
  }
}
