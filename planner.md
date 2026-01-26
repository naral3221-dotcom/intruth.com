# Workflow Management System - 프로젝트 계획서

## 1. 프로젝트 개요

### 1.1 목적
팀원들(10~20명)의 업무 진행 현황을 실시간으로 파악할 수 있는 워크플로우 관리 시스템

### 1.2 배포 방식
- 기존 홈페이지(balancelab.kr)의 서브 경로(`/workflow`)에 별도 SPA로 배포
- 기존 그누보드 회원 시스템과 JWT 기반 연동

### 1.3 핵심 기능
| 기능 | 설명 |
|------|------|
| 칸반 보드 | 드래그앤드롭으로 업무 상태 변경 (Trello 스타일) |
| 간트 차트 | 프로젝트 일정/타임라인 시각화 |
| 업무 리스트 | 테이블 형태의 업무 목록 관리 |
| 대시보드 | 전체 현황 요약 (통계, 차트, 알림) |

---

## 2. 기술 스택

### 2.1 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.x | UI 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Vite | 5.x | 빌드 도구 |
| Tailwind CSS | 3.x | 스타일링 |
| shadcn/ui | - | UI 컴포넌트 |
| @dnd-kit | 6.x | 드래그앤드롭 (칸반) |
| Frappe Gantt | 0.6.x | 간트 차트 |
| Zustand | 4.x | 상태 관리 |
| React Query | 5.x | 서버 상태 관리 |
| React Router | 6.x | 라우팅 |

### 2.2 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 20.x LTS | 런타임 |
| Express | 4.x | 웹 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Prisma | 5.x | ORM |
| MySQL | 8.x | 데이터베이스 (기존 그누보드 DB 활용) |
| JWT | - | 인증 |
| Socket.io | 4.x | 실시간 업데이트 |

### 2.3 개발 도구
| 도구 | 용도 |
|------|------|
| ESLint + Prettier | 코드 품질 |
| Vitest | 테스트 |
| Docker | 개발/배포 환경 |

---

## 3. 프로젝트 구조

```
workflow/
├── client/                     # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── components/         # 공통 컴포넌트
│   │   │   ├── ui/            # shadcn/ui 컴포넌트
│   │   │   ├── layout/        # 레이아웃 (Header, Sidebar)
│   │   │   └── common/        # 공통 (Button, Modal, etc)
│   │   │
│   │   ├── features/          # 기능별 모듈
│   │   │   ├── auth/          # 인증
│   │   │   ├── dashboard/     # 대시보드
│   │   │   ├── kanban/        # 칸반 보드
│   │   │   ├── gantt/         # 간트 차트
│   │   │   ├── tasks/         # 업무 리스트
│   │   │   ├── projects/      # 프로젝트 관리
│   │   │   └── members/       # 팀원 관리
│   │   │
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── stores/            # Zustand 스토어
│   │   ├── services/          # API 호출
│   │   ├── types/             # TypeScript 타입
│   │   ├── utils/             # 유틸리티 함수
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                     # Node.js 백엔드
│   ├── src/
│   │   ├── routes/            # API 라우트
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── tasks.ts
│   │   │   ├── members.ts
│   │   │   └── dashboard.ts
│   │   │
│   │   ├── controllers/       # 컨트롤러
│   │   ├── services/          # 비즈니스 로직
│   │   ├── middleware/        # 미들웨어
│   │   │   ├── auth.ts        # JWT 검증
│   │   │   ├── error.ts       # 에러 핸들링
│   │   │   └── validate.ts    # 입력 검증
│   │   │
│   │   ├── utils/             # 유틸리티
│   │   ├── types/             # 타입 정의
│   │   ├── app.ts             # Express 앱
│   │   └── server.ts          # 서버 진입점
│   │
│   ├── prisma/
│   │   ├── schema.prisma      # DB 스키마
│   │   └── seed.ts            # 초기 데이터
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                     # 공유 코드
│   ├── types/                 # 공유 타입
│   └── constants/             # 공유 상수
│
├── docker-compose.yml
└── README.md
```

---

## 4. 데이터베이스 스키마

### 4.1 ERD 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Member    │────<│  Project    │────<│    Task     │
└─────────────┘     │   Member    │     └─────────────┘
                    └─────────────┘           │
                          │                   │
                    ┌─────────────┐     ┌─────────────┐
                    │   Project   │     │   Comment   │
                    └─────────────┘     └─────────────┘
