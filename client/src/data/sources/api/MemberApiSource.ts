/**
 * Member API Source
 * Member 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
import type { Member, Task, Role } from '@/types';
import type { MemberWorkload } from '@/domain/repositories/IMemberRepository';

export interface MemberApiListParams {
  department?: string;
  position?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface MemberApiInviteInput {
  email: string;
  name: string;
  department?: string;
  position?: string;
  roleId?: string;
}

export interface MemberApiUpdateInput {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  avatarUrl?: string;
  roleId?: string;
  isActive?: boolean;
}

export class MemberApiSource {
  constructor(private httpClient: HttpClient) {}

  async list(params?: MemberApiListParams): Promise<Member[]> {
    const searchParams = new URLSearchParams();
    if (params?.department) searchParams.set('department', params.department);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.roleId) searchParams.set('roleId', params.roleId);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    const query = searchParams.toString();
    return this.httpClient.get<Member[]>(`/members${query ? `?${query}` : ''}`);
  }

  async get(id: string): Promise<Member> {
    return this.httpClient.get<Member>(`/members?id=${id}`);
  }

  async getByEmail(email: string): Promise<Member | null> {
    try {
      return await this.httpClient.get<Member>(`/members?email=${encodeURIComponent(email)}`);
    } catch {
      return null;
    }
  }

  async getCurrentMember(): Promise<Member> {
    return this.httpClient.get<Member>('/members?action=me');
  }

  async invite(data: MemberApiInviteInput): Promise<Member> {
    return this.httpClient.post<Member>('/members', data);
  }

  async update(id: string, data: MemberApiUpdateInput): Promise<Member> {
    return this.httpClient.put<Member>(`/members?id=${id}`, data);
  }

  async remove(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/members?id=${id}`);
  }

  async activate(id: string): Promise<Member> {
    return this.httpClient.patch<Member>(`/members?id=${id}`, { isActive: true });
  }

  async deactivate(id: string): Promise<Member> {
    return this.httpClient.patch<Member>(`/members?id=${id}`, { isActive: false });
  }

  // Tasks
  async getTasks(memberId: string): Promise<Task[]> {
    return this.httpClient.get<Task[]>(`/members?id=${memberId}&action=tasks`);
  }

  async getWorkload(memberId: string): Promise<MemberWorkload> {
    return this.httpClient.get<MemberWorkload>(`/members?id=${memberId}&action=workload`);
  }

  async getWorkloads(): Promise<MemberWorkload[]> {
    return this.httpClient.get<MemberWorkload[]>('/members?action=workloads');
  }

  // Roles
  async getRoles(): Promise<Role[]> {
    return this.httpClient.get<Role[]>('/members?action=roles');
  }

  async assignRole(memberId: string, roleId: string): Promise<Member> {
    return this.httpClient.patch<Member>(`/members?id=${memberId}`, { roleId });
  }
}
