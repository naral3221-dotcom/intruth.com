# INTRUTH.COM 클린 아키텍처 구현 현황

> **이 파일은 아키텍처 관련 작업이 완료될 때마다 업데이트됩니다.**
> 작업 완료 시 반드시 해당 섹션에 기록을 추가하세요.

---

## 구현 진행률

```
서버 라우트 Service 전환  ████████████████████ 100% (10/10)
클라이언트 Feature Hooks  ████████████████████ 100% (10/10)
Use Case 계층            ████████████████████ 100% (18/18)
Mock Repository          ████████████████████ 100% (10/10)
Repository 계층          ████████████████████ 100% (11/11)
Zustand Store 마이그레이션 ████████████████████ 100% (6/6)
Zustand Store Use Case   ████████████████████ 100% (4/4)
배치 작업 메서드          ████████████████████ 100% (deleteMany, updateMany)
레거시 api.ts 정리        ████████████████████ 100% (파일 삭제 완료)
Service 모듈화           ████████████████████ 100% (AttendanceService 분리)
모바일/PWA/공유/UI 기반  ████████████████████ 3차 완료 (프로젝트 중심 메뉴, 대시보드 일정표, 회의자료 고유 페이지, PWA/Nav/Kakao/PDF)
AI 회의 녹음/자료 생성   ████████████████████ 3차 완료 (브라우저 직접 녹음, OpenAI 전사, 회의자료 초안 자동 생성/검토/적용)
AI 액션 아이템 업무 전환 ████████████████████ 2차 완료 (업무 후보 편집, Task 생성, 담당자 자동 매칭, 생성 업무 공유)
AI Assistant 읽기 모드  ██████████████████░░ 2차 완료 (범위 선택, 자연어 요약, 사용량 기록, 모바일 기록 재열람)
AI 승인 기반 쓰기 Agent ████████████████████ 6차 완료 (생성/수정 Tool Plan, diff 승인, 카카오/PDF 공유 준비 실행)
AI 명령형 에이전트 UI ████████████████████ 6차 완료 (전역 명령창, 계정별 서버 로그/메모리, 승인/diff/공유 실행 카드, 프롬프트 캐시 키)
로컬 우선 LLM Provider ████████████████████ 1차 완료 (LM Studio/OpenClaw 호환 endpoint, OpenAI 폴백, Provider 상태 API)
로컬 서버 개발환경       ████████████████████ 1차 완료 (임베디드 PostgreSQL, 서버 모드 env, dotenv)
실서버 API 호환 라우트   ████████████████████ 3차 완료 (Team DB CRUD, routine-tasks CRUD/완료)
```

**마지막 업데이트**: 2026-05-03

---

## 1. 서버 라우트 (Service 계층 전환)

### 완료됨
| 라우트 | 완료일 | 작업자 | 비고 |
|--------|--------|--------|------|
| `routes/tasks.ts` | 2026-01-25 | Claude | TaskService 사용으로 전환 완료 |
| `routes/projects.ts` | 2026-01-25 | Claude | ProjectService 사용으로 전환 완료 |
| `routes/members.ts` | 2026-01-25 | Claude | MemberService 사용으로 전환 완료 |
| `routes/dashboard.ts` | 2026-01-25 | Claude | DashboardService 생성 및 전환 완료 |
| `routes/auth.ts` | 2026-01-25 | Claude | AuthService 생성 및 전환 완료 |
| `routes/auth.ts` 아이디 로그인 전환 | 2026-05-02 | Codex | 이메일 조회 제거, username 기반 로그인 계약 적용 |
| `routes/meetings.ts` | 2026-01-25 | Claude | MeetingService + IStorageService 아키텍처 |
| `routes/cells.ts` | 2026-01-25 | Claude | CellService 사용, 셀 그룹 관리 |
| `routes/attendance.ts` | 2026-01-25 | Claude | AttendanceService 사용, 출석체크 기능 |
| `routes/ai.ts` | 2026-05-01 | Codex | AiTranscriptionService/AiAssistantService/AgentToolRegistry 사용, 회의 녹음/자료 초안/업무 전환/AI Assistant/승인형 Tool Plan, 도구별 권한 검증 승인 실행 |
| `routes/admin.ts` | 2026-05-03 | Codex | AdminService 기반 사용자 목록/생성/수정/삭제/비밀번호 초기화 API |
| `routes/teams.ts` | 2026-05-03 | Codex | Team/TeamMember DB 기반 조회/생성/수정/멤버 관리 API |
| `routes/routineTasks.ts` | 2026-05-03 | Codex | RoutineTaskService 기반 루틴 업무 조회/생성/수정/삭제/완료 API |

### 미완료
| 라우트 | 상태 | 다음 작업 |
|--------|------|----------|
| - | 없음 | 운영 피드백에 따라 확장 |

---

## 2. 서버 Service 계층

### 완료됨
| Service | 완료일 | 작업자 | 위치 |
|---------|--------|--------|------|
| `TaskService` | 2026-01-25 | Claude | `server/src/services/TaskService.ts` |
| `ProjectService` | 2026-01-25 | Claude | `server/src/services/ProjectService.ts` |
| `MemberService` | 2026-01-25 | Claude | `server/src/services/MemberService.ts` |
| `ActivityLogService` | 2026-01-25 | Claude | `server/src/services/ActivityLogService.ts` |
| `DashboardService` | 2026-01-25 | Claude | `server/src/services/DashboardService.ts` |
| `AuthService` | 2026-01-25 | Claude | `server/src/services/AuthService.ts` |
| `AuthService` 아이디 로그인 전환 | 2026-05-02 | Codex | `server/src/services/AuthService.ts` |
| `AdminService` | 2026-05-03 | Codex | `server/src/services/AdminService.ts` |
| `MeetingService` | 2026-01-25 | Claude | `server/src/services/MeetingService.ts` |
| `RoutineTaskService` | 2026-05-03 | Codex | `server/src/services/RoutineTaskService.ts` |
| `CellService` | 2026-01-25 | Claude | `server/src/services/CellService.ts` |
| `AttendanceService` | 2026-01-25 | Claude | `server/src/services/AttendanceService.ts` |
| `AiTranscriptionService` | 2026-05-01 | Codex | `server/src/services/ai/AiTranscriptionService.ts` |
| `AiAssistantService` | 2026-05-01 | Codex | `server/src/services/ai/AiAssistantService.ts` |
| `AgentToolRegistry` | 2026-05-03 | Codex | `server/src/services/ai/AgentToolRegistry.ts` |
| `AiModelProviderRouter` | 2026-05-03 | Codex | `server/src/services/ai/AiModelProviderRouter.ts` |

### Storage Service (스토리지 추상화)
| Service | 완료일 | 작업자 | 위치 |
|---------|--------|--------|------|
| `IStorageService` | 2026-01-25 | Claude | `server/src/services/storage/IStorageService.ts` |
| `LocalStorageService` | 2026-01-25 | Claude | `server/src/services/storage/LocalStorageService.ts` |
| `readFile` 확장 | 2026-04-30 | Codex | AI 전사를 위한 저장 파일 재읽기 메서드 |
| `OneDriveStorageService` | ❌ 미구현 | - | 서버 구축 시 구현 예정 |

### Attendance Service (출석 모듈화)
| 모듈 | 완료일 | 작업자 | 위치 | 설명 |
|------|--------|--------|------|------|
| `AttendanceHelper` | 2026-01-25 | Claude | `server/src/services/attendance/AttendanceHelper.ts` | 날짜/주차 계산 유틸리티 |
| `AttendanceStatsService` | 2026-01-25 | Claude | `server/src/services/attendance/AttendanceStatsService.ts` | 통계 계산 (주간/월간/개인) |
| `AttendanceService` | 2026-01-25 | Claude | `server/src/services/AttendanceService.ts` | CRUD + Stats 위임 (835줄→389줄) |

---

## 3. 클라이언트 Repository 계층

### 인터페이스 (domain/repositories/)
| 인터페이스 | 완료일 | 작업자 |
|------------|--------|--------|
| `ITaskRepository` | 2026-01-25 | Claude |
| `IProjectRepository` | 2026-01-25 | Claude |
| `IMemberRepository` | 2026-01-25 | Claude |
| `ITeamRepository` | 2026-01-25 | Claude |
| `IDashboardRepository` | 2026-01-25 | Claude |
| `IAuthRepository` | 2026-01-25 | Claude |
| `IRoutineRepository` | 2026-01-25 | Claude |
| `IMeetingRepository` | 2026-01-25 | Claude |
| `IAdminRepository` | 2026-01-25 | Claude |
| `ICellRepository` | 2026-01-25 | Claude |
| `IAttendanceRepository` | 2026-01-25 | Claude |

### 구현체 (data/repositories/)
| Repository | 완료일 | 작업자 |
|------------|--------|--------|
| `TaskRepository` | 2026-01-25 | Claude |
| `ProjectRepository` | 2026-01-25 | Claude |
| `MemberRepository` | 2026-01-25 | Claude |
| `TeamRepository` | 2026-01-25 | Claude |
| `DashboardRepository` | 2026-01-25 | Claude |
| `AuthRepository` | 2026-01-25 | Claude |
| `RoutineRepository` | 2026-01-25 | Claude |
| `MeetingRepository` | 2026-01-25 | Claude |
| `AdminRepository` | 2026-01-25 | Claude |
| `CellRepository` | 2026-01-25 | Claude |
| `AttendanceRepository` | 2026-01-25 | Claude |

### API Source (data/sources/api/)
| API Source | 완료일 | 작업자 |
|------------|--------|--------|
| `HttpClient` | 2026-01-25 | Claude |
| `ApiError` | 2026-01-25 | Claude |
| `TaskApiSource` | 2026-01-25 | Claude |
| `ProjectApiSource` | 2026-01-25 | Claude |
| `MemberApiSource` | 2026-01-25 | Claude |
| `TeamApiSource` | 2026-01-25 | Claude |
| `DashboardApiSource` | 2026-01-25 | Claude |
| `AuthApiSource` | 2026-01-25 | Claude |
| `RoutineApiSource` | 2026-01-25 | Claude |
| `MeetingApiSource` | 2026-01-25 | Claude |
| `AdminApiSource` | 2026-01-25 | Claude |
| `CellApiSource` | 2026-01-25 | Claude |
| `AttendanceApiSource` | 2026-01-25 | Claude |