```

### 4.2 테이블 정의

#### Members (팀원)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| gnuboard_id | VARCHAR | 그누보드 회원 ID (연동용) |
| email | VARCHAR | 이메일 |
| name | VARCHAR | 이름 |
| avatar_url | VARCHAR | 프로필 이미지 |
| role_id | UUID | FK (Roles) 커스텀 권한 |
| department | VARCHAR | 부서 |
| position | VARCHAR | 직책 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### Projects (프로젝트)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR | 프로젝트명 |
| description | TEXT | 설명 |
| status | ENUM | active, completed, archived |
| start_date | DATE | 시작일 |
| end_date | DATE | 종료일 |
| owner_id | UUID | FK (Members) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### Project_Members (프로젝트-팀원 연결)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| project_id | UUID | FK (Projects) |
| member_id | UUID | FK (Members) |
| role | ENUM | owner, editor, viewer |
| joined_at | TIMESTAMP | 참여일 |

#### Tasks (업무)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| project_id | UUID | FK (Projects) |
| title | VARCHAR | 업무 제목 |
| description | TEXT | 상세 설명 |
| status | ENUM | todo, in_progress, review, done |
| priority | ENUM | low, medium, high, urgent |
| assignee_id | UUID | FK (Members) 담당자 |
| reporter_id | UUID | FK (Members) 보고자 |
| start_date | DATE | 시작일 |
| due_date | DATE | 마감일 |
| estimated_hours | DECIMAL | 예상 소요시간 |
| actual_hours | DECIMAL | 실제 소요시간 |
| order | INT | 정렬 순서 (칸반용) |
| parent_id | UUID | FK (Tasks) 상위 업무 |
| folder_url | VARCHAR | 관련 폴더/드라이브 링크 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### Roles (커스텀 권한)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR | 권한명 (예: 마케팅팀 리더) |
| description | VARCHAR | 권한 설명 |
| permissions | JSON | 권한 목록 (아래 참조) |
| is_system | BOOLEAN | 시스템 기본 권한 여부 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

**permissions JSON 구조:**
```json
{
  "project": {
    "create": true,
    "edit": true,
    "delete": false,
    "manage_members": true
  },
  "task": {
    "create": true,
    "edit": true,
    "delete": true,
    "assign": true
  },
  "member": {
    "view_all": true,
    "view_workload": true,
    "manage": false
  },
  "system": {
    "manage_roles": false,
    "view_all_stats": true,
    "manage_settings": false
  }
}
```

#### Task_Labels (업무 라벨)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR | 라벨명 |
| color | VARCHAR | 색상 코드 |
| project_id | UUID | FK (Projects) |

#### Task_Label_Relations (업무-라벨 연결)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| task_id | UUID | FK (Tasks) |
| label_id | UUID | FK (Task_Labels) |

#### Comments (댓글)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| task_id | UUID | FK (Tasks) |
| author_id | UUID | FK (Members) |
| content | TEXT | 댓글 내용 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### Activity_Logs (활동 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| task_id | UUID | FK (Tasks) |
| member_id | UUID | FK (Members) |
| action | VARCHAR | 행동 (created, updated, moved, etc) |
| details | JSONB | 상세 정보 |
| created_at | TIMESTAMP | 생성일 |

---

## 5. API 설계

### 5.1 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/auth/login | 로그인 (그누보드 연동) |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/me | 현재 사용자 정보 |
| POST | /api/auth/refresh | 토큰 갱신 |

### 5.2 프로젝트 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/projects | 프로젝트 목록 |
| POST | /api/projects | 프로젝트 생성 |
| GET | /api/projects/:id | 프로젝트 상세 |
| PUT | /api/projects/:id | 프로젝트 수정 |
| DELETE | /api/projects/:id | 프로젝트 삭제 |
| GET | /api/projects/:id/members | 프로젝트 멤버 목록 |
| POST | /api/projects/:id/members | 멤버 추가 |
| DELETE | /api/projects/:id/members/:memberId | 멤버 제거 |

### 5.3 업무(Task) API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/tasks | 업무 목록 (필터링/정렬) |
| POST | /api/tasks | 업무 생성 |
| GET | /api/tasks/:id | 업무 상세 |
| PUT | /api/tasks/:id | 업무 수정 |
| DELETE | /api/tasks/:id | 업무 삭제 |
| PATCH | /api/tasks/:id/status | 상태 변경 (칸반 이동) |
| PATCH | /api/tasks/:id/order | 순서 변경 |
| GET | /api/tasks/:id/comments | 댓글 목록 |
| POST | /api/tasks/:id/comments | 댓글 작성 |

### 5.4 대시보드 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/dashboard/summary | 전체 요약 통계 |
| GET | /api/dashboard/my-tasks | 내 업무 현황 |
| GET | /api/dashboard/team-progress | 팀 진행 현황 |
| GET | /api/dashboard/recent-activities | 최근 활동 |

### 5.5 멤버 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/members | 팀원 목록 |
| GET | /api/members/:id | 팀원 상세 |
| GET | /api/members/:id/tasks | 팀원별 업무 |
| GET | /api/members/:id/workload | 팀원 업무량 |

---

## 6. 화면 설계

### 6.1 페이지 구성

```
/workflow
├── /                      # 대시보드 (메인)
├── /login                 # 로그인
├── /projects              # 프로젝트 목록
├── /projects/:id          # 프로젝트 상세
│   ├── /board            # 칸반 보드
│   ├── /timeline         # 간트 차트
│   ├── /list             # 업무 리스트
│   └── /settings         # 프로젝트 설정
├── /tasks/:id             # 업무 상세 (모달 또는 페이지)
├── /members               # 팀원 관리
└── /settings              # 시스템 설정
```

### 6.2 주요 화면 와이어프레임

#### 대시보드
```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Workflow    [검색]           [알림] [프로필]  │
├─────────┬───────────────────────────────────────────────┤
│         │  대시보드                                      │
│ 대시보드 │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐│
│ 프로젝트 │ │ 전체업무 │ │ 진행중  │ │ 완료    │ │ 지연  ││
│ 팀원    │ │   45    │ │   12   │ │   28   │ │   5  ││
│ 설정    │ └─────────┘ └─────────┘ └─────────┘ └───────┘│
│         │                                               │
│         │ ┌─────────────────┐ ┌─────────────────────┐  │
│         │ │  내 업무 현황    │ │   팀 진행률 차트    │  │
│         │ │                 │ │                     │  │
│         │ │  □ 업무 1       │ │      ████████       │  │
│         │ │  □ 업무 2       │ │                     │  │
│         │ │  □ 업무 3       │ │                     │  │
│         │ └─────────────────┘ └─────────────────────┘  │
│         │                                               │
│         │ ┌─────────────────────────────────────────┐  │
│         │ │            최근 활동                     │  │
│         │ │  홍길동님이 "API 개발" 완료 - 5분 전    │  │
│         │ │  김철수님이 "디자인 검토" 시작 - 1시간 전│  │
│         │ └─────────────────────────────────────────┘  │
└─────────┴───────────────────────────────────────────────┘
```

#### 칸반 보드
```
┌─────────────────────────────────────────────────────────┐
│  프로젝트 A > 칸반 보드      [보드] [타임라인] [리스트] │
├─────────────────────────────────────────────────────────┤
│  [+ 업무 추가]  [필터]  [정렬]                          │
├─────────────┬─────────────┬─────────────┬──────────────┤
│   할 일 (5) │  진행중 (3) │  검토 (2)   │  완료 (10)   │
├─────────────┼─────────────┼─────────────┼──────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐  │
│ │ Task 1  │ │ │ Task 6  │ │ │ Task 9  │ │ │ Task 11 │  │
│ │ 홍길동  │ │ │ 김철수  │ │ │ 이영희  │ │ │ 박민수  │  │
│ │ 🔴 높음 │ │ │ 🟡 중간 │ │ │ 🟢 낮음 │ │ │ ✓ 완료  │  │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘  │
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │              │
│ │ Task 2  │ │ │ Task 7  │ │ │ Task 10 │ │              │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │              │
│             │             │             │              │
│  + 추가     │  + 추가     │  + 추가     │              │
└─────────────┴─────────────┴─────────────┴──────────────┘
```

#### 간트 차트
```
┌─────────────────────────────────────────────────────────┐
│  프로젝트 A > 타임라인        [보드] [타임라인] [리스트]│
├─────────────────────────────────────────────────────────┤
│  [오늘]  [< 주] [월 >]  2024년 1월                      │
├──────────────┬──────────────────────────────────────────┤
│ 업무명       │ 1월                                      │
│              │ 1  2  3  4  5  6  7  8  9  10 11 12 ... │
├──────────────┼──────────────────────────────────────────┤
│ 기획         │ ████████████                             │
│ 디자인       │       ████████████████                   │
│ 프론트개발   │             ████████████████████         │
│ 백엔드개발   │             ████████████████████████     │
│ 테스트       │                         ████████████     │
│ 배포         │                               ████       │
└──────────────┴──────────────────────────────────────────┘
```

---

## 7. 그누보드 연동 방안

### 7.1 회원 인증 연동

```
[사용자] → [워크플로우 로그인] → [백엔드 API]
                                      ↓
                              [그누보드 DB 조회]
                              (g5_member 테이블)
                                      ↓
                              [JWT 토큰 발급]
                                      ↓
                              [워크플로우 사용]
