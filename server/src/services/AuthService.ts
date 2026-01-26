/**
 * Auth Service
 * 인증 관련 비즈니스 로직
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { NotFoundError, UnauthorizedError, ValidationError } from '../shared/errors.js';

// Input/Output DTOs
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  member: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    department: string | null;
    position: string | null;
    role: {
      id: string;
      name: string;
      permissions: string[];
    } | null;
  };
}

export interface MemberProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  role: {
    id: string;
    name: string;
    permissions: string[];
  } | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(private prisma: PrismaClient) {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * 로그인
   */
  async login(input: LoginInput): Promise<LoginResult> {
    if (!input.email?.trim()) {
      throw new ValidationError('이메일을 입력해주세요.');
    }

    if (!input.password) {
      throw new ValidationError('비밀번호를 입력해주세요.');
    }

    const member = await this.prisma.member.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!member || !member.password) {
      throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!member.isActive) {
      throw new UnauthorizedError('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    const isValid = await bcrypt.compare(input.password, member.password);
    if (!isValid) {
      throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const token = jwt.sign(
      {
        memberId: member.id,
        email: member.email,
        roleId: member.roleId,
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as SignOptions
    );

    return {
      token,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        avatarUrl: member.avatarUrl,
        department: member.department,
        position: member.position,
        role: member.role
          ? {
              id: member.role.id,
              name: member.role.name,
              permissions: member.role.permissions,
            }
          : null,
      },
    };
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentMember(memberId: string): Promise<MemberProfile> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member) {
      throw new NotFoundError('사용자를 찾을 수 없습니다.');
    }

    return {
      id: member.id,
      email: member.email,
      name: member.name,
      avatarUrl: member.avatarUrl,
      department: member.department,
      position: member.position,
      role: member.role
        ? {
            id: member.role.id,
            name: member.role.name,
            permissions: member.role.permissions,
          }
        : null,
    };
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(memberId: string, input: ChangePasswordInput): Promise<void> {
    if (!input.currentPassword) {
      throw new ValidationError('현재 비밀번호를 입력해주세요.');
    }

    if (!input.newPassword) {
      throw new ValidationError('새 비밀번호를 입력해주세요.');
    }

    if (input.newPassword.length < 8) {
      throw new ValidationError('비밀번호는 8자 이상이어야 합니다.');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || !member.password) {
      throw new NotFoundError('사용자를 찾을 수 없습니다.');
    }

    const isValid = await bcrypt.compare(input.currentPassword, member.password);
    if (!isValid) {
      throw new UnauthorizedError('현재 비밀번호가 올바르지 않습니다.');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);

    await this.prisma.member.update({
      where: { id: memberId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });
  }

  /**
   * 비밀번호 재설정 (관리자용)
   */
  async resetPassword(memberId: string, newPassword: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundError('사용자를 찾을 수 없습니다.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.member.update({
      where: { id: memberId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });
  }

  /**
   * 토큰 검증
   */
  verifyToken(token: string): { memberId: string; email: string; roleId: string | null } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        memberId: string;
        email: string;
        roleId: string | null;
      };
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('유효하지 않은 토큰입니다.');
    }
  }
}
