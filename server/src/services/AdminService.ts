import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../shared/errors.js';

export interface CreateAdminUserInput {
  username: string;
  name: string;
  password?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
  isActive?: boolean;
}

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  department: true,
  position: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

type AdminUserRecord = {
  id: string;
  username: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  role: {
    id: string;
    name: string;
  } | null;
};

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  private mapUser(user: AdminUserRecord) {
    return {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      department: user.department,
      position: user.position,
      role: user.role?.name === 'Admin' ? 'admin' : 'member',
      userRole: user.role?.name === 'Admin' ? 'admin' : 'member',
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async findRoleId(role: 'admin' | 'member' = 'member') {
    const roleName = role === 'admin' ? 'Admin' : 'Member';
    const roleRecord = await this.prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });

    if (!roleRecord) {
      throw new ValidationError(`${roleName} role is not configured.`);
    }

    return roleRecord.id;
  }

  private normalizeUsername(username: unknown) {
    const value = String(username || '').trim().toLowerCase();
    if (!value) throw new ValidationError('Username is required.');
    if (!/^[a-z0-9._-]{2,40}$/.test(value)) {
      throw new ValidationError('Username can use 2-40 lowercase letters, numbers, dot, underscore, or dash.');
    }
    return value;
  }

  private normalizeEmail(email: unknown, username: string) {
    const value = String(email || '').trim().toLowerCase();
    return value || `${username}@intruth.local`;
  }

  private createTempPassword() {
    return `intruth-${randomBytes(4).toString('hex')}`;
  }

  async findAll() {
    const users = await this.prisma.member.findMany({
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => this.mapUser(user));
  }

  async findById(id: string) {
    const user = await this.prisma.member.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) throw new NotFoundError('User not found.');
    return this.mapUser(user);
  }

  async create(input: CreateAdminUserInput) {
    const username = this.normalizeUsername(input.username);
    const name = String(input.name || '').trim();
    if (!name) throw new ValidationError('Name is required.');

    const email = this.normalizeEmail(input.email, username);
    const password = String(input.password || '').trim() || '123456789';
    const roleId = await this.findRoleId(input.role);

    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.member.findUnique({ where: { username }, select: { id: true } }),
      this.prisma.member.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (existingUsername) throw new ConflictError('Username is already in use.');
    if (existingEmail) throw new ConflictError('Email is already in use.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.member.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        department: input.department || null,
        position: input.position || null,
        roleId,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    return {
      user: this.mapUser(user),
      tempPassword: password,
    };
  }

  async update(id: string, input: UpdateAdminUserInput) {
    const existingUser = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) throw new NotFoundError('User not found.');

    const email = input.email == null ? undefined : String(input.email).trim().toLowerCase();
    if (email && email !== existingUser.email) {
      const duplicate = await this.prisma.member.findUnique({ where: { email }, select: { id: true } });
      if (duplicate) throw new ConflictError('Email is already in use.');
    }

    const roleId = input.role ? await this.findRoleId(input.role) : undefined;
    const user = await this.prisma.member.update({
      where: { id },
      data: {
        name: input.name,
        email: email || undefined,
        department: input.department,
        position: input.position,
        isActive: input.isActive,
        roleId,
      },
      select: userSelect,
    });

    return this.mapUser(user);
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenError('You cannot delete your own admin account.');
    }

    await this.findById(id);
    await this.prisma.member.delete({ where: { id } });
  }

  async resetPassword(userId: string, newPassword?: string) {
    await this.findById(userId);
    const tempPassword = String(newPassword || '').trim() || this.createTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.member.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    return tempPassword;
  }
}
