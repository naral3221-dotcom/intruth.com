/**
 * Auth API Source
 * 인증 관련 API 호출을 담당
 */
import type { AuthUser } from '@/types';
import type { LoginInput, LoginResult, ChangePasswordInput } from '@/domain/repositories/IAuthRepository';
import { HttpClient } from './HttpClient';
import type { TokenManager } from './HttpClient';

export class AuthApiSource {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly tokenManager: TokenManager
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const response = await this.httpClient.post<{
      token: string;
      user: {
        id: string;
        username: string;
        email?: string;
        name: string;
        avatarUrl?: string;
        department?: string;
        position?: string;
        role: string;
      };
      mustChangePassword: boolean;
    }>('/auth/login', input);

    // 토큰 저장
    this.tokenManager.setToken(response.token);

    return {
      token: response.token,
      user: {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email || '',
        name: response.user.name,
        avatarUrl: response.user.avatarUrl,
        department: response.user.department,
        position: response.user.position,
        userRole: response.user.role as 'admin' | 'member',
        mustChangePassword: response.mustChangePassword,
      },
      mustChangePassword: response.mustChangePassword,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.httpClient.post('/auth/logout');
    } finally {
      this.tokenManager.removeToken();
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response = await this.httpClient.get<{
      id: string;
      username: string;
      email?: string;
      name: string;
      avatarUrl?: string;
      department?: string;
      position?: string;
      role: string;
      mustChangePassword: boolean;
    }>('/auth/me');

    return {
      id: response.id,
      username: response.username,
      email: response.email || '',
      name: response.name,
      avatarUrl: response.avatarUrl,
      department: response.department,
      position: response.position,
      userRole: response.role as 'admin' | 'member',
      mustChangePassword: response.mustChangePassword,
    };
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.httpClient.post('/auth/change-password', input);
  }

  getTokenManager(): TokenManager {
    return this.tokenManager;
  }
}
