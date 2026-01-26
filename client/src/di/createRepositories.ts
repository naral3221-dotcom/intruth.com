/**
 * Repository 생성 팩토리
 * 환경에 따라 Mock 또는 API Repository를 생성
 */
import type { Repositories } from './RepositoryContext';

// API-based repositories
import { TaskRepository } from '@/data/repositories/TaskRepository';
import { ProjectRepository } from '@/data/repositories/ProjectRepository';
import { MemberRepository } from '@/data/repositories/MemberRepository';
import { TeamRepository } from '@/data/repositories/TeamRepository';
import { DashboardRepository } from '@/data/repositories/DashboardRepository';
import { AuthRepository } from '@/data/repositories/AuthRepository';
import { RoutineRepository } from '@/data/repositories/RoutineRepository';
import { MeetingRepository } from '@/data/repositories/MeetingRepository';
import { AdminRepository } from '@/data/repositories/AdminRepository';
import { CellRepository } from '@/data/repositories/CellRepository';
import { AttendanceRepository } from '@/data/repositories/AttendanceRepository';

// API Sources
import { HttpClient, createTokenManager } from '@/data/sources/api/HttpClient';
import { TaskApiSource } from '@/data/sources/api/TaskApiSource';
import { ProjectApiSource } from '@/data/sources/api/ProjectApiSource';
import { MemberApiSource } from '@/data/sources/api/MemberApiSource';
import { TeamApiSource } from '@/data/sources/api/TeamApiSource';
import { DashboardApiSource } from '@/data/sources/api/DashboardApiSource';
import { AuthApiSource } from '@/data/sources/api/AuthApiSource';
import { RoutineApiSource } from '@/data/sources/api/RoutineApiSource';
import { MeetingApiSource } from '@/data/sources/api/MeetingApiSource';
import { AdminApiSource } from '@/data/sources/api/AdminApiSource';
import { CellApiSource } from '@/data/sources/api/CellApiSource';
import { AttendanceApiSource } from '@/data/sources/api/AttendanceApiSource';

// Mock-based repositories
import { MockTaskRepository } from '@/data/sources/mock/MockTaskRepository';
import { MockProjectRepository } from '@/data/sources/mock/MockProjectRepository';
import { MockMemberRepository } from '@/data/sources/mock/MockMemberRepository';
import { MockTeamRepository } from '@/data/sources/mock/MockTeamRepository';
import { MockDashboardRepository } from '@/data/sources/mock/MockDashboardRepository';
import { MockAuthRepository } from '@/data/sources/mock/MockAuthRepository';
import { MockRoutineRepository } from '@/data/sources/mock/MockRoutineRepository';
import { MockMeetingRepository } from '@/data/sources/mock/MockMeetingRepository';
import { MockAdminRepository } from '@/data/sources/mock/MockAdminRepository';
import { MockCellRepository } from '@/data/sources/mock/MockCellRepository';
import { MockAttendanceRepository } from '@/data/sources/mock/MockAttendanceRepository';

/**
 * Repository 생성 설정
 */
export interface RepositoryConfig {
  useMock: boolean;
  apiBaseUrl: string;
  getToken: () => string | null;
  onAuthExpired: () => void;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Mock Repository 컨테이너 생성
 */
function createMockRepositories(): Repositories {
  return {
    taskRepository: new MockTaskRepository(),
    projectRepository: new MockProjectRepository(),
    memberRepository: new MockMemberRepository(),
    teamRepository: new MockTeamRepository(),
    dashboardRepository: new MockDashboardRepository(),
    authRepository: new MockAuthRepository(),
    routineRepository: new MockRoutineRepository(),
    meetingRepository: new MockMeetingRepository(),
    adminRepository: new MockAdminRepository(),
    cellRepository: new MockCellRepository(),
    attendanceRepository: new MockAttendanceRepository(),
  };
}

/**
 * API Repository 컨테이너 생성
 */
function createApiRepositories(config: RepositoryConfig): Repositories {
  const tokenManager = createTokenManager();

  const httpClient = new HttpClient(
    {
      baseUrl: config.apiBaseUrl,
      getToken: config.getToken,
      onAuthExpired: config.onAuthExpired,
      logLevel: config.logLevel,
    },
    tokenManager
  );

  // API Sources
  const taskApiSource = new TaskApiSource(httpClient);
  const projectApiSource = new ProjectApiSource(httpClient);
  const memberApiSource = new MemberApiSource(httpClient);
  const teamApiSource = new TeamApiSource(httpClient);
  const dashboardApiSource = new DashboardApiSource(httpClient);
  const authApiSource = new AuthApiSource(httpClient, tokenManager);
  const routineApiSource = new RoutineApiSource(httpClient);
  const meetingApiSource = new MeetingApiSource(httpClient);
  const adminApiSource = new AdminApiSource(httpClient);
  const cellApiSource = new CellApiSource(httpClient);
  const attendanceApiSource = new AttendanceApiSource(httpClient);

  // Repositories
  return {
    taskRepository: new TaskRepository(taskApiSource),
    projectRepository: new ProjectRepository(projectApiSource),
    memberRepository: new MemberRepository(memberApiSource),
    teamRepository: new TeamRepository(teamApiSource),
    dashboardRepository: new DashboardRepository(dashboardApiSource),
    authRepository: new AuthRepository(authApiSource, tokenManager),
    routineRepository: new RoutineRepository(routineApiSource),
    meetingRepository: new MeetingRepository(meetingApiSource),
    adminRepository: new AdminRepository(adminApiSource),
    cellRepository: new CellRepository(cellApiSource),
    attendanceRepository: new AttendanceRepository(attendanceApiSource),
  };
}

/**
 * Repository 컨테이너 생성
 * @param config Repository 생성 설정
 * @returns Repository 컨테이너
 */
export function createRepositories(config: RepositoryConfig): Repositories {
  if (config.useMock) {
    console.info('[DI] Using Mock Repositories');
    return createMockRepositories();
  }

  console.info('[DI] Using API Repositories');
  return createApiRepositories(config);
}