### Mock Repository (data/sources/mock/)
| Mock | 완료일 | 작업자 |
|------|--------|--------|
| `MockStorage` | 2026-01-25 | Claude |
| `MockTaskRepository` | 2026-01-25 | Claude |
| `MockProjectRepository` | 2026-01-25 | Claude |
| `MockMemberRepository` | 2026-01-25 | Claude |
| `MockTeamRepository` | 2026-01-25 | Claude |
| `MockDashboardRepository` | 2026-01-25 | Claude |
| `MockAuthRepository` | 2026-01-25 | Claude |
| `MockRoutineRepository` | 2026-01-25 | Claude |
| `MockMeetingRepository` | 2026-01-25 | Claude |
| `MockAdminRepository` | 2026-01-25 | Claude |

---

## 4. 클라이언트 Use Case 계층

### Task Use Cases
| Use Case | 완료일 | 작업자 | 위치 |
|----------|--------|--------|------|
| `GetTasksUseCase` | 2026-01-25 | Claude | `domain/usecases/task/` |
| `CreateTaskUseCase` | 2026-01-25 | Claude | `domain/usecases/task/` |
| `UpdateTaskUseCase` | 2026-01-25 | Claude | `domain/usecases/task/` |
| `DeleteTaskUseCase` | 2026-01-25 | Claude | `domain/usecases/task/` |
| `UpdateTaskStatusUseCase` | 2026-01-25 | Claude | `domain/usecases/task/` |

### Project Use Cases
| Use Case | 완료일 | 작업자 | 위치 |
|----------|--------|--------|------|
| `GetProjectsUseCase` | 2026-01-25 | Claude | `domain/usecases/project/` |
| `CreateProjectUseCase` | 2026-01-25 | Claude | `domain/usecases/project/` |
| `UpdateProjectUseCase` | 2026-01-25 | Claude | `domain/usecases/project/` |
| `DeleteProjectUseCase` | 2026-01-25 | Claude | `domain/usecases/project/` |

### Member Use Cases
| Use Case | 완료일 | 작업자 | 위치 |
|----------|--------|--------|------|
| `GetMembersUseCase` | 2026-01-25 | Claude | `domain/usecases/member/` |
| `InviteMemberUseCase` | 2026-01-25 | Claude | `domain/usecases/member/` |
| `UpdateMemberUseCase` | 2026-01-25 | Claude | `domain/usecases/member/` |

### Team Use Cases
| Use Case | 완료일 | 작업자 | 위치 |
|----------|--------|--------|------|
| `GetTeamsUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |
| `CreateTeamUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |
| `UpdateTeamUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |
| `DeleteTeamUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |
| `AddTeamMemberUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |
| `RemoveTeamMemberUseCase` | 2026-01-25 | Claude | `domain/usecases/team/` |

### Dashboard Use Cases
| Use Case | 완료일 | 작업자 | 위치 |
|----------|--------|--------|------|
| `GetDashboardDataUseCase` | 2026-01-25 | Claude | `domain/usecases/dashboard/` |
| `GetMyTasksUseCase` | 2026-01-25 | Claude | `domain/usecases/dashboard/` |
| `GetRecentActivitiesUseCase` | 2026-01-25 | Claude | `domain/usecases/dashboard/` |

---

## 5. 클라이언트 Feature Hooks 마이그레이션

### 완료됨
| Hook | 완료일 | 작업자 | 비고 |
|------|--------|--------|------|
| `useProjects` | - | - | 기존부터 Store 사용 |
| `useMyTasks` | - | - | 기존부터 Store 사용 |
| `useSettings` | - | - | 기존부터 Store 사용 |
| `useKanban` | 2026-01-25 | Claude | Repository 사용으로 마이그레이션 |
| `useDashboard` | 2026-01-25 | Claude | Repository 사용으로 마이그레이션 |
| `useTeam` | 2026-01-25 | Claude | Repository 사용으로 마이그레이션 |
| `useTeamDetail` | 2026-01-25 | Claude | Repository 사용으로 마이그레이션 |
| `useCells` | 2026-01-25 | Claude | 셀 그룹 관리 (출석체크 기능) |
| `useAttendanceCheck` | 2026-01-25 | Claude | 출석 체크 로직 (출석체크 기능) |
| `useAttendanceStats` | 2026-01-25 | Claude | 출석 통계 조회 (출석체크 기능) |

### 미완료
없음 - 모든 Feature Hooks 마이그레이션 완료!

---

## 6. DI (의존성 주입)

### 클라이언트
| 항목 | 완료일 | 작업자 |
|------|--------|--------|
| `RepositoryContext` | 2026-01-25 | Claude |
| `RepositoryProvider` | 2026-01-25 | Claude |
| `createRepositories` | 2026-01-25 | Claude |
| `App.tsx` 통합 | 2026-01-25 | Claude |

### 서버
| 항목 | 완료일 | 작업자 |
|------|--------|--------|
| `container.ts` | 2026-01-25 | Claude |
| `app.ts` 초기화 | 2026-01-25 | Claude |

---

## 7. 레거시 api.ts 정리 현황

### 최종 상태: ✅ 완료
- **api.ts 파일**: 삭제됨 (2026-01-25)
- **사용 중인 모듈 수**: 0개 (모든 의존성 제거됨)

### Zustand Store 마이그레이션 완료
| Store | 변경 전 | 변경 후 | 상태 |
|-------|---------|---------|------|
| `taskStore.ts` | `tasksApi` | `taskRepository` from `@/di/storeRepositories` | ✅ 완료 |
| `projectStore.ts` | `projectsApi` | `projectRepository` from `@/di/storeRepositories` | ✅ 완료 |
| `memberStore.ts` | `membersApi` | `memberRepository` from `@/di/storeRepositories` | ✅ 완료 |
| `teamStore.ts` | `teamsApi` | `teamRepository` from `@/di/storeRepositories` | ✅ 완료 |
| `meetingStore.ts` | `meetingsApi` | `meetingRepository` from `@/di/storeRepositories` | ✅ 완료 |
| `routineStore.ts` | `routineTasksApi` | `routineRepository` from `@/di/storeRepositories` | ✅ 완료 |

### Store용 전역 Repository (storeRepositories.ts)
Zustand Store는 React 컴포넌트 외부에서 실행되므로 `@/di/storeRepositories.ts`에서
전역 Repository 인스턴스를 제공:
- 환경 변수 `VITE_USE_MOCK`에 따라 Mock/API Repository 자동 선택
- 9개 Repository 전역 인스턴스 export

---

## 8. 모바일/PWA/카카오 공유 기반

### 완료됨
| 항목 | 완료일 | 작업자 | 위치 |
|------|--------|--------|------|
| PWA manifest/service worker | 2026-04-30 | Codex | `client/public/manifest.webmanifest`, `client/public/service-worker.js` |
| 모바일 하단 내비게이션 | 2026-04-30 | Codex | `client/src/presentation/components/layout/MobileBottomNavigation.tsx` |
| PWA 설치 안내 UI | 2026-04-30 | Codex | `client/src/presentation/components/pwa/PwaInstallPrompt.tsx` |
| 공유 유틸리티 계층 | 2026-04-30 | Codex | `client/src/shared/share/` |
| 회의자료 카카오/PDF 공유 UI | 2026-04-30 | Codex | `client/src/presentation/components/modals/MeetingDetailModal.tsx` |
| PDF 생성 라이브러리 지연 로딩 | 2026-04-30 | Codex | `client/src/shared/share/meetingPdf.ts` |
| 모바일 홈 대시보드 | 2026-04-30 | Codex | `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| 모바일 홈 AI 패널 정리 | 2026-05-03 | Codex | `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| 프로젝트 중심 메뉴 재구성 | 2026-05-03 | Codex | `client/src/presentation/components/layout/navigationConfig.ts`, `client/src/presentation/components/layout/TopNavigation.tsx`, `client/src/presentation/components/layout/MobileMenu.tsx`, `client/src/presentation/components/layout/MobileBottomNavigation.tsx` |
| 대시보드 월간 일정표 | 2026-05-03 | Codex | `client/src/features/dashboard/components/ScheduleCalendar.tsx`, `client/src/presentation/pages/Dashboard.tsx` |
| 대시보드 히어로 카운터 제거 | 2026-05-03 | Codex | `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| 파일관리 허브 페이지 | 2026-05-03 | Codex | `client/src/presentation/pages/FileManagementPage.tsx`, `client/src/App.tsx` |
| 회의자료 고유 페이지 라우트 | 2026-05-03 | Codex | `client/src/presentation/pages/MeetingDocumentPage.tsx`, `client/src/App.tsx`, `client/src/presentation/pages/MeetingsPage.tsx` |
| 회의 생성 팀 선택/안건 간소화 | 2026-05-03 | Codex | `client/src/presentation/components/modals/meeting/MeetingFormModal.tsx`, `client/src/presentation/components/modals/meeting/steps/BasicInfoStep.tsx`, `client/src/presentation/components/modals/meeting/steps/AgendaStep.tsx` |
| Team DB 기반 API 전환 | 2026-05-03 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260503010000_add_teams_and_meeting_team/`, `server/src/routes/teams.ts` |
| 업무/회의 딥링크 처리 | 2026-04-30 | Codex | `client/src/presentation/pages/KanbanBoard.tsx`, `client/src/presentation/pages/MeetingsPage.tsx` |
| 업무/프로젝트 상세 공유 UI | 2026-04-30 | Codex | `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/presentation/components/modals/ProjectProgressModal.tsx` |
| 프로젝트 딥링크 처리 | 2026-04-30 | Codex | `client/src/presentation/pages/ProjectsPage.tsx` |
| 모바일 전체화면 모달 정리 | 2026-04-30 | Codex | `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/presentation/components/modals/SpatialProjectModal.tsx`, `client/src/presentation/components/modals/ProjectProgressModal.tsx` |
| 카카오 연동 상태 설정 탭 | 2026-04-30 | Codex | `client/src/presentation/pages/SettingsPage.tsx` |
| 모바일 주간 브리핑 공유 | 2026-04-30 | Codex | `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| Playwright 모바일/데스크톱 UI 감사 | 2026-04-30 | Codex | `client/playwright.config.ts`, `client/tests/ui-audit.spec.ts` |
| 공유 운영 설정/도메인 점검 | 2026-04-30 | Codex | `client/src/shared/share/shareConfig.ts`, `client/src/presentation/pages/SettingsPage.tsx` |
| AI 에이전트 기능 기획 | 2026-04-30 | Codex | `docs/AI_AGENT_ROADMAP.md` |
| 생성 업무 묶음 카카오 공유 | 2026-05-01 | Codex | `client/src/shared/share/entityShare.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx` |

