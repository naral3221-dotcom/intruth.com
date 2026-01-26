/**
 * Mock Member Repository
 * IMemberRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
import type {
  IMemberRepository,
  InviteMemberDTO,
  UpdateMemberDTO,
  MemberListParams,
  MemberWorkload
} from '@/domain/repositories/IMemberRepository';
import type { Member, Task, Role } from '@/types';
import { MockStorage } from './MockStorage';

// Mock 역할 데이터
const mockRoles: Role[] = [
  { id: 'role-admin', name: '관리자', permissions: ['*'] },
  { id: 'role-manager', name: '매니저', permissions: ['project:read', 'project:write', 'task:*', 'member:read'] },
  { id: 'role-member', name: '팀원', permissions: ['project:read', 'task:*'] },
];

export class MockMemberRepository implements IMemberRepository {
  private storage = MockStorage.getInstance();

  async findAll(params?: MemberListParams): Promise<Member[]> {
    await this.storage.delay(300);
    let members = [...this.storage.members];

    if (params?.department) {
      members = members.filter((m) => m.department === params.department);
    }
    if (params?.position) {
      members = members.filter((m) => m.position === params.position);
    }
    if (params?.isActive !== undefined) {
      members = members.filter((m) => m.isActive === params.isActive);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      members = members.filter((m) =>
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower) ||
        m.department?.toLowerCase().includes(searchLower)
      );
    }

    return members;
  }

  async findById(id: string): Promise<Member> {
    await this.storage.delay(200);
    const member = this.storage.members.find((m) => m.id === id);
    if (!member) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }
    return member;
  }

  async findByEmail(email: string): Promise<Member | null> {
    await this.storage.delay(200);
    return this.storage.members.find((m) => m.email === email) || null;
  }

  async getCurrentMember(): Promise<Member> {
    await this.storage.delay(100);
    return this.storage.getCurrentMember();
  }

  async invite(data: InviteMemberDTO): Promise<Member> {
    await this.storage.delay(300);
    const members = this.storage.members;

    // 이메일 중복 체크
    const existing = members.find((m) => m.email === data.email);
    if (existing) {
      throw new Error('이미 등록된 이메일입니다.');
    }

    const role = mockRoles.find((r) => r.id === data.roleId);
    const newMember: Member = {
      id: this.storage.generateId('member'),
      email: data.email,
      name: data.name,
      department: data.department,
      position: data.position,
      avatarUrl: null,
      isActive: true,
      role: role || undefined,
      createdAt: new Date().toISOString(),
    };

    members.push(newMember);
    this.storage.members = members;

    return newMember;
  }

  async update(id: string, data: UpdateMemberDTO): Promise<Member> {
    await this.storage.delay(200);
    const members = this.storage.members;
    const index = members.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    // 역할 변경 처리
    let role = members[index].role;
    if (data.roleId !== undefined) {
      role = mockRoles.find((r) => r.id === data.roleId);
    }

    members[index] = {
      ...members[index],
      ...data,
      role,
      updatedAt: new Date().toISOString(),
    };

    this.storage.members = members;
    return members[index];
  }

  async remove(id: string): Promise<void> {
    await this.storage.delay(200);
    const members = this.storage.members;
    const index = members.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new Error('멤버를 찾을 수 없습니다.');
    }

    members.splice(index, 1);
    this.storage.members = members;
  }

  async activate(id: string): Promise<Member> {
    return this.update(id, { isActive: true });
  }

  async deactivate(id: string): Promise<Member> {
    return this.update(id, { isActive: false });
  }

  async getTasks(memberId: string): Promise<Task[]> {
    await this.storage.delay(200);
    const tasks = this.storage.tasks;
    return tasks.filter((t) =>
      t.assignee?.id === memberId ||
      t.assignees?.some((a) => a.id === memberId)
    );
  }

  async getWorkload(memberId: string): Promise<MemberWorkload> {
    await this.storage.delay(200);
    const tasks = await this.getTasks(memberId);
    const now = new Date();

    return {
      memberId,
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: tasks.filter((t) => t.status === 'REVIEW').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      total: tasks.length,
      overdue: tasks.filter((t) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
      ).length,
    };
  }

  async getWorkloads(): Promise<MemberWorkload[]> {
    await this.storage.delay(300);
    const members = this.storage.members;
    const workloads: MemberWorkload[] = [];

    for (const member of members) {
      const workload = await this.getWorkload(member.id);
      workloads.push(workload);
    }

    return workloads;
  }

  async getRoles(): Promise<Role[]> {
    await this.storage.delay(100);
    return [...mockRoles];
  }

  async assignRole(memberId: string, roleId: string): Promise<Member> {
    return this.update(memberId, { roleId });
  }
}
