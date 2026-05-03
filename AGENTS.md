# INTRUTH.COM 프로젝트 아키텍처 가이드

> **중요**: 이 프로젝트는 **클린 아키텍처** 기반으로 구축되어 있습니다.
> 코드 작성 전에 이 가이드를 반드시 숙지하세요.

---

## 필수 규칙 (IMPORTANT)

### 작업 완료 시 문서 업데이트

**아키텍처 관련 작업 완료 후 반드시 다음 파일들을 업데이트하세요:**

1. **`IMPLEMENTATION.md`** - 작업 이력 기록 (필수)
   - 해당 섹션의 완료 테이블에 작업 추가
   - 작업 이력(Changelog) 섹션에 상세 내역 기록
   - 진행률 바 업데이트

2. **`AGENTS.md`** - 구조 변경 시 업데이트 (해당 시)
   - 새로운 폴더/파일 구조 추가
   - 마이그레이션 상태 체크박스 업데이트

### 업데이트가 필요한 작업 유형

| 작업 유형 | IMPLEMENTATION.md | AGENTS.md |
|-----------|-------------------|-----------|
| 새 Service 생성 | ✅ 필수 | ❌ 불필요 |
| 새 Repository 생성 | ✅ 필수 | ❌ 불필요 |
| 새 Use Case 생성 | ✅ 필수 | ❌ 불필요 |
| 라우트 Service 전환 | ✅ 필수 | ✅ 체크박스 |
| Hook Repository 전환 | ✅ 필수 | ✅ 체크박스 |
| 새 계층/폴더 추가 | ✅ 필수 | ✅ 구조도 |

### IMPLEMENTATION.md 작성 형식

```markdown
## 작업 이력 (Changelog)

### YYYY-MM-DD

#### 작업 제목 (작업자)
- 완료 항목 1
- 완료 항목 2
- 관련 파일: `path/to/file.ts`
```

---

## 프로젝트 개요

- **프로젝트 타입**: 업무 관리 시스템 (Workflow Management)
- **프론트엔드**: React + TypeScript + Vite
- **백엔드**: Node.js + Express + Prisma
- **상태관리**: Zustand
- **스타일링**: Tailwind CSS

---

## 아키텍처 구조

### 클라이언트 (client/src/)

