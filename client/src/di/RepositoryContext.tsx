/**
 * Repository Context
 * Repository 인스턴스를 React 컴포넌트에 제공하는 Context
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { ITaskRepository } from '@/domain/repositories/ITaskRepository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import type { IMemberRepository } from '@/domain/repositories/IMemberRepository';
import type { ITeamRepository } from '@/domain/repositories/ITeamRepository';
import type { IDashboardRepository } from '@/domain/repositories/IDashboardRepository';
import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';
import type { IRoutineRepository } from '@/domain/repositories/IRoutineRepository';
import type { IMeetingRepository } from '@/domain/repositories/IMeetingRepository';
import type { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import type { ICellRepository } from '@/domain/repositories/ICellRepository';
import type { IAttendanceRepository } from '@/domain/repositories/IAttendanceRepository';

/**
 * Repository 컨테이너 인터페이스
 */
export interface Repositories {
  taskRepository: ITaskRepository;
  projectRepository: IProjectRepository;
  memberRepository: IMemberRepository;
  teamRepository: ITeamRepository;
  dashboardRepository: IDashboardRepository;
  authRepository: IAuthRepository;
  routineRepository: IRoutineRepository;
  meetingRepository: IMeetingRepository;
  adminRepository: IAdminRepository;
  cellRepository: ICellRepository;
  attendanceRepository: IAttendanceRepository;
}

/**
 * Repository Context
 */
const RepositoryContext = createContext<Repositories | null>(null);

/**
 * Repository를 사용하기 위한 Hook
 * @throws RepositoryProvider 외부에서 사용시 에러
 */
export function useRepositories(): Repositories {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
}

/**
 * 개별 Repository를 사용하기 위한 Hooks
 */
export function useTaskRepository(): ITaskRepository {
  return useRepositories().taskRepository;
}

export function useProjectRepository(): IProjectRepository {
  return useRepositories().projectRepository;
}

export function useMemberRepository(): IMemberRepository {
  return useRepositories().memberRepository;
}

export function useTeamRepository(): ITeamRepository {
  return useRepositories().teamRepository;
}

export function useDashboardRepository(): IDashboardRepository {
  return useRepositories().dashboardRepository;
}

export function useAuthRepository(): IAuthRepository {
  return useRepositories().authRepository;
}

export function useRoutineRepository(): IRoutineRepository {
  return useRepositories().routineRepository;
}

export function useMeetingRepository(): IMeetingRepository {
  return useRepositories().meetingRepository;
}

export function useAdminRepository(): IAdminRepository {
  return useRepositories().adminRepository;
}

export function useCellRepository(): ICellRepository {
  return useRepositories().cellRepository;
}

export function useAttendanceRepository(): IAttendanceRepository {
  return useRepositories().attendanceRepository;
}

export { RepositoryContext };
