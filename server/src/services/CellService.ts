/**
 * Cell Service
 * 셀 그룹 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

// Input DTOs
export interface CreateCellInput {
  name: string;
  description?: string;
  color?: string;
  leaderId: string;
}

export interface UpdateCellInput {
  name?: string;
  description?: string;
  color?: string;
  leaderId?: string;
  isActive?: boolean;
}

export interface CellListParams {
  leaderId?: string;
  isActive?: boolean;
  search?: string;
}

export interface AddCellMemberInput {
  memberId: string;
  role?: 'LEADER' | 'SUB_LEADER' | 'MEMBER';
}

export interface UpdateCellMemberInput {
  role?: 'LEADER' | 'SUB_LEADER' | 'MEMBER';
  isActive?: boolean;
}

export class CellService {
  private readonly defaultCellSelect = {
    id: true,
    name: true,
    description: true,
    color: true,
    leaderId: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    leader: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        members: {
          where: { isActive: true },
        },
      },
    },
  };

  private readonly defaultMemberSelect = {
    id: true,
    cellId: true,
    memberId: true,
    role: true,
    joinedAt: true,
    leftAt: true,
    isActive: true,
    member: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        department: true,
        position: true,
      },
    },
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * 셀 목록 조회
   */
  async findAll(params?: CellListParams) {
    const where: Prisma.CellWhereInput = {};

    if (params?.leaderId) where.leaderId = params.leaderId;
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    const cells = await this.prisma.cell.findMany({
      where,
      select: this.defaultCellSelect,
      orderBy: { name: 'asc' },
    });

    return cells.map((cell) => ({
      ...cell,
      memberCount: cell._count.members,
      _count: undefined,
    }));
  }

  /**
   * 셀 상세 조회
   */
  async findById(id: string) {
    const cell = await this.prisma.cell.findUnique({
      where: { id },
      select: this.defaultCellSelect,
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    return {
      ...cell,
      memberCount: cell._count.members,
      _count: undefined,
    };
  }

  /**
   * 리더 ID로 셀 조회
   */
  async findByLeaderId(leaderId: string) {
    const cells = await this.prisma.cell.findMany({
      where: { leaderId, isActive: true },
      select: this.defaultCellSelect,
      orderBy: { name: 'asc' },
    });

    return cells.map((cell) => ({
      ...cell,
      memberCount: cell._count.members,
      _count: undefined,
    }));
  }

  /**
   * 셀 생성
   */
  async create(input: CreateCellInput) {
    // 리더 존재 확인
    const leader = await this.prisma.member.findUnique({
      where: { id: input.leaderId },
    });

    if (!leader) {
      throw new NotFoundError('리더를 찾을 수 없습니다.');
    }

    const cell = await this.prisma.cell.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color || '#00bcd4',
        leaderId: input.leaderId,
      },
      select: this.defaultCellSelect,
    });

    // 리더를 셀 멤버로 자동 추가
    await this.prisma.cellMember.create({
      data: {
        cellId: cell.id,
        memberId: input.leaderId,
        role: 'LEADER',
      },
    });

    return {
      ...cell,
      memberCount: 1,
      _count: undefined,
    };
  }

  /**
   * 셀 수정
   */
  async update(id: string, input: UpdateCellInput) {
    const existingCell = await this.prisma.cell.findUnique({
      where: { id },
    });

    if (!existingCell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    // 리더 변경 시 존재 확인
    if (input.leaderId && input.leaderId !== existingCell.leaderId) {
      const newLeader = await this.prisma.member.findUnique({
        where: { id: input.leaderId },
      });

      if (!newLeader) {
        throw new NotFoundError('새 리더를 찾을 수 없습니다.');
      }

      // 기존 리더의 역할을 MEMBER로 변경
      await this.prisma.cellMember.updateMany({
        where: { cellId: id, memberId: existingCell.leaderId },
        data: { role: 'MEMBER' },
      });

      // 새 리더가 이미 멤버인지 확인
      const existingMembership = await this.prisma.cellMember.findUnique({
        where: { cellId_memberId: { cellId: id, memberId: input.leaderId } },
      });

      if (existingMembership) {
        // 기존 멤버라면 역할을 LEADER로 변경
        await this.prisma.cellMember.update({
          where: { id: existingMembership.id },
          data: { role: 'LEADER', isActive: true },
        });
      } else {
        // 새 멤버라면 추가
        await this.prisma.cellMember.create({
          data: {
            cellId: id,
            memberId: input.leaderId,
            role: 'LEADER',
          },
        });
      }
    }

    const cell = await this.prisma.cell.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        leaderId: input.leaderId,
        isActive: input.isActive,
      },
      select: this.defaultCellSelect,
    });

    return {
      ...cell,
      memberCount: cell._count.members,
      _count: undefined,
    };
  }

  /**
   * 셀 삭제
   */
  async delete(id: string) {
    const existingCell = await this.prisma.cell.findUnique({
      where: { id },
    });

    if (!existingCell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    await this.prisma.cell.delete({ where: { id } });
  }

  /**
   * 셀 구성원 목록 조회
   */
  async getMembers(cellId: string, includeInactive = false) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    const where: Prisma.CellMemberWhereInput = { cellId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.cellMember.findMany({
      where,
      select: this.defaultMemberSelect,
      orderBy: [
        { role: 'asc' }, // LEADER -> MEMBER -> SUB_LEADER 순
        { joinedAt: 'asc' },
      ],
    });
  }

  /**
   * 셀에 구성원 추가
   */
  async addMember(cellId: string, input: AddCellMemberInput) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: input.memberId },
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    // 이미 멤버인지 확인
    const existingMembership = await this.prisma.cellMember.findUnique({
      where: { cellId_memberId: { cellId, memberId: input.memberId } },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictError('이미 셀에 속한 멤버입니다.');
      }
      // 비활성 멤버라면 다시 활성화
      return this.prisma.cellMember.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          role: input.role || 'MEMBER',
          leftAt: null,
        },
        select: this.defaultMemberSelect,
      });
    }

    return this.prisma.cellMember.create({
      data: {
        cellId,
        memberId: input.memberId,
        role: input.role || 'MEMBER',
      },
      select: this.defaultMemberSelect,
    });
  }

  /**
   * 셀에서 구성원 제거 (소프트 삭제)
   */
  async removeMember(cellId: string, memberId: string) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    // 리더는 제거 불가
    if (cell.leaderId === memberId) {
      throw new ValidationError('셀 리더는 제거할 수 없습니다. 먼저 리더를 변경해주세요.');
    }

    const membership = await this.prisma.cellMember.findUnique({
      where: { cellId_memberId: { cellId, memberId } },
    });

    if (!membership) {
      throw new NotFoundError('셀 구성원을 찾을 수 없습니다.');
    }

    await this.prisma.cellMember.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  /**
   * 구성원 역할 변경
   */
  async updateMemberRole(cellId: string, memberId: string, input: UpdateCellMemberInput) {
    const membership = await this.prisma.cellMember.findUnique({
      where: { cellId_memberId: { cellId, memberId } },
    });

    if (!membership) {
      throw new NotFoundError('셀 구성원을 찾을 수 없습니다.');
    }

    return this.prisma.cellMember.update({
      where: { id: membership.id },
      data: {
        role: input.role,
        isActive: input.isActive,
      },
      select: this.defaultMemberSelect,
    });
  }

  /**
   * 멤버가 속한 셀 목록 조회
   */
  async getCellsByMemberId(memberId: string) {
    const memberships = await this.prisma.cellMember.findMany({
      where: { memberId, isActive: true },
      select: {
        role: true,
        joinedAt: true,
        cell: {
          select: this.defaultCellSelect,
        },
      },
    });

    return memberships.map((m) => ({
      ...m.cell,
      memberCount: m.cell._count.members,
      _count: undefined,
      myRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }
}