```
├── data/                          # 데이터 계층
│   ├── sources/
│   │   ├── api/                   # API 통신
│   │   │   ├── HttpClient.ts      # HTTP 클라이언트 (토큰, 에러 처리)
│   │   │   ├── ApiError.ts        # API 에러 클래스
│   │   │   ├── TaskApiSource.ts   # Task API
│   │   │   ├── ProjectApiSource.ts
│   │   │   ├── MemberApiSource.ts
│   │   │   ├── TeamApiSource.ts
│   │   │   └── DashboardApiSource.ts
│   │   └── mock/                  # Mock 데이터
│   │       ├── MockStorage.ts     # localStorage 관리
│   │       ├── MockTaskRepository.ts
│   │       └── MockProjectRepository.ts
│   └── repositories/              # Repository 구현체
│       ├── TaskRepository.ts
│       ├── ProjectRepository.ts
│       ├── MemberRepository.ts
│       ├── TeamRepository.ts
│       └── DashboardRepository.ts
│
├── domain/                        # 도메인 계층
│   ├── entities/                  # 엔티티 정의
│   │   ├── Task.ts
│   │   ├── Project.ts
│   │   └── Column.ts
│   ├── repositories/              # Repository 인터페이스
│   │   ├── ITaskRepository.ts
│   │   ├── IProjectRepository.ts
│   │   ├── IMemberRepository.ts
│   │   ├── ITeamRepository.ts
│   │   └── IDashboardRepository.ts
│   └── usecases/                  # Use Case 계층
│       ├── UseCase.ts             # 기본 인터페이스
│       ├── task/
│       │   ├── GetTasksUseCase.ts
│       │   ├── CreateTaskUseCase.ts
│       │   └── UpdateTaskStatusUseCase.ts
│       └── project/
│           ├── GetProjectsUseCase.ts
│           └── CreateProjectUseCase.ts
│
├── di/                            # 의존성 주입
│   ├── RepositoryContext.tsx      # React Context
│   ├── RepositoryProvider.tsx     # Provider 컴포넌트
│   └── createRepositories.ts      # Factory 함수
│
├── features/                      # 기능별 모듈
│   ├── ai-agent/
│   │   └── AgentCommandCenter.tsx       # 전역 AI 명령형 채팅 패널
│   ├── dashboard/
│   │   └── components/
│   │       ├── MobileDashboardHome.tsx      # 모바일 우선 홈 대시보드
│   │       └── ScheduleCalendar.tsx         # 대시보드 업무/회의 월간 일정표
│   ├── kanban/
│   ├── projects/
│   ├── my-tasks/
│   ├── team/
│   └── settings/
│
├── presentation/                  # UI 계층
│   ├── pages/
│   │   ├── MeetingDocumentPage.tsx         # 회의자료 고유 링크 페이지
│   │   └── FileManagementPage.tsx          # 파일관리 허브/향후 편집 도구 진입점
│   └── components/
│       ├── layout/
│       │   ├── navigationConfig.ts         # 대시보드/회의자료/프로젝트 중심 메뉴 정의
│       │   └── MobileBottomNavigation.tsx  # 모바일 하단 내비게이션
│       └── pwa/
│           └── PwaInstallPrompt.tsx        # PWA 설치 안내
│
├── shared/                        # 클라이언트 공통 유틸리티
│   ├── ai/                        # AI 기능 API 유틸리티
│   │   └── meetingRecordingApi.ts # 회의 녹음 업로드/전사/자료 생성 API
│   ├── pwa/                       # PWA 등록/설치 프롬프트
│   │   ├── registerServiceWorker.ts
│   │   └── useInstallPrompt.ts
│   └── share/                     # 카카오/네이티브/PDF 공유
│       ├── kakaoShare.ts
│       ├── nativeFileShare.ts
│       ├── entityShare.ts
│       └── meetingPdf.ts
│
├── stores/                        # Zustand 상태 관리
│   ├── taskStore.ts
│   ├── projectStore.ts
│   └── ...
│
├── services/                      # 레거시 API (점진적 마이그레이션 중)
│   └── api.ts                     # 기존 API 클라이언트
│
└── types/                         # TypeScript 타입 정의
    └── index.ts
```

### 클라이언트 테스트 (client/)

```
├── playwright.config.ts           # Playwright 모바일/데스크톱 UI 감사 설정
└── tests/
    └── ui-audit.spec.ts           # 주요 페이지 렌더링, 모바일 메뉴, 빠른 추가 모달 검증
```

### 로컬 개발 스크립트 (scripts/)

```
└── dev-postgres.mjs               # 설치형 PostgreSQL 없이 개발용 DB 실행
```

### 서버 (server/src/)

```
├── shared/                        # 공유 유틸리티
│   ├── database.ts                # Prisma 인스턴스 관리
│   └── errors.ts                  # 커스텀 에러 클래스
│
├── services/                      # Service 계층 (비즈니스 로직)
│   ├── ActivityLogService.ts
│   ├── TaskService.ts
│   ├── ProjectService.ts
│   ├── MemberService.ts
│   ├── AdminService.ts             # 관리자 사용자 API
│   └── ai/
│       ├── AiTranscriptionService.ts  # 회의 녹음 업로드/전사/회의자료 생성
│       ├── AiAssistantService.ts      # AI 명령 로그/메모리/승인 액션
│       └── AgentToolRegistry.ts       # 승인 기반 프로젝트/회의/업무/팀 생성 도구
│
├── di/                            # 의존성 주입
│   └── container.ts               # DI Container
│
├── routes/                        # Express 라우트
│   ├── tasks.ts                   # Service 사용
│   ├── projects.ts
│   ├── members.ts
│   ├── ai.ts                      # AI 회의 녹음/전사/회의자료 생성/Assistant/Agent Tool Plan
│   ├── admin.ts                   # 관리자 사용자 관리 API
│   ├── teams.ts                   # Team/TeamMember DB 기반 팀 API
│   ├── routineTasks.ts            # 루틴 업무 API 조회 호환 라우트
│   └── ...
│
├── middleware/
│   └── auth.ts                    # 인증 미들웨어
│
└── app.ts                         # Express 앱 설정
```

