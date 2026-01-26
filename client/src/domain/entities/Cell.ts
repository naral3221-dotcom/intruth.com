/**
 * Cell (셀 그룹) 엔티티 정의
 */
import type { Member } from '@/types';

// 셀 멤버 역할
export type CellMemberRole = 'LEADER' | 'SUB_LEADER' | 'MEMBER';

// 셀 엔티티
export interface Cell {
  id: string;
  name: string;
  description?: string;
  color: string;
  leaderId: string;
  leader?: Pick<Member, 'id' | 'name' | 'email' | 'avatarUrl'>;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 셀 멤버 엔티티
export interface CellMember {
  id: string;
  cellId: string;
  memberId: string;
  role: CellMemberRole;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  member?: Pick<Member, 'id' | 'name' | 'email' | 'avatarUrl' | 'department' | 'position'>;
}

// 내가 속한 셀 (추가 정보 포함)
export interface MyCellInfo extends Cell {
  myRole: CellMemberRole;
  joinedAt: string;
}
