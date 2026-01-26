# INTRUTH.COM 클린 아키텍처 상세 문서

## 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [계층별 상세 설명](#계층별-상세-설명)
3. [의존성 주입 패턴](#의존성-주입-패턴)
4. [코드 예시](#코드-예시)
5. [테스트 전략](#테스트-전략)
6. [마이그레이션 가이드](#마이그레이션-가이드)

---

## 아키텍처 개요

### 클린 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Modals    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Features                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Hooks     │  │ Components  │  │   Types     │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Use Cases                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CreateTaskUseCase  │  GetProjectsUseCase  │  ...       │    │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Domain (Repositories)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ITaskRepository  │  IProjectRepository  │  ...         │    │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data (Implementation)                       │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  TaskRepository  │              │ MockTaskRepository│         │
│  └────────┬─────────┘              └────────┬─────────┘         │
│           │                                  │                   │
│           ▼                                  ▼                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  TaskApiSource   │              │   MockStorage    │         │
│  └────────┬─────────┘              └──────────────────┘         │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │   HttpClient     │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 계층별 상세 설명

### 1. Presentation Layer (프레젠테이션 계층)

**위치**: `client/src/presentation/`

**책임**:
- UI 렌더링
- 사용자 입력 처리
- 상태 표시

**포함 요소**:
- Pages: 라우트별 페이지 컴포넌트
- Components: 재사용 가능한 UI 컴포넌트
- Modals: 모달 다이얼로그

**규칙**:
- 비즈니스 로직 포함 금지
- Feature 계층 또는 Store에만 의존

### 2. Features Layer (기능 계층)

**위치**: `client/src/features/`

**책임**:
- 특정 기능 도메인의 로직 캡슐화
- 커스텀 훅 제공
- 기능별 컴포넌트 관리

**구조**:
```
features/
├── kanban/
│   ├── components/    # 칸반 전용 컴포넌트
│   ├── hooks/         # useKanban 등
│   ├── types/         # 칸반 관련 타입
│   └── index.ts       # 공개 API
```

### 3. Use Cases Layer (유스케이스 계층)

**위치**: `client/src/domain/usecases/`

**책임**:
- 비즈니스 규칙 구현
- 입력 검증
- 여러 Repository 조합

**예시**:
```typescript
// CreateTaskUseCase.ts
export class CreateTaskUseCase implements UseCase<CreateTaskDTO, Task> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(input: CreateTaskDTO): Promise<Task> {
    // 비즈니스 규칙 검증
    if (!input.title?.trim()) {
      throw new ValidationError('업무 제목은 필수입니다.');
    }

    if (input.dueDate && input.startDate) {
      if (new Date(input.dueDate) < new Date(input.startDate)) {
        throw new ValidationError('마감일은 시작일 이후여야 합니다.');
      }
    }

    return this.taskRepository.create(input);
  }
}
```

### 4. Domain Layer (도메인 계층)

**위치**: `client/src/domain/`

**포함 요소**:
- **entities/**: 비즈니스 엔티티 인터페이스
- **repositories/**: Repository 인터페이스

**규칙**:
- 외부 계층에 대한 의존성 없음
- 순수 TypeScript 인터페이스만 정의

### 5. Data Layer (데이터 계층)

**위치**: `client/src/data/`

**책임**:
- Repository 인터페이스 구현
- API 통신
- 데이터 변환

**구조**:
```
data/
├── sources/
│   ├── api/           # 실제 API 통신
│   │   ├── HttpClient.ts
│   │   └── *ApiSource.ts
│   └── mock/          # Mock 데이터
│       ├── MockStorage.ts
│       └── Mock*Repository.ts
└── repositories/      # Repository 구현체
    └── *Repository.ts
```

---

## 의존성 주입 패턴

### 클라이언트 (React Context)

**RepositoryProvider.tsx**:
```tsx
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo<Repositories>(() => {
    const useMock = import.meta.env.VITE_USE_MOCK === 'true';

    return createRepositories({
      useMock,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
      getToken: () => localStorage.getItem('token'),
      onAuthExpired: () => {
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      },
    });
  }, []);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}
```

**사용 방법**:
```tsx
// 전체 Repository 컨테이너 사용
const { taskRepository, projectRepository } = useRepositories();

// 개별 Repository 사용
const taskRepository = useTaskRepository();
const projectRepository = useProjectRepository();
```

### 서버 (Container 패턴)

**container.ts**:
```typescript
class Container {
  private instances: Map<string, unknown> = new Map();

  initialize(): void {
    const prisma = getPrismaClient();

    // 의존성 순서대로 등록
    const activityLogService = new ActivityLogService(prisma);
    this.instances.set('ActivityLogService', activityLogService);

    const taskService = new TaskService(prisma, activityLogService);
    this.instances.set('TaskService', taskService);

    // ...
  }

  resolve<K extends ServiceName>(name: K): ServiceMap[K] {
    return this.instances.get(name) as ServiceMap[K];
  }
}

export const container = new Container();
```

**사용 방법**:
```typescript
import { getTaskService } from '../di/container.js';

const taskService = getTaskService();
const tasks = await taskService.findAll(params);
```

---

## 코드 예시

### 새로운 기능 추가: "태스크 복제"

#### 1. Repository 인터페이스 확장

```typescript
// domain/repositories/ITaskRepository.ts
export interface ITaskRepository {
  // ... 기존 메서드들

  // 새로 추가
  duplicate(taskId: string): Promise<Task>;
}
```

#### 2. Use Case 작성

```typescript
// domain/usecases/task/DuplicateTaskUseCase.ts
export class DuplicateTaskUseCase implements UseCase<string, Task> {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(taskId: string): Promise<Task> {
    // 원본 태스크 조회
    const original = await this.taskRepository.findById(taskId);

    // 복제 데이터 생성
    const duplicateData: CreateTaskDTO = {
      projectId: original.projectId,
      title: `${original.title} (복사본)`,
      description: original.description,
      priority: original.priority,
      assigneeIds: original.assignees?.map(a => a.id),
    };

    return this.taskRepository.create(duplicateData);
  }
}
```

#### 3. API Source 구현

```typescript
// data/sources/api/TaskApiSource.ts
export class TaskApiSource {
  // ... 기존 메서드들

  async duplicate(taskId: string): Promise<Task> {
    return this.httpClient.post<Task>(`/tasks/${taskId}/duplicate`, {});
  }
}
```

#### 4. Repository 구현체 업데이트

```typescript
// data/repositories/TaskRepository.ts
export class TaskRepository implements ITaskRepository {
  // ... 기존 메서드들

  async duplicate(taskId: string): Promise<Task> {
    return this.apiSource.duplicate(taskId);
  }
}
```

#### 5. 컴포넌트에서 사용

```tsx
function TaskActions({ taskId }: { taskId: string }) {
  const taskRepository = useTaskRepository();
  const duplicateTaskUseCase = useMemo(
    () => new DuplicateTaskUseCase(taskRepository),
    [taskRepository]
  );

  const handleDuplicate = async () => {
    try {
      const duplicatedTask = await duplicateTaskUseCase.execute(taskId);
      toast.success(`"${duplicatedTask.title}" 생성됨`);
    } catch (error) {
      toast.error('복제 실패');
    }
  };

  return <button onClick={handleDuplicate}>복제</button>;
}
```

---

## 테스트 전략

### Unit Test (단위 테스트)

**Use Case 테스트**:
```typescript
describe('CreateTaskUseCase', () => {
  let useCase: CreateTaskUseCase;
  let mockRepository: jest.Mocked<ITaskRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      // ...
    };
    useCase = new CreateTaskUseCase(mockRepository);
  });

  it('should throw ValidationError when title is empty', async () => {
    await expect(useCase.execute({ projectId: '1', title: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should create task with valid input', async () => {
    mockRepository.create.mockResolvedValue({ id: '1', title: 'Test' });

    const result = await useCase.execute({ projectId: '1', title: 'Test' });

    expect(result.title).toBe('Test');
    expect(mockRepository.create).toHaveBeenCalledWith({
      projectId: '1',
      title: 'Test',
    });
  });
});
```

### Integration Test (통합 테스트)

**Repository 테스트**:
```typescript
describe('TaskRepository', () => {
  let repository: TaskRepository;
  let mockApiSource: jest.Mocked<TaskApiSource>;

  beforeEach(() => {
    mockApiSource = createMockApiSource();
    repository = new TaskRepository(mockApiSource);
  });

  it('should map API response to domain model', async () => {
    mockApiSource.list.mockResolvedValue([
      { id: '1', title: 'Test', status: 'TODO' }
    ]);

    const tasks = await repository.findAll();

    expect(tasks[0].status).toBe('TODO');
  });
});
```

---

## 마이그레이션 가이드

### 기존 api.ts에서 Repository로 전환

**Before (기존 코드)**:
```typescript
import { tasksApi } from '@/services/api';

function MyComponent() {
  const loadTasks = async () => {
    const tasks = await tasksApi.list({ projectId });
  };
}
```

**After (새 아키텍처)**:
```typescript
import { useTaskRepository } from '@/di';

function MyComponent() {
  const taskRepository = useTaskRepository();

  const loadTasks = async () => {
    const tasks = await taskRepository.findAll({ projectId });
  };
}
```

### Feature Hook 전환

**Before**:
```typescript
// features/kanban/hooks/useKanban.ts
import { tasksApi, projectsApi } from '@/services/api';

export function useKanban(projectId: string) {
  const fetchData = async () => {
    const [project, tasks] = await Promise.all([
      projectsApi.get(projectId),
      tasksApi.list({ projectId }),
    ]);
  };
}
```

**After**:
```typescript
// features/kanban/hooks/useKanban.ts
import { useTaskRepository, useProjectRepository } from '@/di';

export function useKanban(projectId: string) {
  const taskRepository = useTaskRepository();
  const projectRepository = useProjectRepository();

  const fetchData = async () => {
    const [project, tasks] = await Promise.all([
      projectRepository.findById(projectId),
      taskRepository.findByProjectId(projectId),
    ]);
  };
}
```

---

## FAQ

### Q: 언제 Use Case를 만들어야 하나요?

**A**: 다음 경우에 Use Case를 만드세요:
- 비즈니스 규칙 검증이 필요할 때
- 여러 Repository를 조합해야 할 때
- 복잡한 로직을 캡슐화하고 싶을 때

단순 CRUD는 Repository를 직접 사용해도 됩니다.

### Q: Mock과 실제 API는 어떻게 전환하나요?

**A**: `.env` 파일에서 `VITE_USE_MOCK=true|false`로 설정합니다.
`RepositoryProvider`가 자동으로 적절한 구현체를 주입합니다.

### Q: 서버와 클라이언트의 타입을 공유할 수 있나요?

**A**: 현재는 각각 정의되어 있습니다. 향후 `shared/` 패키지로 분리하여 공유할 수 있습니다.

---

## 참고 자료

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [React Clean Architecture](https://github.com/eduardomoroni/react-clean-architecture)
- [Prisma Documentation](https://www.prisma.io/docs)