### 남은 작업
| 항목 | 상태 | 비고 |
|------|------|------|
| Kakao Developers 앱 설정 | ⬜ 대기 | JavaScript 키, 도메인, 카카오톡 공유 활성화 필요 |
| 서버 기반 PDF/자료 저장 | ⬜ 대기 | VPS 배포 후 장기 저장/권한 링크/OneDrive 연동과 함께 설계 |

---

## 9. AI 회의 녹음/전사 기반

### 완료됨
| 항목 | 완료일 | 작업자 | 위치 |
|------|--------|--------|------|
| 회의 녹음 데이터 모델 | 2026-04-30 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260430000000_add_ai_meeting_recordings/` |
| AI 전사 Service | 2026-04-30 | Codex | `server/src/services/ai/AiTranscriptionService.ts` |
| AI 라우트 | 2026-04-30 | Codex | `server/src/routes/ai.ts` |
| DI Container 등록 | 2026-04-30 | Codex | `server/src/di/container.ts` |
| 녹음 파일 재읽기 스토리지 확장 | 2026-04-30 | Codex | `server/src/services/storage/IStorageService.ts`, `server/src/services/storage/LocalStorageService.ts` |
| 클라이언트 AI API 유틸리티 | 2026-04-30 | Codex | `client/src/shared/ai/meetingRecordingApi.ts` |
| 회의 상세 녹음/전사 UI | 2026-04-30 | Codex | `client/src/presentation/components/modals/MeetingDetailModal.tsx` |
| 전사 결과 타입 | 2026-04-30 | Codex | `client/src/types/index.ts` |
| 회의자료 초안 데이터 모델 | 2026-05-01 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260501010000_add_meeting_material_drafts/` |
| 회의자료 초안 API | 2026-05-01 | Codex | `server/src/routes/ai.ts`, `server/src/services/ai/AiTranscriptionService.ts` |
| 회의자료 초안 승인 UI | 2026-05-01 | Codex | `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/types/index.ts` |
| 회의 할 일 업무 전환 | 2026-05-01 | Codex | `server/src/services/TaskService.ts`, `server/src/routes/ai.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx` |
| 담당자 이름 자동 매칭 | 2026-05-01 | Codex | `server/src/services/ai/AiTranscriptionService.ts` |
| 업무 후보 편집 후 전환 | 2026-05-01 | Codex | `server/src/services/TaskService.ts`, `server/src/routes/ai.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/shared/ai/meetingRecordingApi.ts` |
| AI Assistant 읽기 모드 | 2026-05-01 | Codex | `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| AI Assistant 최근 요청 기록 | 2026-05-01 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260501030000_add_ai_assistant_runs/`, `server/src/services/ai/AiAssistantService.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| AI Assistant 범위/사용량 기록 | 2026-05-01 | Codex | `server/prisma/migrations/20260501040000_extend_ai_assistant_runs_scope_usage/`, `server/src/services/ai/AiAssistantService.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| AI 승인 기반 업무 초안/생성 | 2026-05-01 | Codex | `server/prisma/migrations/20260501050000_add_ai_agent_actions/`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| 전역 AI 명령형 에이전트 UI | 2026-05-02 | Codex | `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/presentation/components/layout/AppShell.tsx`, `client/src/shared/ai/assistantApi.ts` |
| AI 명령형 채팅 UX 고도화 | 2026-05-02 | Codex | `client/src/features/ai-agent/AgentCommandCenter.tsx` |
| AI 명령 로그 계정 저장 | 2026-05-02 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260502010000_add_ai_command_messages/`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/shared/ai/assistantApi.ts`, `client/src/types/index.ts` |
| AI 계정 메모리/프롬프트 캐시 보강 | 2026-05-03 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260503000000_add_ai_assistant_memory/`, `server/src/services/ai/AiAssistantService.ts`, `server/.env.example`, `docs/AI_AGENT_ROADMAP.md` |
| AI API 인증 만료 처리 공통화 | 2026-05-03 | Codex | `client/src/shared/ai/assistantApi.ts` |
| 브라우저 직접 녹음 및 자동 초안 | 2026-05-03 | Codex | `client/src/presentation/components/modals/MeetingDetailModal.tsx` |
| AI Agent Tool Registry 승인 실행 | 2026-05-03 | Codex | `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/shared/ai/assistantApi.ts`, `client/src/types/index.ts` |
| OpenAI 구조화 Tool Plan 생성 | 2026-05-03 | Codex | `server/src/services/ai/AiAssistantService.ts`, `server/src/services/ai/AgentToolRegistry.ts`, `server/.env.example` |
| 로컬 우선 LLM Provider 및 OpenAI 폴백 | 2026-05-03 | Codex | `server/src/services/ai/AiModelProviderRouter.ts`, `server/src/services/ai/AiAssistantService.ts`, `server/src/services/ai/AiTranscriptionService.ts`, `server/src/routes/ai.ts`, `server/.env.example`, `client/src/types/index.ts` |
| RoutineTask DB/API 및 AI 루틴 도구 | 2026-05-03 | Codex | `server/prisma/schema.prisma`, `server/prisma/migrations/20260503020000_add_routine_tasks/`, `server/src/services/RoutineTaskService.ts`, `server/src/routes/routineTasks.ts`, `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/types/index.ts` |
| 관리자 API 호환 라우트 | 2026-05-03 | Codex | `server/src/services/AdminService.ts`, `server/src/routes/admin.ts`, `server/src/di/container.ts`, `server/src/app.ts` |
| 개발 진행상황 시각화 문서 | 2026-05-01 | Codex | `docs/PHASE_PROGRESS.md` |

### 남은 작업
| 항목 | 상태 | 비고 |
|------|------|------|
| 긴 회의 녹음 압축/청크 처리 | ⬜ 대기 | OpenAI Audio API 업로드 25MB 제한 대응 필요 |
| AI 비용 단가 운영 설정 | ⬜ 대기 | `OPENAI_ASSISTANT_INPUT_COST_PER_1M`, `OPENAI_ASSISTANT_OUTPUT_COST_PER_1M` 운영값 설정 |
| 원본 오디오 보관 기간 정책 | ⬜ 대기 | 기본 30일 자동 삭제 권장 |
| 승인 기반 쓰기 Agent 확장 | 🟡 1차 완료/확장 중 | 프로젝트/회의/업무/팀 생성 Tool Plan은 승인 실행 가능, 수정 diff/루틴/외부 공유 도구는 다음 단계 |

---

## 작업 이력 (Changelog)

### 2026-05-03

#### 로컬 우선 LLM Provider 및 OpenAI 폴백 구조 (Codex)
- `AiModelProviderRouter`를 추가해 LM Studio, OpenClaw 등 OpenAI-compatible `/v1` endpoint를 AI Assistant/Agent/회의자료 생성의 1차 모델 Provider로 사용할 수 있게 구성
- `LOCAL_LLM_*` 환경 변수로 assistant/agent/meeting 워크플로우별 로컬 모델, timeout, OpenAI 폴백 여부를 제어하도록 추가
- AI 명령/업무 초안/Tool Plan 생성에서 로컬 LLM 호출 실패 또는 구조화 JSON 실패 시 OpenAI로 자동 재시도하고, 실행 기록 usage에 provider/fallback 정보를 포함
- 회의자료 요약 생성도 같은 Provider Router를 사용해 Qwen 로컬 모델과 OpenAI 모델을 동일한 API 경로에서 비교할 수 있도록 정리
- `/api/ai/assistant/providers` 상태 API를 추가해 현재 OpenAI/로컬 설정, 로컬 `/models` probe 결과를 바로 확인할 수 있게 구현
- 관련 파일: `server/src/services/ai/AiModelProviderRouter.ts`, `server/src/services/ai/AiAssistantService.ts`, `server/src/services/ai/AiTranscriptionService.ts`, `server/src/routes/ai.ts`, `server/.env.example`, `client/src/types/index.ts`, `AGENTS.md`

#### AI 카카오/PDF 공유 준비 Tool Plan 및 클라이언트 공유 버튼 (Codex)
- `AgentToolRegistry`에 `prepare_kakao_share`, `prepare_meeting_pdf` 도구를 추가해 프로젝트/업무/회의자료/루틴/직접 문구 공유 payload와 회의자료 PDF 공유 payload를 승인 기반으로 준비
- 공유 도구 실행 시 서버에서 대상 엔티티 읽기 권한을 검증하고, 승인 결과에 `shareIntents`를 저장해 클라이언트가 후속 공유 버튼을 렌더링할 수 있도록 구현
- OpenAI 구조화 Tool Plan 스키마와 시스템 지침에 카카오 공유/PDF 공유 명령 매핑을 추가
- AI 명령창에 실행 완료 후 `카카오 공유`/`PDF 공유` 버튼을 표시하고, Kakao SDK -> Web Share -> 클립보드 및 PDF 네이티브 파일 공유/다운로드 fallback과 연결
- 검증: `server npm run build`, `client npm run build`, 프로젝트 카카오 공유 준비 Tool Plan 생성/승인/정리, 회의자료 PDF 공유 준비 Tool Plan 생성/승인/정리, `client npm run test:ui`
- 관련 파일: `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/shared/ai/assistantApi.ts`, `client/src/types/index.ts`

#### AI 수정형 Tool Plan 및 diff 승인 실행 (Codex)
- `AgentToolRegistry`에 `update_project`, `update_meeting`, `update_task`, `update_routine` 도구를 추가해 프로젝트/회의자료/업무/루틴 수정 명령을 승인 기반으로 실행
- 승인 카드 저장 전에 서버가 실제 DB 값을 다시 읽어 변경 전/후 diff를 계산하도록 `enrichToolPlanPreview`를 추가
- 승인 실행 시 도구별 권한 검증을 수행하고, 업무 수정은 `ActivityLogService`에 `ai_tool_plan` 출처와 diff를 기록
- OpenAI 구조화 Tool Plan 스키마에 수정 대상 ID, 상태/마감/활성 여부, 서버 계산 diff 필드를 추가하고 프로젝트/업무/회의 컨텍스트에 실제 ID를 노출
- AI 명령창 승인 카드에 변경 전/후 diff 영역을 표시하고, 수정 실행 결과 요약을 생성 결과와 분리해 안내
- 승인 라우트의 단일 `task.create` 미들웨어 의존을 제거하고 legacy 업무 생성 액션은 서비스 내부에서 `task.create` 권한을 검증하도록 보강
- 검증: `server npm run build`, `client npm run build`, 프로젝트 이름 수정 Tool Plan 생성/승인/정리, 업무 상태 `TODO -> DONE` 수정 Tool Plan 생성/승인/정리, `client npm run test:ui`
- 관련 파일: `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/types/index.ts`

#### RoutineTask DB/API 및 AI 루틴 생성 도구 (Codex)
- `RoutineTask`, `RoutineTaskAssignee`, `RoutineTaskCompletion` Prisma 모델과 마이그레이션을 추가해 루틴 업무, 담당자, 날짜별 완료 기록을 서버 DB에 저장하도록 구현
- `RoutineTaskService`와 `/api/routine-tasks` 라우트를 추가해 조회/생성/수정/삭제/오늘 완료/완료 취소 API를 실제 서버 모드로 전환
- `AgentToolRegistry`와 OpenAI Tool Plan 스키마에 `create_routine` 도구를 추가해 자연어 명령으로 반복 업무 루틴을 승인 대기 카드로 생성하고 승인 후 실제 루틴으로 저장
- AI 루틴 생성에서 월/수처럼 특정 요일이 들어온 경우 `custom` 반복과 `repeatDays`를 보존하도록 보강
- 검증: `prisma migrate deploy`, `server npm run build`, `client npm run build`, 루틴 API 생성/완료/삭제 직접 호출, AI Tool Plan 생성/승인/검증 데이터 정리, `client npm run test:ui`
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260503020000_add_routine_tasks/migration.sql`, `server/src/services/RoutineTaskService.ts`, `server/src/routes/routineTasks.ts`, `server/src/di/container.ts`, `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/types/index.ts`