---

## 의존성 규칙

```
[외부]  Presentation → Features → Use Cases → Repositories → API/Mock  [내부]
                              ↓
                          Entities
```

**절대 위반하지 말 것:**
- 내부 계층은 외부 계층에 의존하지 않음
- Repository 구현체는 인터페이스에 의존
- Use Case는 Repository 인터페이스에만 의존

---

## 코드 작성 가이드

### 1. 새로운 기능 추가 시

1. **도메인 정의** (필요시)
   - `domain/entities/` - 엔티티 인터페이스
   - `domain/repositories/` - Repository 인터페이스

2. **데이터 계층 구현**
   - `data/sources/api/` - API Source 클래스
   - `data/repositories/` - Repository 구현체

3. **Use Case 작성** (복잡한 비즈니스 로직)
   - `domain/usecases/` - Use Case 클래스

4. **UI 구현**
   - `features/` 또는 `presentation/` - 컴포넌트

### 2. Repository 사용 방법

```tsx
// Hook으로 Repository 사용
import { useTaskRepository } from '@/di';

function MyComponent() {
  const taskRepository = useTaskRepository();

  const loadTasks = async () => {
    const tasks = await taskRepository.findAll({ projectId: '123' });
  };
}
```

### 3. Use Case 사용 방법

```tsx
import { useTaskRepository } from '@/di';
import { CreateTaskUseCase } from '@/domain/usecases';

function MyComponent() {
  const taskRepository = useTaskRepository();
  const createTaskUseCase = useMemo(
    () => new CreateTaskUseCase(taskRepository),
    [taskRepository]
  );

  const handleCreate = async (data) => {
    try {
      const task = await createTaskUseCase.execute(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        // 유효성 검증 에러 처리
      }
    }
  };
}
```

### 4. 서버 Service 사용 방법

```typescript
// routes/tasks.ts
import { getTaskService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

router.get('/', authenticate, async (req, res) => {
  try {
    const taskService = getTaskService();
    const tasks = await taskService.findAll(params);
    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});
```

---

## 환경 변수

### 클라이언트 (.env)
```
VITE_USE_MOCK=true|false      # Mock 모드 사용 여부
VITE_API_BASE_URL=/api        # API 기본 URL
VITE_LOG_LEVEL=error          # 로그 레벨 (debug|info|warn|error)
VITE_KAKAO_JAVASCRIPT_KEY=    # Kakao JavaScript SDK 키 (선택)
```

### 서버 (.env)
```
DATABASE_URL=                  # Prisma DB 연결 문자열
NODE_ENV=development|production
OPENAI_API_KEY=                # OpenAI API 키 (AI 전사/에이전트 기능)
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe  # 전사 모델
OPENAI_TRANSCRIBE_PROMPT=      # 한국어/교회 용어 전사용 추가 문맥
OPENAI_MEETING_MODEL=gpt-4o-mini  # 회의자료 구조화 생성 모델
OPENAI_ASSISTANT_MODEL=gpt-4o-mini  # AI 명령/Assistant 모델
OPENAI_PROMPT_CACHE_RETENTION=      # 선택: in_memory|24h, 비우면 모델 기본값
OPENAI_ASSISTANT_INPUT_COST_PER_1M= # 선택: 비용 추정용 일반 입력 단가
OPENAI_ASSISTANT_CACHED_INPUT_COST_PER_1M= # 선택: 비용 추정용 캐시 입력 단가
OPENAI_ASSISTANT_OUTPUT_COST_PER_1M= # 선택: 비용 추정용 출력 단가
```

---

## 주요 파일 위치

