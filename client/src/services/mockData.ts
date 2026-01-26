import type { Member, Project, Task, ActivityLog, Team, TeamMember } from '@/types';

/**
 * Mock Data - 운영 배포용 (빈 상태)
 * 실제 데이터는 PHP API + MySQL에서 관리됩니다.
 */

// 빈 데이터로 초기화
export const mockMembers: Member[] = [];
export const mockProjects: Project[] = [];
export const mockTasks: Task[] = [];
export const mockActivities: ActivityLog[] = [];
export const mockTeams: Team[] = [];
export const mockTeamMembers: TeamMember[] = [];

// 현재 사용자 (로그인 전 기본값)
export const mockCurrentUser: Member = {
  id: '',
  email: '',
  name: '게스트',
};
