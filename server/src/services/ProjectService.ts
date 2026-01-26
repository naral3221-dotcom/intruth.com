/**
 * Project Service
 * 프로젝트 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../shared/errors.js';

// Input DTOs
export interface CreateProjectInput {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  ownerId: string;
  teamIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'ON_HOLD';
  startDate?: Date;
  endDate?: Date;
  teamIds?: string[];
}

export interface ProjectListParams {
  memberId?: string;
  status?: string;
  teamId?: string;
}

export interface AddProjectMemberInput {
  memberId: string;
  role?: 'OWNER' | 'EDITOR' | 'VIEWER';
}

export class ProjectService {
  private readonly defaultInclude = {
    owner: { select: { id: true, name: true, avatarUrl: true } },
    members: {
      include: {
        member: { select: { id: true, name: true, avatarUrl: true } },
      },
    },
    _count: { select: { tasks: true } },
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * 멤버가 접근 가능한 프로젝트 목록 조회
   */
  async findAllForMember(memberId: string, params?: ProjectListParams) {
    const where: Prisma.ProjectWhereInput = {
      OR: [
        { ownerId: memberId },
        { members: { some: { memberId } } },
      ],
    };

    if (params?.status) {
      where.status = params.status;
    }
    // Note: teamId filtering removed - no Team model in schema

    return this.prisma.project.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 프로젝트 상세 조회
   */
  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude,
        labels: true,
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 생성
   */
  async create(input: CreateProjectInput) {
    if (!input.name?.trim()) {
      throw new ValidationError('프로젝트 이름은 필수입니다.');
    }

    return this.prisma.project.create({
      data: {
        name: input.name.trim(),
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        ownerId: input.ownerId,
        // 생성자를 OWNER로 자동 추가
        members: {
          create: {
            memberId: input.ownerId,
            role: 'OWNER',
          },
        },
        // Note: team connection removed - no Team model in schema
      },
      include: this.defaultInclude,
    });
  }

  /**
   * 프로젝트 수정
   */
  async update(id: string, input: UpdateProjectInput) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        // Note: team update removed - no Team model in schema
      },
      include: this.defaultInclude,
    });
  }

  /**
   * 프로젝트 삭제
   */
  async delete(id: string) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    // 관련 데이터 삭제 (cascade 설정에 따라)
    await this.prisma.project.delete({ where: { id } });
  }

  /**
   * 프로젝트 멤버 목록 조회
   */
  async getMembers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    return project.members;
  }

  /**
   * 프로젝트 멤버 추가
   */
  async addMember(projectId: string, input: AddProjectMemberInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId,
          memberId: input.memberId,
        },
      },
    });

    if (existingMember) {
      throw new ValidationError('이미 프로젝트 멤버입니다.');
    }

    return this.prisma.projectMember.create({
      data: {
        projectId,
        memberId: input.memberId,
        role: input.role || 'VIEWER',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            position: true,
          },
        },
      },
    });
  }

  /**
   * 프로젝트 멤버 역할 변경
   */
  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
  ) {
    const projectMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_memberId: { projectId, memberId },
      },
    });

    if (!projectMember) {
      throw new NotFoundError('프로젝트 멤버를 찾을 수 없습니다.');
    }

    return this.prisma.projectMember.update({
      where: {
        projectId_memberId: { projectId, memberId },
      },
      data: { role },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * 프로젝트 멤버 제거
   */
  async removeMember(projectId: string, memberId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    // 소유자는 제거 불가
    if (project.ownerId === memberId) {
      throw new ForbiddenError('프로젝트 소유자는 제거할 수 없습니다.');
    }

    const projectMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_memberId: { projectId, memberId },
      },
    });

    if (!projectMember) {
      throw new NotFoundError('프로젝트 멤버를 찾을 수 없습니다.');
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_memberId: { projectId, memberId },
      },
    });
  }

  /**
   * 프로젝트 라벨 추가
   */
  async addLabel(projectId: string, data: { name: string; color: string }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('프로젝트를 찾을 수 없습니다.');
    }

    return this.prisma.taskLabel.create({
      data: {
        projectId,
        name: data.name,
        color: data.color,
      },
    });
  }

  /**
   * 프로젝트 라벨 수정
   */
  async updateLabel(
    projectId: string,
    labelId: string,
    data: { name?: string; color?: string }
  ) {
    const label = await this.prisma.taskLabel.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundError('라벨을 찾을 수 없습니다.');
    }

    return this.prisma.taskLabel.update({
      where: { id: labelId },
      data: {
        name: data.name,
        color: data.color,
      },
    });
  }

  /**
   * 프로젝트 라벨 삭제
   */
  async removeLabel(projectId: string, labelId: string) {
    const label = await this.prisma.taskLabel.findFirst({
      where: { id: labelId, projectId },
    });

    if (!label) {
      throw new NotFoundError('라벨을 찾을 수 없습니다.');
    }

    await this.prisma.taskLabel.delete({ where: { id: labelId } });
  }
}
