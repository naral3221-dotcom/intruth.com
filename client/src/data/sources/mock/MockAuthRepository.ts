/**
 * Mock Auth Repository
 * IAuthRepository 인터페이스를 구현하여 Mock 인증 제공
 */
import type { AuthUser } from '@/types';
import type {
  IAuthRepository,
  ITokenManager,
  LoginInput,
  LoginResult,
  ChangePasswordInput
} from '@/domain/repositories/IAuthRepository';
import { MockStorage } from './MockStorage';

// Mock 사용자 데이터 (아이디로 조회)
const mockUsers: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: 'admin1234',
    user: {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      name: '관리자',
      department: '개발팀',
      position: '팀장',
      userRole: 'admin',
      mustChangePassword: false,
    },
  },
  hong: {
    password: 'password123',
    user: {
      id: '2',
      username: 'hong',
      email: 'hong@example.com',
      name: '홍길동',
      department: '개발팀',
      position: '선임 개발자',
      userRole: 'member',
      mustChangePassword: false,
    },
  },
};

// Mock Token Manager
class MockTokenManager implements ITokenManager {
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('token_expires_at', expiresAt.toString());
  }

  removeToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
  }

  isExpired(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt, 10);
  }

  isExpiringSoon(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > parseInt(expiresAt, 10) - fiveMinutes;
  }
}

export class MockAuthRepository implements IAuthRepository {
  private storage = MockStorage.getInstance();
  public readonly tokenManager: ITokenManager = new MockTokenManager();

  async login(input: LoginInput): Promise<LoginResult> {
    await this.storage.delay(500);

    const userData = mockUsers[input.username.toLowerCase().trim()];
    if (userData && userData.password === input.password) {
      const token = 'mock-jwt-token-' + Date.now();
      this.tokenManager.setToken(token);

      // localStorage에 user 정보도 저장
      localStorage.setItem('user', JSON.stringify(userData.user));

      return {
        token,
        user: userData.user,
        mustChangePassword: userData.user.mustChangePassword,
      };
    }

    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  async logout(): Promise<void> {
    await this.storage.delay(200);
    this.tokenManager.removeToken();
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<AuthUser> {
    await this.storage.delay(200);

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        // ignore
      }
    }

    // 기본 mock 사용자 반환
    return {
      ...this.storage.getCurrentMember(),
      userRole: 'admin',
      mustChangePassword: false,
    };
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.storage.delay(500);

    // Mock에서는 현재 비밀번호가 맞는지만 체크
    if (input.currentPassword === '123456789' || input.currentPassword === 'admin123') {
      return;
    }

    throw new Error('현재 비밀번호가 올바르지 않습니다.');
  }
}
