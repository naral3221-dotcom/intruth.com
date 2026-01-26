import type { Member, Task, Team, TeamMember, CreateTeamInput } from '@/types';

// 업무 통계 인터페이스
export interface TaskStats {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  total: number;
}

// 통계가 포함된 멤버 인터페이스
export interface MemberWithStats extends Member {
  taskStats: TaskStats;
  isOnline: boolean;
}

// 역할 분포 인터페이스
export interface RoleDistribution {
  role: string;
  count: number;
}

// 팀 데이터 인터페이스
export interface TeamData {
  members: MemberWithStats[];
  totalMembers: number;
  activeMembers: number;
  roleDistribution: RoleDistribution[];
}

// 통계 카드 인터페이스
export interface StatCardData {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
  color: string;
  gradient: string;
}

// 팀 필터 인터페이스
export interface TeamFilters {
  searchQuery: string;
  roleFilter: string | null;
}

// useTeam 훅 반환 타입
export interface UseTeamReturn {
  data: TeamData;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getMemberTasks: (memberId: string) => Promise<Task[]>;
}

// ===== 다중 팀 지원을 위한 확장 타입 =====

// 업무 포함된 팀 멤버
export interface TeamMemberWithStats extends TeamMember {
  taskStats: TaskStats;
  tasks: Task[];
  isOnline: boolean;
}

// 멤버 포함된 팀
export interface TeamWithMembers extends Team {
  members: TeamMemberWithStats[];
  memberCount: number;
  activeTaskCount: number;
}

// 팀 목록 통계
export interface TeamListStats {
  totalTeams: number;
  totalMembers: number;
  activeMembers: number;
  totalTasks: number;
  completedTasks: number;
}

// useTeams 훅 반환 타입
export interface UseTeamsReturn {
  teams: TeamWithMembers[];
  stats: TeamListStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTeam: (data: CreateTeamInput) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

// useTeamDetail 훅 반환 타입
export interface UseTeamDetailReturn {
  team: TeamWithMembers | null;
  members: TeamMemberWithStats[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addMember: (memberId: string, role?: 'LEADER' | 'MEMBER') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: 'LEADER' | 'MEMBER') => Promise<void>;
  getMemberTasks: (memberId: string) => Task[];
}

// Re-export for convenience
export type { Team, TeamMember, CreateTeamInput } from '@/types';
