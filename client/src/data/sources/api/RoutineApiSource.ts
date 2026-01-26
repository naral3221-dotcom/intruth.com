/**
 * Routine API Source
 * 루틴 업무 관련 API 호출을 담당
 */
import type { RoutineTask, CreateRoutineInput } from '@/types';
import type { RoutineListParams, UpdateRoutineDTO, CompleteResult } from '@/domain/repositories/IRoutineRepository';
import { HttpClient } from './HttpClient';

export class RoutineApiSource {
  constructor(private readonly httpClient: HttpClient) {}

  async listByDay(params?: RoutineListParams): Promise<RoutineTask[]> {
    const searchParams = new URLSearchParams();
    if (params?.personal) searchParams.set('personal', '1');
    if (params?.dayOfWeek !== undefined) searchParams.set('dayOfWeek', params.dayOfWeek.toString());
    const query = searchParams.toString();
    return this.httpClient.get(`/routine-tasks${query ? `?${query}` : ''}`);
  }

  async listToday(params?: { personal?: boolean }): Promise<RoutineTask[]> {
    const searchParams = new URLSearchParams();
    if (params?.personal) searchParams.set('personal', '1');
    const query = searchParams.toString();
    return this.httpClient.get(`/routine-tasks${query ? `?${query}` : ''}`);
  }

  async listAll(params?: RoutineListParams): Promise<RoutineTask[]> {
    const searchParams = new URLSearchParams({ all: '1' });
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.personal) searchParams.set('personal', '1');
    return this.httpClient.get(`/routine-tasks?${searchParams.toString()}`);
  }

  async listByProject(projectId: string): Promise<RoutineTask[]> {
    return this.httpClient.get(`/routine-tasks?projectId=${projectId}`);
  }

  async get(id: string): Promise<RoutineTask> {
    return this.httpClient.get(`/routine-tasks/${id}`);
  }

  async create(data: CreateRoutineInput): Promise<RoutineTask> {
    return this.httpClient.post('/routine-tasks', data);
  }

  async update(id: string, data: UpdateRoutineDTO): Promise<RoutineTask> {
    return this.httpClient.put(`/routine-tasks/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return this.httpClient.delete(`/routine-tasks/${id}`);
  }

  async complete(id: string): Promise<CompleteResult> {
    return this.httpClient.patch(`/routine-tasks/${id}/complete`, {});
  }

  async uncomplete(id: string): Promise<CompleteResult> {
    return this.httpClient.patch(`/routine-tasks/${id}/uncomplete`, {});
  }
}
