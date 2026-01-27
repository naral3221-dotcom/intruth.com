/**
 * Auth Repository 인터페이스
 * 인증 관련 데이터 접근을 위한 추상화 계층
 */
import type { AuthUser } from '@/types';

// DTO (Data Transfer Objects)
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
  mustChangePassword: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Token Manager 인터페이스
export interface ITokenManager {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  isExpired(): boolean;
  isExpiringSoon(): boolean;
}

// Repository 인터페이스
export interface IAuthRepository {
  // 인증 메서드
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser>;
  changePassword(input: ChangePasswordInput): Promise<void>;

  // 토큰 관리
  tokenManager: ITokenManager;
}
