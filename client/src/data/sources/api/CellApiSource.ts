/**
 * Cell API Source
 * Cell 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { Cell, CellMember, CellMemberRole, MyCellInfo } from '@/domain/entities/Cell';

export interface CellApiListParams {
  leaderId?: string;
  isActive?: boolean;
  search?: string;
}

export interface CellApiCreateInput {
  name: string;
  description?: string;
  color?: string;
  leaderId: string;
}

export interface CellApiUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  leaderId?: string;
  isActive?: boolean;
}

export interface AddCellMemberInput {
  memberId: string;
  role?: CellMemberRole;
}

export interface UpdateCellMemberInput {
  role?: CellMemberRole;
  isActive?: boolean;
}

export class CellApiSource {
  constructor(private httpClient: HttpClient) {}

  async list(params?: CellApiListParams): Promise<Cell[]> {
    const searchParams = new URLSearchParams();
    if (params?.leaderId) searchParams.set('leaderId', params.leaderId);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.httpClient.get<Cell[]>(`/cells${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Cell> {
    return this.httpClient.get<Cell>(`/cells/${id}`);
  }

  async getMyCells(): Promise<MyCellInfo[]> {
    return this.httpClient.get<MyCellInfo[]>('/cells/my');
  }

  async create(data: CellApiCreateInput): Promise<Cell> {
    return this.httpClient.post<Cell>('/cells', data);
  }

  async update(id: string, data: CellApiUpdateInput): Promise<Cell> {
    return this.httpClient.put<Cell>(`/cells/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/cells/${id}`);
  }

  // Members
  async getMembers(cellId: string, includeInactive = false): Promise<CellMember[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.httpClient.get<CellMember[]>(`/cells/${cellId}/members${params}`);
  }

  async addMember(cellId: string, data: AddCellMemberInput): Promise<CellMember> {
    return this.httpClient.post<CellMember>(`/cells/${cellId}/members`, data);
  }

  async updateMember(cellId: string, memberId: string, data: UpdateCellMemberInput): Promise<CellMember> {
    return this.httpClient.patch<CellMember>(`/cells/${cellId}/members/${memberId}`, data);
  }

  async removeMember(cellId: string, memberId: string): Promise<void> {
    await this.httpClient.delete<void>(`/cells/${cellId}/members/${memberId}`);
  }
}