#### OpenAI 구조화 Tool Plan 생성 (Codex)
- `AiAssistantService.createToolPlanAction`을 로컬 키워드 플래너 중심에서 OpenAI Responses API Structured Output 기반 플래너로 확장
- 계정 메모리, 현재 범위, INTRUTH 컨텍스트, 서버 Tool Registry 목록을 함께 전달해 프로젝트/회의자료/업무/팀 생성 계획을 승인 가능한 JSON 스키마로 생성
- `OPENAI_AGENT_MODEL` 환경변수를 추가해 읽기 Assistant 모델과 쓰기 Agent 계획 모델을 분리 가능하게 구성
- Tool Plan 업무 생성 실행 시 담당자 이름을 프로젝트 멤버/소유자와 매칭해 실제 `assigneeId`로 연결하도록 보강
- API 키가 없을 때는 기존 로컬 Tool Registry 플래너로 fallback하고, API 오류는 `AiAssistantRun` 실패 기록으로 남기도록 정리
- 검증: `server npm run build`, `client npm run build`, `/api/ai/assistant/tool-plan` OpenAI 모드 직접 호출 및 검증 데이터 정리, `client npm run test:ui`
- 관련 파일: `server/src/services/ai/AiAssistantService.ts`, `server/src/services/ai/AgentToolRegistry.ts`, `server/.env.example`, `AGENTS.md`, `docs/PHASE_PROGRESS.md`

#### AI Agent Tool Registry 및 승인 실행 계획 (Codex)
- `AgentToolRegistry`를 추가해 AI 명령을 프로젝트/회의자료/업무/팀 생성 도구 계획으로 해석하고, 사람 승인 전에는 실제 데이터가 바뀌지 않도록 구성
- `/api/ai/assistant/tool-plan` API를 추가해 자연어 명령을 `TOOL_PLAN` 액션으로 저장하고, 기존 승인/거절 API에서 Tool Plan을 실제 서버 도구로 실행하도록 확장
- `AgentCommandCenter`가 생성형 명령을 감지하면 실행 계획 카드와 승인 버튼을 보여주고, 승인 결과를 프로젝트/회의자료/업무/팀 생성 건수로 다시 안내하도록 개선
- 계정별 AI 명령 로그/승인 대기 목록과 연결되는 기존 `AiAgentAction` 구조를 유지해 실행 이력과 실패 메시지를 남기도록 정리
- Playwright UI 감사에서 발견된 `/api/admin/users` 404를 `AdminService`와 `/api/admin` 호환 라우트로 보강해 관리자 페이지도 실제 서버 모드에서 정상 렌더링
- 검증: `server npm run build`, `client npm run build`, `client npm run test:ui`, 직접 API 검증(`/assistant/tool-plan` 생성/승인/검증 프로젝트 삭제)
- 관련 파일: `server/src/services/ai/AgentToolRegistry.ts`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/shared/ai/assistantApi.ts`, `client/src/types/index.ts`, `server/src/services/AdminService.ts`, `server/src/routes/admin.ts`, `server/src/di/container.ts`, `server/src/app.ts`

#### 회의자료 페이지형 구조 및 녹음 자동 초안 흐름 (Codex)
- 회의자료 목록 클릭을 모달 중심에서 `/meetings/:meetingId` 고유 링크 페이지로 전환
- 회의자료 페이지에 링크 복사, 카카오 공유, PDF 보내기, 편집, 녹음/AI 패널 진입을 배치
- 회의 생성 기본정보에서 장소를 제거하고 내가 속한 팀 선택을 추가
- 안건 입력에서 예상 소요 시간/발표자 필드를 제거해 모바일 겹침을 정리
- 대시보드 히어로의 `지연/오늘/회의` 숫자 카운터를 제거하고 일정표 중심으로 정리
- 브라우저가 지원하는 기기에서 바로 녹음할 수 있도록 `MediaRecorder` 기반 녹음 시작/종료를 추가
- 녹음 업로드 또는 직접 녹음 종료 후 전사와 AI 회의자료 초안 생성을 자동으로 이어지게 구성
- Team/TeamMember Prisma 모델과 실제 `/api/teams` CRUD/멤버 관리 라우트를 추가하고 회의자료에 `teamId` 연결
- 출석 월간 통계 훅의 객체 의존성 루프를 고쳐 Playwright 모바일 감사의 무한 업데이트 경고 제거
- 검증: `server npm run build`, `server npm run db:migrate`, `client npm run build`, `client npm run test:ui`
- 관련 파일: `client/src/presentation/pages/MeetingDocumentPage.tsx`, `client/src/presentation/pages/MeetingsPage.tsx`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/presentation/components/modals/meeting/MeetingFormModal.tsx`, `client/src/presentation/components/modals/meeting/steps/BasicInfoStep.tsx`, `client/src/presentation/components/modals/meeting/steps/AgendaStep.tsx`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/features/dashboard/components/ScheduleCalendar.tsx`, `client/src/features/attendance/hooks/useAttendanceStats.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/20260503010000_add_teams_and_meeting_team/`, `server/src/routes/teams.ts`, `server/src/routes/meetings.ts`, `server/src/services/MeetingService.ts`

#### 프로젝트 중심 내비게이션 및 대시보드 일정표 (Codex)
- 상단/모바일/하단 메뉴를 프로젝트 중심 구조로 재구성: 대시보드, 회의자료, 프로젝트, 파일관리, 팀, 설정
- 프로젝트 하위 메뉴로 `프로젝트 홈`, `칸반보드`, `내 할일`을 묶고, 추후 편집 도구 영역으로 `주보`, `이미지` 준비중 항목 표시
- `/files` 파일관리 허브 페이지를 추가해 회의자료, 프로젝트 파일, 녹음 자료, 편집 자료 진입점을 구성
- 업무 마감일과 회의 일정을 한 달 단위로 보여주는 `ScheduleCalendar`를 대시보드 모바일/데스크톱에 추가
- 관련 파일: `client/src/presentation/components/layout/navigationConfig.ts`, `client/src/presentation/components/layout/TopNavigation.tsx`, `client/src/presentation/components/layout/MobileMenu.tsx`, `client/src/presentation/components/layout/MobileBottomNavigation.tsx`, `client/src/features/dashboard/components/ScheduleCalendar.tsx`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/presentation/pages/Dashboard.tsx`, `client/src/presentation/pages/FileManagementPage.tsx`, `client/src/App.tsx`, `client/tests/ui-audit.spec.ts`, `AGENTS.md`

#### 모바일 홈 AI 패널 제거 및 인증 만료 UX 정리 (Codex)
- 홈 대시보드에 중복으로 들어가 있던 내장 `AI 명령` 패널과 자동 AI 기록/승인 대기 조회를 제거
- AI 명령 진입은 전역 채팅형 `AgentCommandCenter`로 통일해 홈 화면이 에러 토스트로 덮이지 않도록 정리
- AI API 응답이 401이면 공통으로 `auth:expired` 이벤트를 발생시켜 계정 세션 만료 흐름으로 처리
- 관련 파일: `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/shared/ai/assistantApi.ts`