| 목적 | 경로 |
|------|------|
| Task Repository 인터페이스 | `client/src/domain/repositories/ITaskRepository.ts` |
| Task Repository 구현체 | `client/src/data/repositories/TaskRepository.ts` |
| Task API Source | `client/src/data/sources/api/TaskApiSource.ts` |
| Task Use Case | `client/src/domain/usecases/task/` |
| DI Provider | `client/src/di/RepositoryProvider.tsx` |
| 서버 Task Service | `server/src/services/TaskService.ts` |
| 서버 AI 전사 Service | `server/src/services/ai/AiTranscriptionService.ts` |
| 서버 AI 라우트 | `server/src/routes/ai.ts` |
| 서버 DI Container | `server/src/di/container.ts` |
| 에러 클래스 | `server/src/shared/errors.ts` |
| 클라이언트 회의 녹음 API | `client/src/shared/ai/meetingRecordingApi.ts` |

---

## 마이그레이션 상태

> **상세 현황**: `IMPLEMENTATION.md` 파일 참조

**클린 아키텍처 마이그레이션 완료!** (2026-01-25)

**완료:**
- [x] Repository 계층 (Task, Project, Member, Team, Dashboard, Auth, Routine, Meeting, Admin)
- [x] Use Case 계층 (Task, Project)
- [x] 클라이언트 DI (RepositoryProvider)
- [x] 서버 Service 계층 (Task, Project, Member, Dashboard, Auth, Admin, Meeting, AI Transcription, AI Assistant, Agent Tool Registry)
- [x] 서버 DI Container
- [x] routes/tasks.ts 마이그레이션
- [x] routes/projects.ts 마이그레이션
- [x] routes/members.ts 마이그레이션
- [x] routes/dashboard.ts 마이그레이션
- [x] routes/auth.ts 마이그레이션
- [x] routes/meetings.ts 마이그레이션 (IStorageService 추상화 적용)
- [x] Feature hooks Repository 사용으로 전환 (kanban, dashboard, team, teamDetail)
- [x] Zustand Store Repository 전환 (task, project, member, team, meeting, routine)
- [x] 레거시 api.ts 삭제 완료
- [x] 모바일 PWA 기반 구축 (manifest, service worker, 설치 프롬프트)
- [x] 모바일 하단 내비게이션 및 빠른 추가 액션 시트
- [x] 카카오 링크 공유 및 회의자료 PDF 파일 공유 1차 구현
- [x] 모바일 홈 대시보드 및 업무/회의 딥링크 처리
- [x] AI 회의 녹음 업로드/전사 기반 1차 구현
- [x] AI 회의자료 초안 생성 및 회의 요약/액션아이템 반영
- [x] AI 계정별 명령 로그/압축 메모리 및 프롬프트 캐시 키 기반 구축
- [x] AI Agent Tool Registry 기반 승인 실행 계획 (프로젝트/회의자료/업무/팀 생성)
- [x] Team/TeamMember DB 기반 팀 API 및 회의자료 팀 연결
- [x] 회의자료 고유 링크 페이지(`/meetings/:meetingId`) 및 Notion형 문서 진입 구조
- [x] 브라우저 직접 녹음, 자동 전사, AI 회의자료 초안 자동 생성 흐름

**향후 작업:**
- [ ] OneDriveStorageService 구현 (서버 배포 시)
- [ ] Kakao Developers 앱 JavaScript 키/도메인/공유 설정
- [ ] 서버 기반 자료 공유 링크 및 장기 저장 설계
- [ ] AI 회의자료 승인 UX 고도화 및 업무 전환 화면 확장

---

## 체크리스트 (코드 리뷰)

- [ ] 새 기능이 올바른 계층에 위치하는가?
- [ ] Repository 인터페이스를 통해 데이터에 접근하는가?
- [ ] 비즈니스 로직이 Use Case 또는 Service에 있는가?
- [ ] 컴포넌트가 데이터 계층에 직접 의존하지 않는가?
- [ ] 에러 처리가 적절히 되어 있는가?

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| `IMPLEMENTATION.md` | 구현 현황 및 작업 이력 추적 |
| `docs/ARCHITECTURE.md` | 상세 아키텍처 문서 (다이어그램, 코드 예시) |
| `docs/AI_AGENT_ROADMAP.md` | AI 회의기록/에이전트 기능 기획 및 로드맵 |

---

## 연락처

질문이 있으면 프로젝트 담당자에게 문의하세요.
