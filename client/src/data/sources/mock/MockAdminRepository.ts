/**
 * Mock Admin Repository
 * IAdminRepository 인터페이스를 구현하여 Mock 관리자 기능 제공
 */
import type { AuthUser } from '@/types';
import type {
  IAdminRepository,
  CreateUserDTO,
  UpdateUserDTO,
  CreateUserResult,
} from '@/domain/repositories/IAdminRepository';
import { MockStorage } from './MockStorage';

// Mock 사용자 데이터
const initialMockUsers: AuthUser[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@hospital.com',
    name: '관리자',
    department: '운영팀',
    position: '원장',
    userRole: 'admin',
    mustChangePassword: false,
    isActive: true,
  },
  {
    id: '2',
    username: '김철수',
    email: '',
    name: '김철수',
    department: '물리치료실',
    position: '물리치료사',
    userRole: 'member',
    mustChangePassword: true,
    isActive: true,
  },
  {
    id: '3',
    username: '이영희',
    email: '',
    name: '이영희',
    department: '진료실',
    position: '간호사',
    userRole: 'member',
    mustChangePassword: false,
    isActive: true,
  },
];

const MOCK_USERS_KEY = 'mock_admin_users';

export class MockAdminRepository implements IAdminRepository {
  private storage = MockStorage.getInstance();

  private getUsersFromStorage(): AuthUser[] {
    const stored = localStorage.getItem(MOCK_USERS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return [...initialMockUsers];
  }

  private saveUsers(users: AuthUser[]): void {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  }

  async getUsers(): Promise<AuthUser[]> {
    await this.storage.delay(300);
    return this.getUsersFromStorage();
  }

  async getUserById(id: string): Promise<AuthUser> {
    await this.storage.delay(200);
    const user = this.getUsersFromStorage().find(u => u.id === id);
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async createUser(data: CreateUserDTO): Promise<CreateUserResult> {
    await this.storage.delay(500);

    const users = this.getUsersFromStorage();

    // 중복 체크
    if (users.some(u => u.username === data.username)) {
      throw new Error('이미 존재하는 아이디입니다.');
    }

    const newUser: AuthUser = {
      id: String(Date.now()),
      username: data.username,
      email: data.email || '',
      name: data.name,
      department: data.department,
      position: data.position,
      userRole: data.role || 'member',
      mustChangePassword: true,
      isActive: true,
    };

    users.push(newUser);
    this.saveUsers(users);

    return {
      user: newUser,
      tempPassword: data.password || '123456789',
    };
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<AuthUser> {
    await this.storage.delay(300);

    const users = this.getUsersFromStorage();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const updatedUser: AuthUser = {
      ...users[index],
      ...(data.name && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.role && { userRole: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    users[index] = updatedUser;
    this.saveUsers(users);

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await this.storage.delay(300);

    const users = this.getUsersFromStorage();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    users.splice(index, 1);
    this.saveUsers(users);
  }

  async resetPassword(userId: string, newPassword?: string): Promise<string> {
    await this.storage.delay(500);

    const users = this.getUsersFromStorage();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // Mock에서는 실제 비밀번호를 저장하지 않으므로
    // 단순히 tempPassword 반환
    return newPassword || '123456789';
  }
}