#### AI 계정 메모리 및 프롬프트 캐시 최적화 (Codex)
- 계정/범위별 압축 메모리를 저장하는 `AiAssistantMemory` 모델과 `wf_ai_assistant_memories` 마이그레이션 추가
- AI Assistant/업무 초안 생성 시 서버가 계정 메모리, 최근 명령 채팅, 최근 실행 기록을 짧은 동적 컨텍스트로 구성해 모델에 전달하도록 개선
- OpenAI Prompt Caching 공식 권장사항에 맞춰 고정 지시문은 앞에 두고 동적 계정 컨텍스트는 뒤에 배치하며, 워크플로우/계정/범위 기반 `prompt_cache_key`를 Responses API 요청에 추가
- `cachedTokens` 추출을 `input_tokens_details`와 `prompt_tokens_details` 모두 지원하도록 보강하고, 캐시 입력 단가가 설정되면 비용 추정에서 일반 입력/캐시 입력을 분리 계산
- 운영 환경 변수 예시와 AI 로드맵에 계정 메모리/캐시 운영 원칙 추가
- 검증: `server npm run build`, `server npm run db:migrate`, API health 확인
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260503000000_add_ai_assistant_memory/migration.sql`, `server/src/services/ai/AiAssistantService.ts`, `server/.env.example`, `AGENTS.md`, `docs/AI_AGENT_ROADMAP.md`

### 2026-05-02

#### AI 명령 로그 계정별 서버 저장 (Codex)
- `AiCommandMessage` Prisma 모델과 `wf_ai_command_messages` 마이그레이션을 추가해 AI 명령창의 사용자/assistant 메시지를 로그인 멤버 단위로 저장
- `/api/ai/assistant/command-messages` 조회/저장/삭제 API를 추가하고 `AiAssistantService`에서 역할, 내용 길이, 라우트, 메타데이터를 정규화
- AI 명령창이 서버 로그를 우선 복원하고, 서버 로그가 없으면 기존 `AiAssistantRun`/`AiAgentAction` 기록 또는 브라우저 저장 로그를 계정 저장소로 마이그레이션하도록 개선
- 브라우저에서 실제 명령 실행 후 서버 DB에 계정별 메시지 2건 저장을 확인하고 `server npm run build`, `client npm run build`, `npx prisma migrate deploy`, `client npm run test:ui -- --workers=1` 검증 통과
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260502010000_add_ai_command_messages/migration.sql`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/types/index.ts`

#### AI 명령형 채팅 UX 고도화 (Codex)
- AI 명령창을 단순 명령 입력 UI에서 대화형 채팅 패널로 개선
- 장문 입력/Shift+Enter 줄바꿈, 자동 높이 조정, 처리 중 표시, 대화 초기화 기능 추가
- AI 답변의 문단/불릿/굵은 글씨 표시를 개선하고 답변 맥락에 맞는 후속 실행 버튼을 제공
- 회의/업무/프로젝트/승인 관련 답변에서 새 회의 열기, 업무 초안 생성, 승인 대기 확인 등 다음 행동으로 바로 이어지도록 연결
- AI 승인 카드에 상태 라벨을 표시하고 승인/보류 후 기존 카드 상태가 갱신되도록 개선
- 확장/태블릿 화면에서 떠 보이던 `말로 지시하기` 보조 라벨을 제거하고 AI 버튼/패널 위치가 하단 내비게이션과 겹치지 않도록 조정
- AI 명령 대화와 실행 카드를 브라우저 로컬 저장소에 보존하고, 실행 중 새로고침/연결 끊김이 발생하면 다음 진입 시 중단된 명령을 안내하도록 개선
- 현재 로컬 서버 구성에 맞춰 프론트는 `5173`, API 프록시는 `5070` 기준으로 정합성 보정
- 관련 파일: `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/.env.development`, `client/.env.server`, `client/vite.config.ts`

#### 전역 AI 명령형 에이전트 UI 1차 구현 (Codex)
- 대시보드 브리핑 중심 UI와 별개로 모든 페이지에서 열 수 있는 `INTRUTH AI 명령` 채팅 패널 추가
- 자연어 명령으로 페이지 이동, 새 업무/회의/프로젝트/루틴 창 열기, AI 승인 대기 목록 조회, 승인/보류 처리를 실행하도록 구성
- 기존 AI 브리핑 문구를 AI 명령/응답 중심 문구로 조정
- 일반 개발 모드에서 AI API가 잘못된 `localhost:3001`로 향하던 문제를 `127.0.0.1:5070` 기준으로 수정
- AI API 네트워크 실패 시 `Failed to fetch` 대신 로컬 서버/환경변수 확인 안내를 표시하도록 개선
- 대시보드/출석 셀 조회가 페이지 전환 중 네트워크 중단으로 콘솔 에러를 남기지 않도록 경고 레벨로 조정
- 관련 파일: `client/src/features/ai-agent/AgentCommandCenter.tsx`, `client/src/presentation/components/layout/AppShell.tsx`, `client/src/shared/ai/assistantApi.ts`, `client/.env.development`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/features/dashboard/hooks/useDashboard.ts`, `client/src/features/attendance/hooks/useCells.ts`

#### 아이디 기반 로그인 전환 (Codex)
- 로그인 화면에서 이메일 입력을 제거하고 `아이디` 입력으로 변경
- `IAuthRepository`/Mock Auth/API 요청 계약을 `username` 기반으로 정리
- 서버 `AuthService`와 `/auth/login` 라우트가 이메일이 아닌 `Member.username`으로 인증하도록 전환
- 시드 계정과 UI 감사 테스트 계정을 `admin / admin1234` 기준으로 갱신
- 프로필/상단/모바일 메뉴의 로그인 식별자 표시를 이메일 대신 아이디 우선 표시로 변경
- 관련 파일: `client/src/features/auth/Login.tsx`, `client/src/domain/repositories/IAuthRepository.ts`, `client/src/data/sources/mock/MockAuthRepository.ts`, `client/src/features/settings/hooks/useSettings.ts`, `server/src/services/AuthService.ts`, `server/src/routes/auth.ts`, `server/prisma/seed.ts`, `client/tests/ui-audit.spec.ts`

### 2026-05-01

#### AI 승인 기반 업무 생성 Agent 1차 구현 (Codex)
- `AiAgentAction` 데이터 모델과 `wf_ai_agent_actions` 마이그레이션을 추가해 AI가 제안한 쓰기 작업의 초안, 상태, 승인자, 실행 결과를 기록하도록 구성
- `AiAssistantService`에 업무 초안 생성, 승인 대기 목록 조회, 승인 실행, 거절 처리 로직 추가
- OpenAI Responses API Structured Output으로 프로젝트/회의 범위 기반 업무 초안을 만들고, API 키가 없을 때는 로컬 규칙 기반 초안으로 fallback
- 승인 시 `Task`를 실제 생성하고 `ActivityLogService`로 `ai_agent_action` 출처의 생성 로그 기록
- 모바일 홈 AI 패널에 `업무 초안 만들기`, 승인 대기 카드, 승인/거절 버튼 추가
- 실제 API 검증으로 업무 초안 5개 생성, 승인 후 Task 5개 생성 확인, 테스트 업무 삭제 정리
- 검증: `server npm run build`, `client npm run build`, `npx prisma migrate deploy`, `client npm run test:ui` 통과
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260501050000_add_ai_agent_actions/migration.sql`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/types/index.ts`

#### AI Assistant 읽기 모드 및 Phase 4 보강 (Codex)
- 현재 로그인 멤버의 미완료 업무, 다가오는 회의, 참여 프로젝트를 읽어 자연어 질문에 답하는 `AiAssistantService` 추가
- OpenAI API 키가 있으면 Responses API Structured Output을 사용하고, 키가 없으면 로컬 요약 fallback을 반환하도록 구성
- 모바일 홈에 AI 요청 패널, 빠른 질문 칩, 답변/하이라이트/소스 카운트/카카오 공유 UI 추가
- AI 회의자료 초안 적용 시 `ownerName`을 작성자, 참석자, 프로젝트 멤버, 활성 멤버 목록과 매칭해 `MeetingActionItem.assigneeId`에 자동 연결
- 회의 할 일에서 생성된 업무 묶음을 바로 카카오톡/Web Share/클립보드로 공유하는 후속 액션 추가
- 관련 파일: `server/src/services/ai/AiAssistantService.ts`, `server/src/services/ai/AiTranscriptionService.ts`, `server/src/services/ai/index.ts`, `server/src/routes/ai.ts`, `server/src/di/container.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/shared/share/entityShare.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/types/index.ts`, `docs/PHASE_PROGRESS.md`, `docs/AI_AGENT_ROADMAP.md`

#### 업무 후보 편집 및 AI Assistant 기록 보강 (Codex)
- 회의 할 일을 업무로 만들기 전 제목, 설명, 담당자, 마감일, 우선순위를 모바일 카드에서 편집할 수 있도록 UI 추가
- 업무 전환 API에 `overrides` 입력을 추가하고, 승인된 편집값을 생성 Task와 원본 `MeetingActionItem`에 함께 반영
- `AiAssistantRun` 모델과 마이그레이션을 추가해 AI Assistant 질문/응답/하이라이트/소스 카운트/실패 내역을 서버에 기록
- `/api/ai/assistant/runs` 최근 요청 조회 API와 모바일 홈의 최근 요청 재열람 UI 추가
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260501030000_add_ai_assistant_runs/`, `server/src/services/TaskService.ts`, `server/src/routes/ai.ts`, `server/src/services/ai/AiAssistantService.ts`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/types/index.ts`

#### AI Assistant 범위 선택 및 사용량 기록 (Codex)
- AI Assistant 요청 범위를 `전체`, `프로젝트`, `회의`로 선택할 수 있도록 서버 권한 검증과 모바일 선택 UI 추가
- 프로젝트/회의 범위에 맞춰 업무, 회의, 프로젝트 컨텍스트를 좁혀 읽도록 `AiAssistantService.collectContext` 개선
- OpenAI Responses API의 `usage.input_tokens`, `usage.output_tokens`, `usage.total_tokens`, 캐시/추론 토큰과 사용 모델을 `AiAssistantRun`에 저장
- 비용 단가 환경 변수가 설정되면 예상 비용을 계산해 함께 기록하도록 확장
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260501040000_extend_ai_assistant_runs_scope_usage/`, `server/src/services/ai/AiAssistantService.ts`, `server/src/routes/ai.ts`, `client/src/shared/ai/assistantApi.ts`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/types/index.ts`

#### AI 액션 아이템 업무 전환 1차 구현 (Codex)
- `MeetingActionItem.taskId` 필드와 `Task` 연결 관계를 추가해 회의 할 일이 어떤 업무로 전환됐는지 추적
- 선택한 회의 할 일을 프로젝트 업무로 생성하는 `TaskService.createFromMeetingActionItems` 메서드 추가
- `/api/ai/meetings/:meetingId/action-items/tasks` 승인 기반 업무 생성 API 추가
- 회의 상세 모달에 모바일용 회의 할 일 선택/전체 선택/업무 생성 UI 추가
- 생성된 업무는 Task Store에 반영하고, 회의 할 일은 `업무 생성됨` 상태로 표시
- 서버 실제 모드에서 역할 권한 JSON 문자열을 객체로 파싱하지 않아 보호 라우트가 403으로 막히던 인증 미들웨어 문제 수정
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260501020000_add_meeting_action_item_task_link/`, `server/src/services/TaskService.ts`, `server/src/routes/ai.ts`, `server/src/middleware/auth.ts`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/types/index.ts`, `docs/PHASE_PROGRESS.md`

#### AI 회의자료 초안 승인 워크플로우 (Codex)
- `MeetingMaterialDraft` Prisma 모델과 `wf_meeting_material_drafts` 마이그레이션 추가
- AI 회의자료 생성 결과를 즉시 반영하지 않고 초안으로 저장하는 목록/생성/적용/폐기 API 추가
- 회의 상세 모달을 모바일 중심의 초안 카드, 결정사항, 후속 질문, 액션 아이템, 카카오 브리핑 미리보기 UI로 확장
- 초안 적용 시 회의 `summary`/`content`와 `MeetingActionItem`을 업데이트하고 적용자/적용일을 기록
- Phase별 개발 진행상황을 계속 확인할 수 있는 `docs/PHASE_PROGRESS.md` 문서 추가
- 관련 파일: `server/prisma/schema.prisma`, `server/prisma/migrations/20260501010000_add_meeting_material_drafts/`, `server/src/services/ai/AiTranscriptionService.ts`, `server/src/routes/ai.ts`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/types/index.ts`, `docs/PHASE_PROGRESS.md`

#### AI 회의자료 생성 및 회의 ID 정렬 (Codex)
- 회의 모듈의 `authorId`, `memberId`, `assigneeId`, `projectId`, `createdById`를 UUID 문자열 기반으로 정렬
- `20260501000000_align_meeting_member_ids` Prisma 마이그레이션 추가
- 전사 완료 녹음 기반으로 OpenAI Structured Outputs 회의자료 생성 API 추가
- 생성 결과를 회의 `summary`/`content`에 반영하고 명시적 할 일을 `MeetingActionItem`으로 추가
- 회의 상세 모달에 `AI 자료 생성` 버튼과 생성된 카카오 공유 요약 미리보기 추가
- 관련 파일: `server/src/services/ai/AiTranscriptionService.ts`, `server/src/routes/ai.ts`, `server/prisma/schema.prisma`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/types/index.ts`

