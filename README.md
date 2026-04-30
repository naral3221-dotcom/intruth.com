# INTRUTH Workflow Management System

팀원들의 업무 진행 현황을 관리하는 워크플로우 시스템입니다.

## 주요 기능

- **대시보드**: 전체 업무 현황, 팀 진행률, 최근 활동 확인
- **칸반 보드**: 드래그앤드롭으로 업무 상태 변경
- **업무 리스트**: 테이블 형태로 업무 관리
- **간트 차트**: 타임라인으로 일정 시각화
- **커스텀 권한**: 유연한 권한 관리 시스템

## 기술 스택

### 프론트엔드
- React 18 + TypeScript
- Vite
- Tailwind CSS
- @dnd-kit (드래그앤드롭)
- Zustand (상태 관리)
- React Router

### 백엔드
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT 인증

## 설치 및 실행

### 1. 의존성 설치

```bash
# 프론트엔드
cd client
npm install

# 백엔드
cd ../server
npm install
```

### 2. 로컬 개발 데이터베이스 설정

로컬 개발에서는 설치형 PostgreSQL이나 Docker 없이도 루트 스크립트로 임베디드 PostgreSQL을 실행할 수 있습니다.

```bash
# 터미널 1: 개발용 PostgreSQL 실행
npm run dev:db
```

`server/.env`의 `DATABASE_URL`은 다음 형식으로 맞춥니다.

```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/intruth_dev?schema=public"
PORT=3002
OPENAI_API_KEY="your-openai-api-key"
OPENAI_TRANSCRIBE_MODEL="gpt-4o-transcribe"
OPENAI_MEETING_MODEL="gpt-4o-mini"
```

DB가 켜진 상태에서 스키마와 샘플 데이터를 적용합니다.

```bash
# 터미널 2
npm run db:migrate
# 샘플 데이터 추가
npm run db:seed
```

### 3. 실행

```bash
# 실제 서버 API + 프론트 서버 모드 실행
npm run dev:full
```

Mock 모드 UI만 확인할 때는 기존처럼 클라이언트만 실행할 수 있습니다.

```bash
cd client
npm run dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3002

## 테스트 계정

| 이메일 | 비밀번호 | 권한 |
|--------|----------|------|
| admin@example.com | password123 | Admin |
| hong@example.com | password123 | Member |
| kim@example.com | password123 | Member |
| lee@example.com | password123 | Manager |

## 프로젝트 구조

```
workflow/
├── client/              # React 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── features/    # 기능별 모듈
│   │   ├── stores/      # 상태 관리
│   │   ├── services/    # API 호출
│   │   └── types/       # TypeScript 타입
│   └── ...
│
├── server/              # Node.js 백엔드
│   ├── src/
│   │   ├── routes/      # API 라우트
│   │   ├── middleware/  # 미들웨어
│   │   └── types/       # 타입 정의
│   ├── prisma/          # DB 스키마
│   └── ...
│
└── planner.md           # 프로젝트 계획서
```
