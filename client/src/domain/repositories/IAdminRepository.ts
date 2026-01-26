/**
 * Admin Repository 인터페이스
 * 관리자 사용자 관리 기능을 위한 추상화 계층
 */
import type { AuthUser, CreateUserInput, UpdateUserInput } from '@/types';

// DTO (Data Transfer Objects)
export interface CreateUserDTO {
  username: string;
  name: string;
  password?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
  isActive?: boolean;
}

export interface CreateUserResult {
  user: AuthUser;
  tempPassword: string;
}

// Repository 인터페이스
export interface IAdminRepository {
  // Query methods (조회)
  getUsers(): Promise<AuthUser[]>;
  getUserById(id: string): Promise<AuthUser>;

  // Command methods (변경)
  createUser(data: CreateUserDTO): Promise<CreateUserResult>;
  updateUser(id: string, data: UpdateUserDTO): Promise<AuthUser>;
  deleteUser(id: string): Promise<void>;

  // Password management
  resetPassword(userId: string, newPassword?: string): Promise<string>;
}