### 2026-04-30

#### 로컬 실제 서버 개발환경 정리 (Codex)
- 설치형 PostgreSQL/Docker 없이 개발 DB를 띄우는 `npm run dev:db` 스크립트 추가
- 실제 API 연동 프론트 실행용 `npm run dev:web:server`, 전체 실행용 `npm run dev:full` 스크립트 추가
- 로컬 API 포트를 `5070` 기준으로 정리해 기존 3001 포트 충돌 회피
- 클라이언트 서버 모드 env를 로컬 API 기준으로 변경
- Vite 프록시가 `VITE_API_BASE_URL` 기준으로 타깃을 잡도록 변경
- 관련 파일: `scripts/dev-postgres.mjs`, `package.json`, `client/.env.server`, `client/vite.config.ts`, `README.md`

#### 실서버 API 호환 라우트 보강 (Codex)
- 실제 서버 모드에서 클라이언트가 호출하는 Dashboard API 경로를 서버 REST 라우트와 일치하도록 수정
- 아직 DB 모델/Service가 없는 팀, 루틴 업무 API는 조회 시 빈 배열을 반환하는 호환 라우트로 404 방지
- 팀/루틴 쓰기 기능은 정식 DB 모델과 Service 구현 전까지 501 응답으로 명확히 제한
- Playwright 서버 모드가 Mock이 아닌 실제 API 설정으로 실행되도록 변경
- 관련 파일: `client/src/data/sources/api/DashboardApiSource.ts`, `server/src/routes/dashboard.ts`, `server/src/routes/teams.ts`, `server/src/routes/routineTasks.ts`, `client/playwright.config.ts`

#### AI 회의 녹음/전사 기반 1차 구현 (Codex)
- 회의별 녹음 업로드/목록 조회/전사 실행 API 추가
- `MeetingRecording`, `MeetingTranscriptSegment` Prisma 모델과 마이그레이션 추가
- `AiTranscriptionService`에서 25MB 이하 mp3/mp4/m4a/wav/webm 파일 검증, 저장, OpenAI 전사, 세그먼트 저장 처리
- `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_TRANSCRIBE_PROMPT` 서버 환경 변수 예시 추가
- 회의 상세 모달에 AI 회의 녹음 섹션, 업로드 버튼, 전사 상태, 전사 결과 미리보기 추가
- Mock 모드에서는 서버 전사 기능이 비활성화되도록 안내 UI 표시
- 관련 파일: `server/src/services/ai/AiTranscriptionService.ts`, `server/src/routes/ai.ts`, `server/prisma/schema.prisma`, `client/src/shared/ai/meetingRecordingApi.ts`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`

#### 모바일 PWA 및 카카오/PDF 공유 1차 구현 (Codex)
- PWA manifest, service worker, 앱 아이콘, 모바일 설치 프롬프트 추가
- 모바일 주요 동선용 하단 내비게이션 추가: 홈, 할일, 회의, 출석, 팀
- 빠른 추가 FAB를 새 업무/회의/루틴/프로젝트 액션 시트로 확장
- 카카오톡 링크 공유 SDK 래퍼와 Web Share/클립보드 fallback 구현
- 회의자료 상세 모달에 카카오 공유 및 PDF 파일 공유 버튼 추가
- 회의자료 PDF 생성 유틸리티 추가 (`html2canvas`, `jspdf`) 및 버튼 클릭 시점 지연 로딩 적용
- 회의자료 목록 카드와 Long Press 컨텍스트 메뉴에 공유 액션 추가
- 모바일 홈 대시보드 추가: 오늘 확인할 업무, 다가오는 회의, 출석 체크, 프로젝트/팀 요약
- 업무 수정 모달, 프로젝트 수정 모달, 프로젝트 진행상황 모달에 카카오 공유 버튼 추가
- `/tasks?taskId=...`, `/meetings?meetingId=...`, `/projects?projectId=...` 딥링크로 상세 모달을 바로 여는 흐름 추가
- 업무/프로젝트 작성 모달과 프로젝트 진행상황 모달을 모바일 전체화면형으로 조정
- 설정 화면에 카카오톡 공유 연동 상태, 현재 도메인 복사, 공유 테스트 탭 추가
- 모바일 홈의 공유 타일을 이번 주 업무/회의 브리핑 공유로 전환
- 관련 파일: `client/src/shared/pwa/`, `client/src/shared/share/`, `client/src/presentation/components/layout/MobileBottomNavigation.tsx`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/presentation/components/modals/MeetingDetailModal.tsx`, `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/presentation/components/modals/SpatialProjectModal.tsx`, `client/src/presentation/components/modals/ProjectProgressModal.tsx`, `client/src/presentation/pages/SettingsPage.tsx`

#### Playwright 기반 UI/UX 감사 및 모바일 정리 (Codex)
- Playwright 설정과 `npm run test:ui` 스크립트 추가
- 모바일/데스크톱에서 홈, 내 할 일, 칸반, 프로젝트, 팀, 회의, 간트, 설정, 출석, 관리자 페이지 렌더링과 가로 넘침 여부 자동 점검
- 모바일 확장 메뉴가 독립 패널로 열리는지, 빠른 업무 추가 모달이 화면 안에 맞는지 자동 점검
- 업무 모달의 상태/우선순위 선택 UI를 네이티브 select에서 세그먼트 버튼으로 변경해 색상 점과 텍스트 겹침 제거
- 모바일 홈 빠른 액션 타일과 칸반 보드 헤더/컬럼 폭을 모바일 우선으로 조정
- 관련 파일: `client/playwright.config.ts`, `client/tests/ui-audit.spec.ts`, `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/features/dashboard/components/MobileDashboardHome.tsx`, `client/src/features/kanban/components/KanbanHeader.tsx`, `client/src/features/kanban/components/KanbanColumn.tsx`, `client/src/presentation/pages/KanbanBoard.tsx`

#### 카카오 공유 운영 설정 강화 (Codex)
- `VITE_PUBLIC_APP_URL` 기준으로 업무/프로젝트/회의/브리핑 공유 링크가 생성되도록 공용 URL 설정 계층 추가
- 설정 > 연동 탭에 카카오 JavaScript 키, 공유 기준 URL, 현재 접속 도메인, PDF 파일 공유 지원 상태, 운영 환경 변수 복사 UI 추가
- 업무 공유 문구에 담당자, 상태, 우선순위, 마감 정보를 한국어 라벨로 정리
- 프로젝트/회의 공유 문구를 모바일 카카오톡에서 보기 좋은 길이로 압축
- Playwright UI 감사에 설정 연동 탭 렌더링 검증 추가
- 관련 파일: `client/src/shared/share/shareConfig.ts`, `client/src/shared/share/entityShare.ts`, `client/src/shared/share/kakaoShare.ts`, `client/src/shared/share/nativeFileShare.ts`, `client/src/presentation/pages/SettingsPage.tsx`, `client/tests/ui-audit.spec.ts`

#### AI 에이전트 기능 로드맵 작성 (Codex)
- 회의 녹음 업로드, 전사, 회의자료 초안, 액션 아이템 업무 생성 흐름 기획
- AI Assistant, Meeting Scribe Agent, Operations Agent, Briefing Agent, Idea Agent 역할 정의
- 승인 기반 write tool, 감사 로그, 권한 제한, 녹음 보관 정책 등 운영 원칙 정리
- GitHub Actions/VPS/Docker 기반 배포 방향과 AI worker 확장 구조 제안
- 관련 파일: `docs/AI_AGENT_ROADMAP.md`, `AGENTS.md`

### 2026-01-25

#### AttendanceService 모듈화 (우선순위 3) (Claude)
- **문제점**
  - AttendanceService가 835줄로 비대해짐
  - CRUD 로직과 통계 계산 로직이 혼재
  - 유지보수성 및 테스트 용이성 저하

- **모듈 분리**
  - `AttendanceHelper.ts` (93줄) - 날짜/주차 계산 유틸리티
    - `getWeekStart()` - 주 시작일 계산 (일요일 기준)
    - `getWeekEnd()` - 주 종료일 계산
    - `getWeeksInMonth()` - 월의 주차 목록
    - `countByStatus()` - 상태별 출석 카운트
    - `calculateAttendanceRate()` - 출석률 계산
    - `calculateTrend()` - 트렌드 계산 (UP/DOWN/SAME)

  - `AttendanceStatsService.ts` (~350줄) - 통계 계산 서비스
    - `getWeeklyStats()` - 주간 통계 조회
    - `getMonthlyStats()` - 월간 통계 조회
    - `getMemberHistory()` - 개인 출석 이력 조회
    - `getSummary()` - 전체 요약 (대시보드용)
    - `getAbsentees()` - 연속 결석자 목록

  - `AttendanceService.ts` (389줄) - CRUD + 통계 위임
    - CRUD 메서드 유지: `findAll()`, `findByDate()`, `findWeekly()`, `checkBulk()`, `update()`, `delete()`
    - 통계 메서드는 `AttendanceStatsService`로 위임 (delegation pattern)

- **결과**
  - 835줄 → 389줄 (54% 감소)
  - 단일 책임 원칙(SRP) 준수
  - 통계 로직 독립적으로 테스트 가능
  - 유틸리티 함수 재사용 가능

- **관련 파일**
  - `server/src/services/attendance/AttendanceHelper.ts` (신규)
  - `server/src/services/attendance/AttendanceStatsService.ts` (신규)
  - `server/src/services/attendance/index.ts` (신규)
  - `server/src/services/AttendanceService.ts` (리팩토링)

#### 아키텍처 고도화 - Use Case 활용 확대 + 배치 작업 메서드 (Claude)
- **전체 아키텍처 코드 리뷰 실시**
  - 클린 아키텍처 구현 점수: 8.5/10
  - 레거시 코드 완전 제거 확인 (api.ts 삭제됨)
  - Repository/Service 패턴 일관성 확인

