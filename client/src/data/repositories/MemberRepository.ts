/**
 * Member Repository 구현체
 * IMemberRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
 */
import type {
  IMemberRepository,
  InviteMemberDTO,
  UpdateMemberDTO,
  MemberListParams,
  MemberWorkload
} from '@/domain/repositories/IMemberRepository';
import type { Member, Task, Role } from '@/types';
import { MemberApiSource } from '../sources/api/MemberApiSource';

export class MemberRepository implements IMemberRepository {
  constructor(private readonly apiSource: MemberApiSource) {}

  async findAll(params?: MemberListParams): Promise<Member[]> {
    return this.apiSource.list({
      department: params?.department,
      position: params?.position,
      roleId: params?.roleId,
      isActive: params?.isActive,
    });
  }

  async findById(id: string): Promise<Member> {
    return this.apiSource.get(id);
  }

  async findByEmail(email: string): Promise<Member | null> {
    return this.apiSource.getByEmail(email);
  }

  async getCurrentMember(): Promise<Member> {
    return this.apiSource.getCurrentMember();
  }

  async invite(data: InviteMemberDTO): Promise<Member> {
    return this.apiSource.invite({
      email: data.email,
      name: data.name,
      department: data.department,
      position: data.position,
      roleId: data.roleId,
    });
  }

  async update(id: string, data: UpdateMemberDTO): Promise<Member> {
    return this.apiSource.update(id, {
      name: data.name,
      email: data.email,
      department: data.department,
      position: data.position,
      avatarUrl: data.avatarUrl,
      roleId: data.roleId,
      isActive: data.isActive,
    });
  }

  async remove(id: string): Promise<void> {
    return this.apiSource.remove(id);
  }

  async activate(id: string): Promise<Member> {
    return this.apiSource.activate(id);
  }

  async deactivate(id: string): Promise<Member> {
    return this.apiSource.deactivate(id);
  }

  async getTasks(memberId: string): Promise<Task[]> {
    return this.apiSource.getTasks(memberId);
  }

  async getWorkload(memberId: string): Promise<MemberWorkload> {
    return this.apiSource.getWorkload(memberId);
  }

  async getWorkloads(): Promise<MemberWorkload[]> {
    return this.apiSource.getWorkloads();
  }

  async getRoles(): Promise<Role[]> {
    return this.apiSource.getRoles();
  }

  async assignRole(memberId: string, roleId: string): Promise<Member> {
    return this.apiSource.assignRole(memberId, roleId);
  }
}
