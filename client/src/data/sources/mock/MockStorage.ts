/**
 * Mock Storage
 * localStorage 기반 데이터 저장소 관리
 */
import type { Task, Project, Member, Team, TeamMember, ActivityLog } from '@/types';
import {
  mockProjects,
  mockTasks,
  mockMembers,
  mockTeams,
  mockTeamMembers,
  mockActivities,
  mockCurrentUser,
} from '@/services/mockData';

// localStorage 키
const STORAGE_KEYS = {
  TASKS: 'workflow_tasks',
  PROJECTS: 'workflow_projects',
  MEMBERS: 'workflow_members',
  TEAMS: 'workflow_teams',
  TEAM_MEMBERS: 'workflow_team_members',
  ACTIVITIES: 'workflow_activities',
} as const;

/**
 * Mock Storage 클래스 (싱글톤)
 */
export class MockStorage {
  private static instance: MockStorage;

  private constructor() {}

  static getInstance(): MockStorage {
    if (!MockStorage.instance) {
      MockStorage.instance = new MockStorage();
    }
    return MockStorage.instance;
  }

  // 지연 시뮬레이션
  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 현재 로그인한 사용자 가져오기
  getCurrentMember(): Member {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          id: user.id || '',
          email: user.email || '',
          name: user.name || '알 수 없음',
          avatarUrl: user.avatarUrl,
          department: user.department,
          position: user.position,
        };
      } catch {
        // 파싱 실패 시 기본값
      }
    }
    return mockCurrentUser;
  }

  // Private helper methods
  private load<T>(key: string, fallback: T[]): T[] {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(`[MockStorage] Failed to load ${key}:`, e);
    }
    return [...fallback];
  }

  private save<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[MockStorage] Failed to save ${key}:`, e);
    }
  }

  // Tasks
  get tasks(): Task[] {
    return this.load<Task>(STORAGE_KEYS.TASKS, mockTasks);
  }

  set tasks(data: Task[]) {
    this.save(STORAGE_KEYS.TASKS, data);
  }

  // Projects
  get projects(): Project[] {
    return this.load<Project>(STORAGE_KEYS.PROJECTS, mockProjects);
  }

  set projects(data: Project[]) {
    this.save(STORAGE_KEYS.PROJECTS, data);
  }

  // Members
  get members(): Member[] {
    return this.load<Member>(STORAGE_KEYS.MEMBERS, mockMembers);
  }

  set members(data: Member[]) {
    this.save(STORAGE_KEYS.MEMBERS, data);
  }

  // Teams
  get teams(): Team[] {
    return this.load<Team>(STORAGE_KEYS.TEAMS, mockTeams);
  }

  set teams(data: Team[]) {
    this.save(STORAGE_KEYS.TEAMS, data);
  }

  // Team Members
  get teamMembers(): TeamMember[] {
    return this.load<TeamMember>(STORAGE_KEYS.TEAM_MEMBERS, mockTeamMembers);
  }

  set teamMembers(data: TeamMember[]) {
    this.save(STORAGE_KEYS.TEAM_MEMBERS, data);
  }

  // Activities
  get activities(): ActivityLog[] {
    return this.load<ActivityLog>(STORAGE_KEYS.ACTIVITIES, mockActivities);
  }

  set activities(data: ActivityLog[]) {
    this.save(STORAGE_KEYS.ACTIVITIES, data);
  }

  // 활동 로그 추가 헬퍼
  addActivity(
    action: 'created' | 'updated' | 'moved' | 'deleted',
    task: Task,
    member: Member,
    details?: Record<string, unknown>
  ): ActivityLog {
    const activity: ActivityLog = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      memberId: member.id,
      action,
      details,
      member: {
        id: member.id,
        email: member.email || '',
        name: member.name,
        avatarUrl: member.avatarUrl,
        department: member.department,
        position: member.position,
      },
      task: {
        id: task.id,
        title: task.title,
        project: task.project,
      },
      createdAt: new Date().toISOString(),
    };

    const activities = this.activities;
    activities.unshift(activity);

    // 최대 100개까지만 유지
    if (activities.length > 100) {
      activities.splice(100);
    }

    this.activities = activities;
    return activity;
  }

  // 고유 ID 생성
  generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 데이터 초기화 (테스트용)
  reset(): void {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.TEAMS);
    localStorage.removeItem(STORAGE_KEYS.TEAM_MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
  }
}