- **Use Case 활용 확대**
  - `storeUseCases.ts` 생성 - Store에서 사용할 전역 Use Case 인스턴스
  - 4개 Store에 Use Case 적용:
    - `taskStore.ts` - createTaskUseCase, updateTaskUseCase, deleteTaskUseCase, updateTaskStatusUseCase
    - `projectStore.ts` - createProjectUseCase, updateProjectUseCase, deleteProjectUseCase
    - `memberStore.ts` - inviteMemberUseCase, updateMemberUseCase
    - `teamStore.ts` - createTeamUseCase, updateTeamUseCase, deleteTeamUseCase, addTeamMemberUseCase, removeTeamMemberUseCase
  - ValidationError 처리 로직 추가 (유효성 검증 에러 시 "입력 오류" 토스트)

- **배치 작업 메서드 추가 (우선순위 2)**
  - 클라이언트 ITaskRepository에 `deleteMany()`, `updateMany()` 추가
  - TaskApiSource에 배치 API 호출 메서드 추가
  - TaskRepository 구현체에 배치 메서드 구현
  - MockTaskRepository에 배치 메서드 구현
  - 서버 TaskService에 `deleteMany()`, `updateMany()` 추가
  - routes/tasks.ts에 배치 API 엔드포인트 추가:
    - `POST /api/tasks/batch/delete` - 여러 업무 일괄 삭제
    - `POST /api/tasks/batch/update` - 여러 업무 일괄 수정

- **관련 파일**
  - `client/src/di/storeUseCases.ts` (신규)
  - `client/src/stores/taskStore.ts` - Use Case 적용
  - `client/src/stores/projectStore.ts` - Use Case 적용
  - `client/src/stores/memberStore.ts` - Use Case 적용
  - `client/src/stores/teamStore.ts` - Use Case 적용
  - `client/src/domain/repositories/ITaskRepository.ts` - 배치 메서드
  - `client/src/data/sources/api/TaskApiSource.ts` - 배치 API
  - `client/src/data/repositories/TaskRepository.ts` - 배치 구현
  - `client/src/data/sources/mock/MockTaskRepository.ts` - 배치 구현
  - `server/src/services/TaskService.ts` - 배치 메서드
  - `server/src/routes/tasks.ts` - 배치 엔드포인트

#### 회의자료 작성 모달 고도화 (Claude)
- **주요 개선사항**
  - TipTap 리치 에디터 도입 (WYSIWYG)
  - 5탭 구조로 확장 (기본정보, 안건, 회의내용, 액션아이템, 첨부파일)
  - PC/모바일 반응형 디자인 (모바일 전체화면, 하단 탭 네비게이션)
  - 안건(Agenda) 관리 기능 추가
  - 액션 아이템 관리 기능 추가 (담당자, 마감일, 우선순위)
  - 자동저장 훅 구현 (localStorage + 서버 DRAFT)

- **서버 (Prisma Schema)**
  - `MeetingAgenda` 모델 추가 (안건 관리)
  - `MeetingActionItem` 모델 추가 (액션 아이템)
  - `Meeting.contentType` 필드 추가 (text/json 구분)

- **서버 (MeetingService)**
  - Agenda CRUD 메서드 추가
  - ActionItem CRUD 메서드 추가
  - `reorderAgendas()` - 안건 순서 변경

- **서버 (routes/meetings.ts)**
  - `/meetings/:id/agendas` - 안건 CRUD 엔드포인트
  - `/meetings/:id/action-items` - 액션 아이템 CRUD 엔드포인트

- **클라이언트 (새 컴포넌트)**
  - `presentation/components/modals/meeting/` 폴더 구조
  - `editor/RichTextEditor.tsx` - TipTap 에디터 래퍼
  - `editor/EditorToolbar.tsx` - 반응형 툴바
  - `steps/BasicInfoStep.tsx` - 기본 정보 탭
  - `steps/AgendaStep.tsx` - 안건 관리 탭
  - `steps/ContentStep.tsx` - 회의 내용 탭 (리치 에디터)
  - `steps/ActionItemStep.tsx` - 액션 아이템 탭
  - `steps/AttachmentStep.tsx` - 첨부파일 탭
  - `hooks/useAutoSave.ts` - 자동저장 훅

- **설치된 패키지**
  - `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
  - `@tiptap/extension-placeholder`, `@tiptap/extension-underline`
  - `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
  - `@tiptap/extension-link`, `use-debounce`

- **관련 파일**
  - `server/prisma/schema.prisma` - MeetingAgenda, MeetingActionItem 모델
  - `server/src/services/MeetingService.ts` - Agenda, ActionItem CRUD
  - `server/src/routes/meetings.ts` - 새 엔드포인트
  - `client/src/types/index.ts` - 새 타입 정의
  - `client/src/presentation/components/modals/meeting/` - 새 컴포넌트들

#### 크로스-스토어 동기화 (State Synchronization) 개선 (Claude)
- **문제 분석**
  - 전체 코드베이스 분석 결과, 대부분의 Feature가 Store 기반으로 정상 동기화됨
  - `useKanban.ts`가 dead code로 존재하여 혼란 유발 (로컬 state 패턴 사용)
  - 삭제 작업 시 연관 Store의 데이터가 정리되지 않는 문제 발견

- **Dead Code 정리**
  - `features/kanban/hooks/useKanban.ts` 삭제 (미사용 훅)
  - `features/kanban/hooks/index.ts` - export 제거
  - `features/kanban/index.ts` - useKanban export 제거

- **크로스-스토어 동기화 로직 추가**
  - `projectStore.deleteProject()`:
    - taskStore에서 해당 프로젝트의 태스크 제거
    - routineStore에서 해당 프로젝트의 루틴 제거
  - `memberStore.removeMember()`:
    - taskStore에서 해당 멤버가 assignee인 태스크의 assignee를 null로 변경
    - teamStore에서 모든 팀의 멤버 목록에서 해당 멤버 제거
  - `teamStore.deleteTeam()`:
    - projectStore에서 해당 팀을 참조하는 프로젝트의 teamAssignments 정리

- **관련 파일**
  - `client/src/stores/projectStore.ts` - taskStore, routineStore 동기화
  - `client/src/stores/memberStore.ts` - taskStore, teamStore 동기화
  - `client/src/stores/teamStore.ts` - projectStore 동기화

- **전문 용어 정리**
  | 용어 | 설명 |
  |------|------|
  | Single Source of Truth | 데이터가 한 곳에서만 관리되어 불일치 방지 |
  | State Synchronization | 여러 곳의 상태를 일관되게 유지 |
  | Cascade Delete | 부모 삭제 시 자식 데이터도 함께 삭제 |

#### 교회 셀 그룹 출석체크 기능 구현 (Claude)
- **요구사항**
  - 체크 주기: 주일예배 + 셀 모임 (주 2회)
  - 셀 구조: 새로운 Cell 테이블 (기존 팀과 독립)
  - 출석 상태: 출석, 결석, 지각, 사유결석, 온라인참석 (5가지)
  - 통계: 개인별/셀별 출석률, 미출석자 알림

- **서버 (Prisma Schema)**
  - `Cell` 모델 - 셀 그룹 (이름, 설명, 색상, 리더)
  - `CellMember` 모델 - 셀 구성원 (역할: LEADER, SUB_LEADER, MEMBER)
  - `Attendance` 모델 - 출석 기록 (meetingType: SUNDAY_SERVICE, CELL_MEETING)
  - `Member` 모델에 관계 추가 (ledCells, cellMemberships, attendances, checkedAttendances)

- **서버 (Service 계층)**
  - `CellService` - 셀 CRUD, 구성원 관리 (추가/제거/역할 변경)
  - `AttendanceService` - 일괄 출석 체크, 주간/월간 통계, 미출석자 추적

- **서버 (라우트)**
  - `routes/cells.ts` - 셀 관리 API (/api/cells)
  - `routes/attendance.ts` - 출석 관리 API (/api/attendance)
  - DI Container에 CellService, AttendanceService 등록

- **클라이언트 (Domain 계층)**
  - `domain/entities/Cell.ts` - Cell, CellMember, MyCellInfo 타입
  - `domain/entities/Attendance.ts` - Attendance, WeeklyStats, MonthlyStats, AttendanceSummary 타입
  - `domain/repositories/ICellRepository.ts` - 셀 Repository 인터페이스
  - `domain/repositories/IAttendanceRepository.ts` - 출석 Repository 인터페이스

- **클라이언트 (Data 계층)**
  - `data/sources/api/CellApiSource.ts` - 셀 API 호출
  - `data/sources/api/AttendanceApiSource.ts` - 출석 API 호출
  - `data/repositories/CellRepository.ts` - ICellRepository 구현
  - `data/repositories/AttendanceRepository.ts` - IAttendanceRepository 구현
  - `di/createRepositories.ts` - cellRepository, attendanceRepository 추가
  - `di/RepositoryContext.tsx` - useCellRepository, useAttendanceRepository hooks 추가

- **클라이언트 (Feature 계층)**
  - `features/attendance/types/` - 출석 관련 타입 정의
  - `features/attendance/hooks/useCells.ts` - 셀 목록/상세 관리
  - `features/attendance/hooks/useAttendanceCheck.ts` - 출석 체크 로직
  - `features/attendance/hooks/useAttendanceStats.ts` - 통계 조회
  - `features/attendance/components/` - 컴포넌트 (CellCard, AttendanceCheckGrid, StatsCards 등)

- **클라이언트 (Presentation 계층)**
  - `pages/AttendanceDashboard.tsx` - 주간 현황, 빠른 체크 링크
  - `pages/AttendanceCheckPage.tsx` - 출석 체크 UI (주일/셀모임 탭)
  - `pages/CellManagementPage.tsx` - 셀 CRUD, 구성원 관리
  - `pages/AttendanceReportsPage.tsx` - 주간/월간 통계 리포트

- **라우팅 통합**
  - `App.tsx` - /attendance, /attendance/check, /attendance/cells, /attendance/reports 라우트 추가
  - `TopNavigation.tsx` - "셀 출석" 메뉴 항목 추가 (ClipboardCheck 아이콘)

#### Zustand Store 마이그레이션 + api.ts 삭제 (Claude)
- **Store용 전역 Repository 생성**
  - `di/storeRepositories.ts` - Store에서 사용할 전역 Repository 인스턴스
  - 환경 변수 `VITE_USE_MOCK`에 따라 Mock/API 자동 선택

