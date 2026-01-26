/**
 * Member Service
 * 멤버 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

// Input DTOs
export interface InviteMemberInput {
  email: string;
  name: string;
  username: string;
  password?: string;
  department?: string;
  position?: string;
  roleId?: string;
}

export interface UpdateMemberInput {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  avatarUrl?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface MemberListParams {
  department?: string;
  position?: string;
  roleId?: string;
  isActive?: boolean;
  search?: string;
}

export interface MemberWorkload {
  memberId: string;
  memberName: string;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  total: number;
  overdue: number;
}

export class MemberService {
  private readonly defaultSelect = {
    id: true,
    username: true,
    email: true,
    name: true,
    avatarUrl: true,
    department: true,
    position: true,
    isActive: true,
    role: {
      select: {
        id: true,
        name: true,
        permissions: true,
      },
    },
    createdAt: true,
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * 멤버 목록 조회
   */
  async findAll(params?: MemberListParams) {
    const where: Prisma.MemberWhereInput = {};

    if (params?.department) where.department = params.department;
    if (params?.position) where.position = params.position;
    if (params?.roleId) where.roleId = params.roleId;
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.member.findMany({
      where,
      select: this.defaultSelect,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 멤버 상세 조회
   */
  async findById(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: this.defaultSelect,
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    return member;
  }

  /**
   * 이메일로 멤버 조회
   */
  async findByEmail(email: string) {
    return this.prisma.member.findUnique({
      where: { email },
      select: this.defaultSelect,
    });
  }

  /**
   * 멤버 초대 (생성)
   */
  async invite(input: InviteMemberInput) {
    // 이메일 중복 확인
    const existingEmail = await this.prisma.member.findUnique({
      where: { email: input.email },
    });

    if (existingEmail) {
      throw new ConflictError('이미 사용 중인 이메일입니다.');
    }

    // 사용자명 중복 확인
    const existingUsername = await this.prisma.member.findUnique({
      where: { username: input.username },
    });

    if (existingUsername) {
      throw new ConflictError('이미 사용 중인 사용자명입니다.');
    }

    return this.prisma.member.create({
      data: {
        email: input.email,
        name: input.name,
        username: input.username,
        password: input.password || 'temp1234', // 임시 비밀번호
        department: input.department,
        position: input.position,
        roleId: input.roleId,
        mustChangePassword: true,
      },
      select: this.defaultSelect,
    });
  }

  /**
   * 멤버 정보 수정
   */
  async update(id: string, input: UpdateMemberInput) {
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    // 이메일 변경 시 중복 확인
    if (input.email && input.email !== existingMember.email) {
      const existingEmail = await this.prisma.member.findUnique({
        where: { email: input.email },
      });

      if (existingEmail) {
        throw new ConflictError('이미 사용 중인 이메일입니다.');
      }
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        department: input.department,
        position: input.position,
        avatarUrl: input.avatarUrl,
        roleId: input.roleId,
        isActive: input.isActive,
      },
      select: this.defaultSelect,
    });
  }

  /**
   * 멤버 삭제
   */
  async remove(id: string) {
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    await this.prisma.member.delete({ where: { id } });
  }

  /**
   * 멤버 활성화
   */
  async activate(id: string) {
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    return this.prisma.member.update({
      where: { id },
      data: { isActive: true },
      select: this.defaultSelect,
    });
  }

  /**
   * 멤버 비활성화
   */
  async deactivate(id: string) {
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    return this.prisma.member.update({
      where: { id },
      data: { isActive: false },
      select: this.defaultSelect,
    });
  }

  /**
   * 멤버의 업무 목록 조회
   */
  async getTasks(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    return this.prisma.task.findMany({
      where: { assigneeId: memberId },
      include: {
        project: { select: { id: true, name: true } },
        labels: { include: { label: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  /**
   * 멤버의 업무량 조회
   */
  async getWorkload(memberId: string): Promise<MemberWorkload> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true },
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    const tasks = await this.prisma.task.findMany({
      where: { assigneeId: memberId },
      select: { status: true, dueDate: true },
    });

    const now = new Date();
    const workload: MemberWorkload = {
      memberId: member.id,
      memberName: member.name,
      todo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      total: tasks.length,
      overdue: 0,
    };

    for (const task of tasks) {
      switch (task.status) {
        case 'TODO':
          workload.todo++;
          break;
        case 'IN_PROGRESS':
          workload.inProgress++;
          break;
        case 'REVIEW':
          workload.review++;
          break;
        case 'DONE':
          workload.done++;
          break;
      }

      // 기한 초과 확인 (DONE이 아닌 경우만)
      if (task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < now) {
        workload.overdue++;
      }
    }

    return workload;
  }

  /**
   * 전체 멤버 업무량 조회
   */
  async getWorkloads(): Promise<MemberWorkload[]> {
    const members = await this.prisma.member.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const workloads: MemberWorkload[] = [];

    for (const member of members) {
      const workload = await this.getWorkload(member.id);
      workloads.push(workload);
    }

    return workloads;
  }

  /**
   * 역할 목록 조회
   */
  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 멤버에게 역할 할당
   */
  async assignRole(memberId: string, roleId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('역할을 찾을 수 없습니다.');
    }

    return this.prisma.member.update({
      where: { id: memberId },
      data: { roleId },
      select: this.defaultSelect,
    });
  }
}
