/**
 * DI Container
 * 서비스 인스턴스를 중앙에서 관리하고 의존성 주입을 제공
 */
import { getPrismaClient } from '../shared/database.js';
import { ActivityLogService } from '../services/ActivityLogService.js';
import { TaskService } from '../services/TaskService.js';
import { ProjectService } from '../services/ProjectService.js';
import { MemberService } from '../services/MemberService.js';
import { DashboardService } from '../services/DashboardService.js';
import { AuthService } from '../services/AuthService.js';
import { MeetingService } from '../services/MeetingService.js';
import { CellService } from '../services/CellService.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { AiTranscriptionService } from '../services/ai/index.js';
import { IStorageService, LocalStorageService } from '../services/storage/index.js';

// 서비스 타입 정의
type ServiceName =
  | 'ActivityLogService'
  | 'TaskService'
  | 'ProjectService'
  | 'MemberService'
  | 'DashboardService'
  | 'AuthService'
  | 'MeetingService'
  | 'StorageService'
  | 'CellService'
  | 'AttendanceService'
  | 'AiTranscriptionService';

interface ServiceMap {
  ActivityLogService: ActivityLogService;
  TaskService: TaskService;
  ProjectService: ProjectService;
  MemberService: MemberService;
  DashboardService: DashboardService;
  AuthService: AuthService;
  MeetingService: MeetingService;
  StorageService: IStorageService;
  CellService: CellService;
  AttendanceService: AttendanceService;
  AiTranscriptionService: AiTranscriptionService;
}

/**
 * DI Container 클래스
 * 싱글톤 패턴으로 서비스 인스턴스를 관리
 */
class Container {
  private instances: Map<string, unknown> = new Map();
  private initialized = false;

  /**
   * 컨테이너 초기화
   * 모든 서비스 인스턴스를 생성하고 의존성을 연결
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    const prisma = getPrismaClient();

    // 의존성 순서대로 서비스 등록
    // 1. 기본 서비스 (의존성 없음)
    const activityLogService = new ActivityLogService(prisma);
    this.instances.set('ActivityLogService', activityLogService);

    // 2. ActivityLogService에 의존하는 서비스
    const taskService = new TaskService(prisma, activityLogService);
    this.instances.set('TaskService', taskService);

    // 3. 독립적인 서비스
    const projectService = new ProjectService(prisma);
    this.instances.set('ProjectService', projectService);

    const memberService = new MemberService(prisma);
    this.instances.set('MemberService', memberService);

    const dashboardService = new DashboardService(prisma);
    this.instances.set('DashboardService', dashboardService);

    const authService = new AuthService(prisma);
    this.instances.set('AuthService', authService);

    // 4. 스토리지 서비스 (추후 OneDriveStorageService로 교체 가능)
    const storageService = new LocalStorageService();
    this.instances.set('StorageService', storageService);

    // 5. 스토리지 의존 서비스
    const meetingService = new MeetingService(prisma, storageService);
    this.instances.set('MeetingService', meetingService);

    const aiTranscriptionService = new AiTranscriptionService(prisma, storageService);
    this.instances.set('AiTranscriptionService', aiTranscriptionService);

    // 6. 셀 출석 관련 서비스
    const cellService = new CellService(prisma);
    this.instances.set('CellService', cellService);

    const attendanceService = new AttendanceService(prisma);
    this.instances.set('AttendanceService', attendanceService);

    this.initialized = true;
    console.log('[DI] Container initialized with services:', Array.from(this.instances.keys()));
  }

  /**
   * 서비스 인스턴스 조회
   */
  resolve<K extends ServiceName>(name: K): ServiceMap[K] {
    if (!this.initialized) {
      this.initialize();
    }

    const instance = this.instances.get(name);
    if (!instance) {
      throw new Error(`Service ${name} not found in container`);
    }
    return instance as ServiceMap[K];
  }

  /**
   * 서비스 등록 (테스트용)
   */
  register<K extends ServiceName>(name: K, instance: ServiceMap[K]): void {
    this.instances.set(name, instance);
  }

  /**
   * 컨테이너 리셋 (테스트용)
   */
  reset(): void {
    this.instances.clear();
    this.initialized = false;
  }

  /**
   * 초기화 여부 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// 싱글톤 인스턴스
export const container = new Container();

// 편의 함수들
export function getTaskService(): TaskService {
  return container.resolve('TaskService');
}

export function getProjectService(): ProjectService {
  return container.resolve('ProjectService');
}

export function getMemberService(): MemberService {
  return container.resolve('MemberService');
}

export function getActivityLogService(): ActivityLogService {
  return container.resolve('ActivityLogService');
}

export function getDashboardService(): DashboardService {
  return container.resolve('DashboardService');
}

export function getAuthService(): AuthService {
  return container.resolve('AuthService');
}

export function getMeetingService(): MeetingService {
  return container.resolve('MeetingService');
}

export function getStorageService(): IStorageService {
  return container.resolve('StorageService');
}

export function getCellService(): CellService {
  return container.resolve('CellService');
}

export function getAttendanceService(): AttendanceService {
  return container.resolve('AttendanceService');
}

export function getAiTranscriptionService(): AiTranscriptionService {
  return container.resolve('AiTranscriptionService');
}
