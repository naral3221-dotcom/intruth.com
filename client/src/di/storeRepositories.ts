/**
 * Store용 전역 Repository 인스턴스
 *
 * Zustand Store는 React 컴포넌트 외부에서 실행되므로
 * useRepository() 훅을 사용할 수 없습니다.
 * 대신 이 파일에서 생성된 전역 Repository 인스턴스를 사용합니다.
 */
import { createRepositories, type RepositoryConfig } from './createRepositories';

// 환경 변수에서 설정 읽기
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const config: RepositoryConfig = {
  useMock: USE_MOCK,
  apiBaseUrl: API_BASE_URL,
  getToken: () => localStorage.getItem('token'),
  onAuthExpired: () => {
    // 토큰 만료 시 로그인 페이지로 이동
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  logLevel: import.meta.env.DEV ? 'debug' : 'error',
};

// 전역 Repository 인스턴스 생성
export const repositories = createRepositories(config);

// 개별 Repository 편의 export
export const taskRepository = repositories.taskRepository;
export const projectRepository = repositories.projectRepository;
export const memberRepository = repositories.memberRepository;
export const teamRepository = repositories.teamRepository;
export const dashboardRepository = repositories.dashboardRepository;
export const authRepository = repositories.authRepository;
export const routineRepository = repositories.routineRepository;
export const meetingRepository = repositories.meetingRepository;
export const adminRepository = repositories.adminRepository;
