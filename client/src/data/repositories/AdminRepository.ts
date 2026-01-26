/**
 * Admin Repository 구현체
 * IAdminRepository 인터페이스를 구현하여 실제 API 호출 수행
 */
import type { AuthUser } from '@/types';
import type {
  IAdminRepository,
  CreateUserDTO,
  UpdateUserDTO,
  CreateUserResult,
} from '@/domain/repositories/IAdminRepository';
import type { AdminApiSource } from '@/data/sources/api/AdminApiSource';

export class AdminRepository implements IAdminRepository {
  constructor(private apiSource: AdminApiSource) {}

  async getUsers(): Promise<AuthUser[]> {
    return this.apiSource.getUsers();
  }

  async getUserById(id: string): Promise<AuthUser> {
    return this.apiSource.getUserById(id);
  }

  async createUser(data: CreateUserDTO): Promise<CreateUserResult> {
    return this.apiSource.createUser(data);
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<AuthUser> {
    return this.apiSource.updateUser(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.apiSource.deleteUser(id);
  }

  async resetPassword(userId: string, newPassword?: string): Promise<string> {
    return this.apiSource.resetPassword(userId, newPassword);
  }
}