```

### 7.2 연동 방식
1. **DB 직접 연결**: 그누보드의 MySQL DB에 읽기 전용 접근
2. **회원 ID 매핑**: gnuboard_id 필드로 기존 회원과 연결
3. **비밀번호 검증**: 그누보드의 암호화 방식(SHA256 + salt) 사용

### 7.3 주의사항
- 워크플로우 전용 데이터는 동일 MySQL 서버에 별도 DB(workflow_db) 생성
- 회원 정보만 그누보드에서 조회
- 세션 공유는 하지 않음 (독립적인 JWT 인증)

---

## 8. 개발 단계

### Phase 1: 기초 세팅
- [ ] 프로젝트 초기화 (Vite + React + TypeScript)
- [ ] 백엔드 초기화 (Express + TypeScript)
- [ ] DB 설정 및 Prisma 스키마 작성
- [ ] 기본 레이아웃 및 라우팅
- [ ] 인증 시스템 (그누보드 연동)

### Phase 2: 핵심 기능
- [ ] 프로젝트 CRUD
- [ ] 업무 CRUD
- [ ] 칸반 보드 (드래그앤드롭)
- [ ] 업무 리스트 뷰

### Phase 3: 고급 기능
- [ ] 간트 차트
- [ ] 대시보드 통계
- [ ] 실시간 업데이트 (Socket.io)
- [ ] 댓글 및 활동 로그

### Phase 4: 완성
- [ ] UI/UX 개선
- [ ] 반응형 디자인
- [ ] 테스트 작성
- [ ] 배포 설정

---

## 9. 배포 계획

### 9.1 서버 구성
```
[Nginx]
   ├── /                  → 기존 그누보드 (PHP)
   └── /workflow          → React SPA (정적 파일)
       └── /workflow/api  → Node.js 백엔드 (프록시)
