# INTRUTH.COM 클린 아키텍처 구현 현황

> **이 파일은 아키텍처 관련 작업이 완료될 때마다 업데이트됩니다.**
> 작업 완료 시 반드시 해당 섹션에 기록을 추가하세요.

---

## 구현 진행률

```
서버 라우트 Service 전환  ████████████████████ 100% (9/9)
클라이언트 Feature Hooks  ████████████████████ 100% (10/10)
Use Case 계층            ████████████████████ 100% (18/18)
Mock Repository          ████████████████████ 100% (10/10)
Repository 계층          ████████████████████ 100% (11/11)
Zustand Store 마이그레이션 ████████████████████ 100% (6/6)
Zustand Store Use Case   ████████████████████ 100% (4/4)
배치 작업 메서드          ████████████████████ 100% (deleteMany, updateMany)
레거시 api.ts 정리        ████████████████████ 100% (파일 삭제 완료)
Service 모듈화           ████████████████████ 100% (AttendanceService 분리)
모바일/PWA/공유/UI 기반  ████████████████████ 1차 완료 (PWA, 모바일 Nav, Kakao/PDF, 모바일 모달, Playwright UI 검수)
AI 회의 녹음/전사 기반   ████████████████████ 1차 완료 (녹음 업로드, 저장, OpenAI 전사, 회의 상세 UI)
```

**마지막 업데이트**: 2026-04-30

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
| `routes/meetings.ts` | 2026-01-25 | Claude | MeetingService + IStorageService 아키텍처 |
| `routes/cells.ts` | 2026-01-25 | Claude | CellService 사용, 셀 그룹 관리 |
| `routes/attendance.ts` | 2026-01-25 | Claude | AttendanceService 사용, 출석체크 기능 |
| `routes/ai.ts` | 2026-04-30 | Codex | AiTranscriptionService 사용, 회의 녹음 업로드/전사 |

### 미완료
없음 - 모든 라우트 전환 완료!

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
| `MeetingService` | 2026-01-25 | Claude | `server/src/services/MeetingService.ts` |
| `CellService` | 2026-01-25 | Claude | `server/src/services/CellService.ts` |
| `AttendanceService` | 2026-01-25 | Claude | `server/src/services/AttendanceService.ts` |
| `AiTranscriptionService` | 2026-04-30 | Codex | `server/src/services/ai/AiTranscriptionService.ts` |

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
| 업무/회의 딥링크 처리 | 2026-04-30 | Codex | `client/src/presentation/pages/KanbanBoard.tsx`, `client/src/presentation/pages/MeetingsPage.tsx` |
| 업무/프로젝트 상세 공유 UI | 2026-04-30 | Codex | `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/presentation/components/modals/ProjectProgressModal.tsx` |
| 프로젝트 딥링크 처리 | 2026-04-30 | Codex | `client/src/presentation/pages/ProjectsPage.tsx` |
| 모바일 전체화면 모달 정리 | 2026-04-30 | Codex | `client/src/presentation/components/modals/SpatialTaskModal.tsx`, `client/src/presentation/components/modals/SpatialProjectModal.tsx`, `client/src/presentation/components/modals/ProjectProgressModal.tsx` |
| 카카오 연동 상태 설정 탭 | 2026-04-30 | Codex | `client/src/presentation/pages/SettingsPage.tsx` |
| 모바일 주간 브리핑 공유 | 2026-04-30 | Codex | `client/src/features/dashboard/components/MobileDashboardHome.tsx` |
| Playwright 모바일/데스크톱 UI 감사 | 2026-04-30 | Codex | `client/playwright.config.ts`, `client/tests/ui-audit.spec.ts` |
| 공유 운영 설정/도메인 점검 | 2026-04-30 | Codex | `client/src/shared/share/shareConfig.ts`, `client/src/presentation/pages/SettingsPage.tsx` |
| AI 에이전트 기능 기획 | 2026-04-30 | Codex | `docs/AI_AGENT_ROADMAP.md` |

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

### 남은 작업
| 항목 | 상태 | 비고 |
|------|------|------|
| 전사 → 회의자료 초안 생성 | ⬜ 대기 | `AiMeetingDraftService`로 결정사항/액션 아이템 추출 예정 |
| 긴 회의 녹음 압축/청크 처리 | ⬜ 대기 | OpenAI Audio API 업로드 25MB 제한 대응 필요 |
| AI 처리 감사 로그/비용 로그 | ⬜ 대기 | AgentRun/AiAuditLog 모델 설계 후 연결 |
| 원본 오디오 보관 기간 정책 | ⬜ 대기 | 기본 30일 자동 삭제 권장 |

---

## 작업 이력 (Changelog)

### 2026-04-30

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
