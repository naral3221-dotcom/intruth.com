/**
 * Routine Repository 구현체
 * IRoutineRepository 인터페이스를 구현하여 API를 통한 루틴 데이터 접근 제공
 */
import type { RoutineTask, CreateRoutineInput } from '@/types';
import type {
  IRoutineRepository,
  RoutineListParams,
  UpdateRoutineDTO,
  CompleteResult
} from '@/domain/repositories/IRoutineRepository';
import { RoutineApiSource } from '../sources/api/RoutineApiSource';

export class RoutineRepository implements IRoutineRepository {
  constructor(private readonly apiSource: RoutineApiSource) {}

  async findByDay(params?: RoutineListParams): Promise<RoutineTask[]> {
    return this.apiSource.listByDay(params);
  }

  async findToday(params?: { personal?: boolean }): Promise<RoutineTask[]> {
    return this.apiSource.listToday(params);
  }

  async findAll(params?: RoutineListParams): Promise<RoutineTask[]> {
    return this.apiSource.listAll(params);
  }

  async findByProject(projectId: string): Promise<RoutineTask[]> {
    return this.apiSource.listByProject(projectId);
  }

  async findById(id: string): Promise<RoutineTask> {
    return this.apiSource.get(id);
  }

  async create(data: CreateRoutineInput): Promise<RoutineTask> {
    return this.apiSource.create(data);
  }

  async update(id: string, data: UpdateRoutineDTO): Promise<RoutineTask> {
    return this.apiSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async complete(id: string): Promise<CompleteResult> {
    return this.apiSource.complete(id);
  }

  async uncomplete(id: string): Promise<CompleteResult> {
    return this.apiSource.uncomplete(id);
  }
}