```

### 9.2 배포 방식
- **프론트엔드**: Vite 빌드 후 `/workflow` 경로에 정적 파일 배포
- **백엔드**: PM2로 Node.js 서버 실행
- **DB**: 기존 MySQL 서버에 workflow_db 데이터베이스 생성

---

## 10. 검토 필요 사항

### 10.1 확인 필요
- [ ] 그누보드 DB 접근 권한 및 연결 정보
- [ ] 서버 Node.js 설치 가능 여부
- [ ] PostgreSQL 설치 가능 여부 (또는 MySQL 사용?)
- [ ] 도메인/서브도메인 설정 방식

### 10.2 결정 완료
- [x] DB: MySQL 사용 (기존 그누보드 DB 서버 활용, 워크플로우 전용 DB 생성)
- [x] 권한 체계: 커스텀 권한 시스템 (Roles 테이블로 유연하게 관리)
- [x] 알림 기능: 불필요
- [x] 파일 첨부: 불필요 (대신 folder_url 필드로 폴더 링크 저장)
- [ ] 모바일 앱 필요 여부 (추후 확장)

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2024-01-12 | 0.1 | 초안 작성 |
| 2024-01-12 | 0.2 | DB를 MySQL로 변경, 커스텀 권한 시스템 추가, folder_url 필드 추가 |
