/**
 * Member Repository 인터페이스
 * 멤버(사용자) 데이터 접근을 위한 추상화 계층
 */
import type { Member, Task, Role } from '@/types';

// DTO (Data Transfer Objects)
export interface InviteMemberDTO {
  email: string;
  name: string;
  department?: string;
  position?: string;
  roleId?: string;
}

export interface UpdateMemberDTO {
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
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  total: number;
  overdue: number;
}

// Repository 인터페이스
export interface IMemberRepository {
  // Query methods (조회)
  findAll(params?: MemberListParams): Promise<Member[]>;
  findById(id: string): Promise<Member>;
  findByEmail(email: string): Promise<Member | null>;
  getCurrentMember(): Promise<Member>;

  // Command methods (변경)
  invite(data: InviteMemberDTO): Promise<Member>;
  update(id: string, data: UpdateMemberDTO): Promise<Member>;
  remove(id: string): Promise<void>;
  activate(id: string): Promise<Member>;
  deactivate(id: string): Promise<Member>;

  // Task methods (업무 관련)
  getTasks(memberId: string): Promise<Task[]>;
  getWorkload(memberId: string): Promise<MemberWorkload>;
  getWorkloads(): Promise<MemberWorkload[]>;

  // Role methods (역할 관련)
  getRoles(): Promise<Role[]>;
  assignRole(memberId: string, roleId: string): Promise<Member>;
}