- **Zustand Store 마이그레이션 완료**
  - `taskStore.ts` - `tasksApi` → `taskRepository`
  - `projectStore.ts` - `projectsApi` → `projectRepository`
  - `memberStore.ts` - `membersApi` → `memberRepository`
  - `teamStore.ts` - `teamsApi` → `teamRepository`
  - `meetingStore.ts` - `meetingsApi` → `meetingRepository`
  - `routineStore.ts` - `routineTasksApi` → `routineRepository`

- **레거시 api.ts 삭제**
  - 1,867줄의 레거시 API 클라이언트 파일 삭제
  - 모든 의존성이 Repository 패턴으로 마이그레이션됨
  - `services/mockData.ts`는 Mock 시스템에서 사용 중으로 유지

#### 레거시 api.ts 정리 - UI 컴포넌트 마이그레이션 (Claude)
- **신규 Repository 생성**
  - `IAuthRepository` + `AuthRepository` + `AuthApiSource` + `MockAuthRepository`
  - `IRoutineRepository` + `RoutineRepository` + `RoutineApiSource` + `MockRoutineRepository`
  - `IMeetingRepository` + `MeetingRepository` + `MeetingApiSource` + `MockMeetingRepository`
  - `IAdminRepository` + `AdminRepository` + `AdminApiSource` + `MockAdminRepository`

- **DI Context 업데이트**
  - `RepositoryContext.tsx` - 4개 신규 Repository 타입 및 hooks 추가
  - `createRepositories.ts` - 4개 신규 Repository 생성 로직 추가
  - `di/index.ts` - 신규 hooks export 추가

- **UI 컴포넌트 마이그레이션 완료**
  - `Login.tsx` - `authApi` → `useAuthRepository()` 사용
  - `TopNavigation.tsx` - `authApi` → `useAuthRepository()` 사용
  - `MobileMenu.tsx` - `authApi` → `useAuthRepository()` 사용
  - `AdminPage.tsx` - `adminApi` → `useAdminRepository()` 사용
  - `TeamMemberModal.tsx` - `adminApi` → `useAdminRepository()` 사용

- **authStore 마이그레이션**
  - `tokenManager` import를 `@/services/api` → `createTokenManager from @/data/sources/api/HttpClient`로 변경

- **결과**: api.ts 의존성 12개 → 6개로 감소 (Zustand Store만 잔여)

#### Use Case 계층 완성 (Claude)
- **Task Use Cases 추가**
  - `UpdateTaskUseCase` - 업무 수정 (유효성 검증 포함)
  - `DeleteTaskUseCase` - 업무 삭제

- **Project Use Cases 추가**
  - `UpdateProjectUseCase` - 프로젝트 수정
  - `DeleteProjectUseCase` - 프로젝트 삭제

- **Member Use Cases 생성**
  - `GetMembersUseCase` - 멤버 목록 조회
  - `InviteMemberUseCase` - 멤버 초대 (이메일 형식 검증)
  - `UpdateMemberUseCase` - 멤버 정보 수정

- **Team Use Cases 생성**
  - `GetTeamsUseCase` - 팀 목록 조회
  - `CreateTeamUseCase` - 팀 생성 (이름, 색상 필수)
  - `UpdateTeamUseCase` - 팀 수정
  - `DeleteTeamUseCase` - 팀 삭제
  - `AddTeamMemberUseCase` - 팀 멤버 추가
  - `RemoveTeamMemberUseCase` - 팀 멤버 제거

- **Dashboard Use Cases 생성**
  - `GetDashboardDataUseCase` - 대시보드 전체 데이터 조회
  - `GetMyTasksUseCase` - 내 업무 조회
  - `GetRecentActivitiesUseCase` - 최근 활동 조회

- **Index 파일 업데이트**
  - `domain/usecases/index.ts` - 모든 Use Case export 추가

#### Mock Repository 완성 (Claude)
- **신규 Mock Repository 생성**
  - `MockMemberRepository` - 멤버 CRUD, 역할 관리, 업무량 통계
  - `MockTeamRepository` - 팀 CRUD, 팀 멤버 관리, 팀 통계
  - `MockDashboardRepository` - 대시보드 데이터, 진행현황, 활동 로그

- **Index 파일 업데이트**
  - `data/sources/mock/index.ts` - 신규 Mock Repository export 추가

#### 초기 클린 아키텍처 구축 (Claude)
- **서버**
  - `shared/database.ts` - Prisma 싱글톤 생성
  - `shared/errors.ts` - 커스텀 에러 클래스 생성
  - `services/` - TaskService, ProjectService, MemberService, ActivityLogService 생성
  - `di/container.ts` - DI 컨테이너 생성
  - `routes/tasks.ts` - Service 사용으로 리팩토링

- **클라이언트**
  - `domain/repositories/` - 5개 Repository 인터페이스 생성
  - `data/sources/api/` - HttpClient, ApiError, 5개 ApiSource 생성
  - `data/repositories/` - 5개 Repository 구현체 생성
  - `data/sources/mock/` - MockStorage, MockTask/ProjectRepository 생성
  - `domain/usecases/` - 5개 Use Case 생성
  - `di/` - RepositoryContext, RepositoryProvider, createRepositories 생성
  - `App.tsx` - RepositoryProvider 래핑

- **문서**
  - `CLAUDE.md` - 아키텍처 가이드 생성
  - `docs/ARCHITECTURE.md` - 상세 아키텍처 문서 생성
  - `IMPLEMENTATION.md` - 구현 현황 추적 파일 생성

#### 서버 라우트 Service 전환 (Claude)
- **신규 Service 생성**
  - `services/DashboardService.ts` - 대시보드 통계, 팀 진행현황, 최근 활동 조회
  - `services/AuthService.ts` - 로그인, 현재 사용자 조회, 비밀번호 변경

- **라우트 리팩토링**
  - `routes/projects.ts` - ProjectService 사용으로 전환
  - `routes/members.ts` - MemberService 사용으로 전환
  - `routes/dashboard.ts` - DashboardService 사용으로 전환
  - `routes/auth.ts` - AuthService 사용으로 전환

- **DI Container 업데이트**
  - `di/container.ts` - DashboardService, AuthService 등록
  - 편의 함수 추가: `getDashboardService()`, `getAuthService()`

#### MeetingService + Storage 아키텍처 (Claude)
- **스토리지 추상화 계층 생성**
  - `services/storage/IStorageService.ts` - 스토리지 인터페이스 정의
  - `services/storage/LocalStorageService.ts` - 로컬 파일시스템 구현
  - 추후 `OneDriveStorageService` 구현으로 쉽게 교체 가능

- **MeetingService 생성**
  - `services/MeetingService.ts` - 회의자료 CRUD, 첨부파일, 댓글 관리
  - IStorageService 의존성 주입으로 스토리지 교체 용이

- **라우트 리팩토링**
  - `routes/meetings.ts` - 657줄 → 225줄로 대폭 간소화
  - MeetingService 사용으로 전환

- **DI Container 업데이트**
  - StorageService, MeetingService 등록
  - 편의 함수 추가: `getMeetingService()`, `getStorageService()`

#### Feature Hooks Repository 마이그레이션 (Claude)
- **마이그레이션 완료**
  - `useKanban.ts` - `projectsApi`, `tasksApi`, `membersApi` → Repository hooks 사용
  - `useDashboard.ts` - `dashboardApi` → `useDashboardRepository()` 사용
  - `useTeam.ts` - `membersApi`, `tasksApi` → Repository hooks 사용
  - `useTeamDetail.ts` - `teamsApi` → `useTaskRepository()` 사용

- **변경 패턴**
  - `@/services/api` import 제거
  - `@/di` 에서 Repository hooks import
  - API 호출을 Repository 메서드로 대체
  - 의존성 배열에 Repository 추가

---

## 다음 작업 우선순위

### 🚀 배포 (Railway + OneDrive + 도메인)

| 순서 | 작업 | 상태 | 비고 |
|------|------|------|------|
| 1 | Railway Hobby 플랜 가입 | ⬜ 대기 | $5/월 + 사용량 |
| 2 | Railway 프로젝트 생성 | ⬜ 대기 | |
| 3 | Railway PostgreSQL 추가 | ⬜ 대기 | DATABASE_URL 환경변수 설정 |
| 4 | Express 서버 배포 | ⬜ 대기 | `server/` 디렉토리 |
| 5 | React 클라이언트 빌드 & 배포 | ⬜ 대기 | `client/` 디렉토리 |
| 6 | OneDriveStorageService 구현 | ⬜ 대기 | Microsoft Graph API 연동 |
| 7 | 도메인 구매 | ⬜ 대기 | Cloudflare/Namecheap/가비아 중 선택 |
| 8 | Railway 커스텀 도메인 연결 | ⬜ 대기 | DNS 설정 |

#### 배포 상세 체크리스트

**Railway 설정**
- [ ] Railway 계정 생성 및 Hobby 플랜 구독
- [ ] 새 프로젝트 생성
- [ ] PostgreSQL 플러그인 추가
- [ ] 환경 변수 설정
  - `DATABASE_URL` - PostgreSQL 연결 문자열
  - `NODE_ENV=production`
  - `JWT_SECRET` - 인증 시크릿
- [ ] server 배포 (Node.js)
- [ ] client 빌드 후 정적 파일 서빙 또는 별도 배포

**OneDrive 연동**
- [ ] Azure Portal에서 앱 등록
- [ ] Microsoft Graph API 권한 설정 (Files.ReadWrite)
- [ ] `OneDriveStorageService` 구현 (`server/src/services/storage/`)
- [ ] IStorageService 구현체 교체 (LocalStorage → OneDrive)

**도메인 설정**
- [ ] 도메인 구매 (예: intruth.com)
- [ ] Railway 프로젝트에 커스텀 도메인 추가
- [ ] DNS 레코드 설정 (CNAME 또는 A 레코드)
- [ ] SSL 인증서 확인 (Railway 자동 제공)

#### 예상 비용
| 항목 | 월 비용 |
|------|---------|
| Railway (서버 + DB) | $10~15 |
| OneDrive | $0 (기존 1TB 보유) |
| 도메인 | ~$1 (연 $10~15) |
| **총합** | **~$12~17/월** |

---

### 기능 관련

1. **출석체크 기능 테스트**
   - 서버 마이그레이션 실행: `npx prisma migrate dev --name add_attendance`
   - 셀 CRUD, 구성원 추가/제거, 출석 체크, 통계 확인
2. **선택적**: 출석 통계 차트 (recharts 라이브러리 활용)

---

## 참고사항

- 새로운 기능 추가 시 반드시 클린 아키텍처 패턴을 따를 것
- 작업 완료 후 이 파일의 해당 섹션 업데이트 필수
- `CLAUDE.md` 파일도 구조 변경 시 함께 업데이트
