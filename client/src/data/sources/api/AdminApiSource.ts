/**
 * Admin API Source
 * 관리자 API 호출 처리
 */
import type { HttpClient } from './HttpClient';
import type { AuthUser } from '@/types';
import type { CreateUserDTO, UpdateUserDTO, CreateUserResult } from '@/domain/repositories/IAdminRepository';

export class AdminApiSource {
  constructor(private httpClient: HttpClient) {}

  async getUsers(): Promise<AuthUser[]> {
    const users = await this.httpClient.get<Record<string, unknown>[]>('/admin/users');
    return users.map(this.mapToAuthUser);
  }

  async getUserById(id: string): Promise<AuthUser> {
    const user = await this.httpClient.get<Record<string, unknown>>(`/admin/users?id=${id}`);
    return this.mapToAuthUser(user);
  }

  async createUser(data: CreateUserDTO): Promise<CreateUserResult> {
    const result = await this.httpClient.post<{ user: Record<string, unknown>; tempPassword: string }>(
      '/admin/users',
      data
    );
    return {
      user: this.mapToAuthUser(result.user),
      tempPassword: result.tempPassword,
    };
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<AuthUser> {
    const result = await this.httpClient.put<{ user: Record<string, unknown> }>(
      `/admin/users?id=${id}`,
      data
    );
    return this.mapToAuthUser(result.user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.httpClient.delete(`/admin/users?id=${id}`);
  }

  async resetPassword(userId: string, newPassword?: string): Promise<string> {
    const result = await this.httpClient.post<{ tempPassword: string }>(
      '/admin/reset-password',
      { userId, newPassword }
    );
    return result.tempPassword;
  }

  private mapToAuthUser(data: Record<string, unknown>): AuthUser {
    return {
      id: data.id as string,
      username: data.username as string,
      email: (data.email as string) || '',
      name: data.name as string,
      avatarUrl: data.avatarUrl as string | undefined,
      department: data.department as string | undefined,
      position: data.position as string | undefined,
      userRole: (data.role || data.userRole) as 'admin' | 'member',
      mustChangePassword: data.mustChangePassword as boolean,
      isActive: data.isActive as boolean,
      lastLoginAt: data.lastLoginAt as string | undefined,
      createdAt: data.createdAt as string | undefined,
    };
  }
}
