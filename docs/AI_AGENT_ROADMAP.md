# INTRUTH AI Agentic Roadmap

> 작성일: 2026-04-30
> 구현 상태: 회의 녹음 업로드, 서버 저장, OpenAI 전사, 회의자료 초안 생성/검토/적용, 회의 할 일 업무 전환, 읽기 전용 AI Assistant, 범위 선택, 사용량 기록, 승인 기반 생성 Agent, 프로젝트/회의자료/업무/루틴 수정 diff 승인 실행까지 완료.
> 목적: INTRUTH를 교회 리더십 운영 도구에서 회의 기록, 업무 생성, 일정 관리, 브리핑, 아이디어 제안까지 돕는 AI 사역 운영 비서로 확장하기 위한 기획안.

---

## 1. 방향성

INTRUTH의 AI 기능은 "대신 결정하는 AI"보다 "리더들이 놓치지 않도록 정리하고 실행을 준비해주는 AI"에 가까워야 한다.

핵심 사용자는 대부분 모바일로 접속하는 교회 리더들이다. 그래서 AI 기능도 별도 복잡한 화면보다 다음 흐름 안에 자연스럽게 들어가야 한다.

- 회의 중 녹음 또는 회의 후 녹음 업로드
- 전사, 요약, 결정사항, 액션 아이템 자동 생성
- 생성된 업무/일정/회의자료를 사람이 확인 후 등록
- 카카오톡으로 PDF, 링크, 브리핑 공유
- "이번 주 새가족팀 일정 정리해줘" 같은 자연어 요청 처리
- 사역 흐름을 보고 놓친 부분, 준비물, 일정 충돌, 후속 업무 제안

---

## 2. 제품 원칙

### Human-in-the-loop

AI가 업무, 일정, 회의자료를 만들 수는 있지만, 실제 데이터 변경은 기본적으로 승인 후 실행한다.

- 읽기 작업: 바로 수행 가능
- 생성 작업: 미리보기 후 승인
- 수정 작업: 변경 전/후 비교 후 승인
- 삭제/권한/관리자 작업: 관리자 승인 또는 비활성

### Audit-first

AI가 무엇을 읽었고, 어떤 판단을 했고, 어떤 도구를 호출했고, 누가 승인했는지 남겨야 한다.

- `AgentRun`
- `AgentAction`
- `AgentApproval`
- `AiAuditLog`

### Account memory and cache-first context

AI context is managed per logged-in member, not globally. The server stores raw command chat in `AiCommandMessage`, model runs in `AiAssistantRun`, pending or executed proposals in `AiAgentAction`, and a compact per-scope summary in `AiAssistantMemory`.

Prompt construction should keep static instructions and structured-output schemas at the beginning, then append dynamic account memory, current task/meeting/project context, and the user's immediate request near the end. This follows OpenAI prompt caching guidance and makes repeated INTRUTH assistant calls cheaper and faster when prompt prefixes match.

- Use `prompt_cache_key` consistently per workflow, member, and scope.
- Track `cachedTokens` on `AiAssistantRun` and estimate cached-token cost separately when rates are configured.
- Keep account memory compact and factual; never use it as permission to perform write actions without approval.
- Prefer server-side compact memory over resending long chat logs.

### Privacy-first

회의 녹음에는 민감한 사역 내용과 개인 정보가 들어갈 수 있다.

- 녹음 업로드 전 동의 안내
- 회의자료 접근 권한 체크
- 원본 오디오 보관 기간 설정
- AI 처리 로그 접근 권한 제한
- OpenAI API key는 서버에만 보관

### Mobile-first

AI 기능은 모바일에서 가장 먼저 좋아야 한다.

- 하단 FAB 또는 홈 상단 "AI에게 요청"
- 회의 상세 화면의 "녹음으로 회의자료 만들기"
- 생성 결과는 카드형 미리보기
- 승인 버튼은 크고 단순하게

---

## 3. 주요 AI 기능

### A. 회의 녹음 -> 회의자료 생성

가장 먼저 구현할 가치가 큰 기능이다.

흐름:

1. 회의자료 화면에서 "녹음 업로드" 또는 "녹음 시작"
2. 오디오 파일 저장
3. STT 전사 작업 생성
4. 전사 결과를 회의자료 초안으로 변환
5. 초안에는 다음 필드를 자동 채움
   - 제목
   - 일시
   - 참석자 후보
   - 회의 내용
   - 결정사항
   - 액션 아이템
   - 후속 업무 후보
6. 사용자가 초안 확인
7. 회의자료 저장
8. 액션 아이템을 업무로 생성할지 확인
9. PDF 생성 및 카카오 공유

OpenAI 공식 문서 기준으로 Speech to Text API는 `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`를 지원한다. 업로드 파일은 25 MB 제한이 있으므로 긴 회의는 서버에서 압축 또는 청크 분할이 필요하다.

참고:
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/models/gpt-4o-transcribe

### B. AI 사역 운영 비서

사용자가 자연어로 요청하면 AI가 시스템 데이터를 읽고 필요한 작업을 제안한다.

예시:

- "다음 주 회의 안건 초안 만들어줘"
- "이번 달 지연된 업무만 정리해줘"
- "새가족팀 이번 주 해야 할 일 카카오로 공유할 수 있게 만들어줘"
- "오늘 회의에서 나온 액션 아이템을 업무로 만들어줘"
- "프로젝트 완료율 낮은 것부터 이유를 알려줘"

초기에는 읽기/초안 생성 중심으로 시작하고, 이후 승인 기반 쓰기 기능을 연다.

### C. 회의/업무 아이디어 제안

데이터를 보고 제안하는 기능이다.

예시:

- 다음 회의 안건 추천
- 사역별 반복 업무 누락 감지
- 지연 업무의 원인 후보 제안
- 회의 내용 기반 후속 체크리스트 생성
- 새 프로젝트 시작 시 필요한 역할/일정 템플릿 제안

### D. 주간 브리핑 자동 생성

모바일 홈과 카카오 공유에 잘 맞는 기능이다.

출력:

- 이번 주 완료해야 할 업무
- 지연 업무
- 다가오는 회의
- 팀별 주의 사항
- 리더에게 필요한 확인 질문

---

## 4. 에이전트 구조

초기에는 하나의 Assistant Agent로 시작하고, 기능이 커지면 전문 에이전트로 나눈다.

### 1단계: 단일 AI Assistant

책임:

- 사용자의 요청 이해
- 필요한 데이터 조회
- 회의자료 초안 작성
- 업무/일정 생성 제안
- 승인 요청 생성

### 2단계: 전문 에이전트 분리

#### Meeting Scribe Agent

- 녹음 전사
- 회의록 초안
- 결정사항/액션 아이템 추출
- PDF 공유용 요약 생성

#### Operations Agent

- 업무 생성/수정
- 프로젝트 생성/수정
- 회의 일정 생성
- 루틴 업무 제안

#### Briefing Agent

- 주간 브리핑
- 지연 업무 요약
- 팀별 진행 현황 요약
- 카카오 공유 문구 생성

#### Idea Agent

- 안건 제안
- 사역 운영 아이디어
- 준비물/체크리스트 제안
- 프로젝트 템플릿 제안

OpenAI 공식 문서에서는 Responses API가 도구 호출과 상태 관리에 적합하고, Agents SDK는 도구 오케스트레이션, handoff, tracing, human review 같은 복잡한 agentic workflow에 적합하다고 안내한다.

참고:
- https://developers.openai.com/api/docs/guides/migrate-to-responses#responses-benefits
- https://developers.openai.com/api/docs/guides/agents#choose-your-starting-point

---

## 5. 시스템 도구 설계

AI가 직접 데이터베이스를 만지게 하지 않고, 서버의 안전한 도구만 호출하게 한다.

### Read Tools

- `search_tasks`
- `search_projects`
- `search_meetings`
- `get_dashboard_summary`
- `get_member_workload`
- `get_attendance_summary`

### Draft Tools

- `draft_meeting_minutes`
- `draft_tasks_from_transcript`
- `draft_weekly_briefing`
- `draft_project_plan`
- `draft_kakao_message`

### Write Tools

항상 승인 필요.

- `create_tasks`
- `update_task`
- `create_project`
- `update_project`
- `create_meeting`
- `update_meeting`
- `create_routine`
- `update_routine`
- `attach_meeting_pdf`
- `share_kakao_link`

현재 구현된 쓰기 도구는 모두 `AiAgentAction` 승인 대기 카드로 저장되고, 수정 도구는 서버가 DB에서 변경 전 값을 다시 읽어 diff를 계산한 뒤 승인 카드에 표시한다. 승인 이후 실행 단계에서도 동일한 권한 검증과 diff 계산을 다시 수행한다.

### Restricted Tools

초기에는 AI에게 열지 않는다.

- 사용자 삭제
- 권한 변경
- 프로젝트 삭제
- 전체 데이터 내보내기
- 시스템 설정 변경

---

## 6. 서버 아키텍처 초안

현재 서버의 Service 계층 패턴을 유지하면서 AI 모듈을 추가한다.

```
server/src/
├── services/
│   ├── ai/
│   │   ├── AiAgentService.ts
│   │   ├── AiAssistantService.ts
│   │   ├── AiTranscriptionService.ts
│   │   ├── AiMeetingDraftService.ts
│   │   ├── AiBriefingService.ts
│   │   ├── AgentToolRegistry.ts
│   │   ├── AgentApprovalService.ts
│   │   └── AiAuditLogService.ts
│   └── ...
├── routes/
│   └── ai.ts
├── jobs/
│   ├── transcriptionJob.ts
│   └── agentRunJob.ts
└── di/
    └── container.ts
```

### 주요 API

- `POST /api/ai/chat`
- `POST /api/ai/assistant/ask`
- `GET /api/ai/runs/:id`
- `POST /api/ai/runs/:id/approve`
- `POST /api/ai/meetings/:id/recording`
- `POST /api/ai/recordings/:id/transcribe`
- `POST /api/ai/recordings/:id/draft-meeting`
- `POST /api/ai/briefings/weekly`

---

## 7. 데이터 모델 초안

### MeetingRecording

- `id`
- `meetingId`
- `fileName`
- `filePath`
- `mimeType`
- `fileSize`
- `durationSeconds`
- `status`: `UPLOADED | TRANSCRIBING | TRANSCRIBED | FAILED`
- `createdById`
- `createdAt`

### MeetingTranscriptSegment

- `id`
- `recordingId`
- `speaker`
- `startSeconds`
- `endSeconds`
- `text`
- `confidence`

### MeetingDraft

- `id`
- `meetingId`
- `recordingId`
- `title`
- `content`
- `summary`
- `agendaJson`
- `actionItemsJson`
- `status`: `DRAFT | APPROVED | DISCARDED`
- `createdAt`

### AiConversation

- `id`
- `userId`
- `title`
- `scope`: `GLOBAL | MEETING | PROJECT | TASK`
- `scopeId`
- `createdAt`

### AgentRun

- `id`
- `conversationId`
- `userId`
- `status`: `RUNNING | WAITING_APPROVAL | COMPLETED | FAILED`
- `input`
- `finalMessage`
- `createdAt`
- `completedAt`

초기 읽기 전용 Assistant는 별도 경량 모델인 `AiAssistantRun`으로 먼저 기록한다.

- 질문
- 조회 범위
- 응답
- 하이라이트
- 카카오 공유문
- 조회 소스 카운트
- 모델/입력 토큰/출력 토큰/전체 토큰
- 단가 환경 변수가 있을 때 예상 비용
- 성공/실패 상태
- 생성 시각

### AgentAction

- `id`
- `runId`
- `toolName`
- `argsJson`
- `resultJson`
- `requiresApproval`
- `approvedById`
- `status`
- `createdAt`

현재 1차 구현에서는 경량 모델인 `AiAgentAction`으로 먼저 시작했다.

- `assistantRunId`
- `memberId`
- `actionType`: `CREATE_TASKS`
- `status`: `PENDING_APPROVAL | EXECUTED | REJECTED | FAILED`
- `scopeType`, `scopeId`, `scopeLabel`
- `preview`: 승인 전 업무 초안 JSON
- `result`: 실행 후 생성된 Task 요약
- `reviewedById`, `reviewedAt`, `executedAt`

### ChurchGlossary

전사 품질과 요약 품질을 올리기 위한 교회 고유 단어 사전.

- `id`
- `term`
- `description`
- `aliases`
- `category`

예: INTRUTH, 셀, 새가족팀, 찬양팀, 양육, 리더모임.

---

## 8. 프론트엔드 UX 초안

### 모바일 홈

- 상단에 "AI에게 요청" 입력
- 예시 칩
  - "이번 주 브리핑"
  - "지연 업무 정리"
  - "회의 안건 추천"

### 회의 상세

- `녹음 업로드`
- `전사 상태`
- `회의자료 초안 보기`
- `액션 아이템 업무로 만들기`
- `PDF/카카오 공유`

### AI Assistant 패널

- 하단 시트 형태
- 메시지 + 결과 카드
- 변경 작업은 승인 카드로 표시
- "적용", "수정해서 적용", "취소"

### 승인 카드 예시

```
AI가 다음 업무 3개를 만들려고 합니다.

1. 주일 예배 안내팀 배치표 확인
2. 새가족 등록 명단 정리
3. 다음 리더회의 안건 취합

[수정] [적용]
```

---

## 9. 구현 로드맵

### Phase 0. 기반 정리

- OpenAI API 서버 설정
- `OPENAI_API_KEY` 환경 변수 추가
- AI Service 계층 추가
- AgentRun/AgentAction/AuditLog 모델 설계
- AI 기능 권한 정책 정의

목표: AI 호출과 감사 로그가 가능한 기반.

### Phase 1. 회의 녹음 업로드 -> 전사

- 상태: 2026-04-30 1차 완료
- 회의 상세에 녹음 업로드 버튼
- 서버에 오디오 저장
- 25 MB 초과 파일 처리 전략
- `gpt-4o-transcribe` 또는 `gpt-4o-transcribe-diarize` 연동
- 전사 결과 저장

목표: 회의 녹음에서 텍스트 전사까지.

구현된 범위:

- `MeetingRecording`, `MeetingTranscriptSegment` 모델과 Prisma 마이그레이션
- `/api/ai/meetings/:meetingId/recordings` 업로드/목록 API
- `/api/ai/recordings/:recordingId/transcribe` 전사 API
- `AiTranscriptionService` 기반 OpenAI Audio Transcriptions 연동
- 회의 상세 모달의 녹음 업로드, 전사 실행, 전사 결과 미리보기 UI

### Phase 2. 전사 -> 회의자료 초안

- 상태: 2026-05-03 4차 완료
- 전사 텍스트를 회의자료 형식으로 구조화
- 결정사항/액션 아이템 추출
- 초안 미리보기 UI
- 사용자가 승인하면 기존 Meeting 저장

목표: 녹음 하나로 회의자료 생성.

구현된 범위:

- `MeetingMaterialDraft` 모델과 Prisma 마이그레이션
- `/api/ai/meetings/:meetingId/material-drafts` 목록/생성 API
- `/api/ai/material-drafts/:draftId/apply` 초안 적용 API
- `/api/ai/material-drafts/:draftId/discard` 초안 폐기 API
- 회의 상세 모달의 모바일 초안 미리보기, 적용, 폐기 UI
- 승인 후 회의 요약/본문/액션 아이템 반영

### Phase 3. 액션 아이템 -> 업무 생성

- 상태: 2026-05-01 2차 완료
- 회의 초안의 액션 아이템을 Task 후보로 변환
- 담당자/마감일/프로젝트 추론
- 승인 후 Task 생성
- 생성된 업무를 카카오 공유

목표: 회의가 실제 업무로 이어지게 만들기.

구현된 범위:

- `MeetingActionItem.taskId`와 Task 연결 관계
- 선택한 회의 할 일을 Task로 생성하는 서버 API
- 프로젝트가 연결된 회의자료에서 승인 후 업무 생성
- 이미 업무로 전환된 회의 할 일 중복 생성 방지
- 회의 상세 모달의 모바일 선택/전체 선택/업무 생성 UI
- AI `ownerName`을 실제 멤버로 자동 매칭해 담당자 연결
- 생성된 업무 묶음을 카카오톡/Web Share/클립보드 fallback으로 공유
- 생성 전 제목/설명/담당자/마감일/우선순위를 편집하는 업무 후보 카드

남은 범위:

- 운영 중 실제 리더 피드백에 따른 카드 배치 조정

### Phase 4. AI Assistant 읽기 모드

- 상태: 2026-05-01 2차 완료
- "이번 주 지연 업무 알려줘"
- "회의자료에서 결정사항만 찾아줘"
- "팀별 진행상황 요약해줘"
- Read Tool만 사용

목표: 위험 없는 AI 비서 먼저 출시.

구현된 범위:

- 로그인 멤버의 미완료 업무, 다가오는 회의, 참여 프로젝트를 읽는 `AiAssistantService`
- `POST /api/ai/assistant/ask` 자연어 질의 API
- OpenAI Responses API Structured Output과 로컬 fallback 응답
- 모바일 홈의 AI 요청 패널, 빠른 질문 칩, 답변/하이라이트/소스 카운트 UI
- Assistant 브리핑 카카오 공유 문구 생성
- `AiAssistantRun` 기반 질문/응답/실패 내역 저장
- 모바일 홈의 최근 요청 재열람 UI
- 전체/프로젝트/회의 범위 선택과 권한 검증
- OpenAI Responses API 사용량 토큰 저장
- 비용 단가 환경 변수 기반 예상 비용 기록

남은 범위:

- 이전 질문을 문맥으로 이어가는 대화형 흐름
- 팀 단위 범위 선택
- 운영 단가 환경 변수 설정과 비용 대시보드

### Phase 5. 승인 기반 쓰기 모드

- 상태: 2026-05-01 1차 완료
- 업무 생성
- 회의 일정 생성
- 프로젝트 초안 생성
- 루틴 업무 생성
- 모든 write tool은 승인 카드 필요

목표: AI가 시스템을 직접 다루되 사람이 최종 승인.

구현된 범위:

- `AiAgentAction` 모델과 승인 상태/실행 결과 기록
- 프로젝트 또는 프로젝트가 연결된 회의 범위에서 업무 초안 생성
- OpenAI Responses API Structured Output 기반 `CREATE_TASKS` 초안 생성
- OpenAI Responses API Structured Output 기반 `TOOL_PLAN` 생성
- `AgentToolRegistry` 기반 프로젝트/회의자료/업무/팀/루틴 생성 계획 승인 실행
- Tool Plan 업무 생성 시 담당자 이름을 프로젝트 멤버/소유자와 매칭
- `RoutineTask` DB 모델/API와 AI `create_routine` 승인 실행
- API 키가 없을 때 로컬 키워드 Tool Plan fallback
- 모바일 홈 AI 패널의 승인 대기 카드
- 승인 후 실제 `Task` 생성 및 활동 로그 기록
- 거절/실패 상태 기록

남은 범위:

- 기존 데이터 수정용 변경 전/후 diff 승인 카드
- 대화형 문맥 기반 후속 요청

### Phase 6. 브리핑/아이디어 자동화

- 주간 브리핑 자동 생성
- 리더별 맞춤 브리핑
- 회의 안건 추천
- 사역 운영 개선 제안

목표: INTRUTH가 운영 인사이트를 제공하는 도구가 되게 하기.

---

## 10. GitHub/VPS 배포 방향

GitHub 기반 배포가 좋다. AI 기능이 들어가면 환경 변수와 배포 안정성이 중요해지기 때문이다.

권장 흐름:

1. GitHub repository에 main/develop 브랜치 운영
2. GitHub Actions에서 lint, build, Playwright UI audit 실행
3. main merge 시 VPS로 배포
4. VPS는 Docker Compose 기반
5. Nginx reverse proxy + HTTPS
6. PostgreSQL + uploads volume
7. `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, `VITE_PUBLIC_APP_URL`은 GitHub Secrets 또는 VPS `.env`로 관리

초기에는 단일 VPS에 다음 컨테이너를 둔다.

```
intruth-web
intruth-api
intruth-db
intruth-nginx
```

AI 녹음 처리 작업이 길어지면 별도 worker를 추가한다.

```
intruth-worker
```

---

## 11. MVP 우선순위

가장 추천하는 순서:

1. 회의 녹음 업로드: 완료
2. 전사 저장: 완료
3. 회의자료 초안 생성: 완료
4. 액션 아이템 업무 후보 생성: 완료
5. 승인 후 업무 생성: 완료
6. 카카오/PDF 공유: 1차 완료
7. AI Assistant 읽기 모드: 2차 완료
8. 승인 기반 쓰기 모드: 프로젝트/회의자료/업무/팀/루틴 생성 4차 완료
9. 수정 diff/외부 공유 도구: 다음 단계

이 순서가 좋은 이유는 회의자료 기능이 이미 있고, 교회 리더들이 바로 체감할 수 있으며, agentic 기능으로 확장하기 전 안전한 기반을 만들 수 있기 때문이다.

---

## 12. 리스크와 결정 필요 사항

### 녹음 동의

회의 참석자에게 녹음 및 AI 처리 동의 안내가 필요하다.

### 오디오 보관 기간

원본 녹음은 계속 보관할지, 회의자료 생성 후 삭제할지 결정해야 한다.

권장 기본값: 30일 후 자동 삭제.

### 화자 구분

처음부터 정확한 이름 매핑은 어렵다. 1차는 `Speaker 1`, `Speaker 2`로 저장하고, 사용자가 나중에 이름을 매핑하게 한다.

### 비용 관리

긴 회의 녹음은 비용이 생긴다. 회의별 AI 처리 비용 로그를 남겨야 한다.

### 권한

AI가 볼 수 있는 데이터는 현재 로그인 사용자가 볼 수 있는 데이터로 제한해야 한다.

---

## 13. 다음 구현 후보

가장 작은 첫 구현 단위:

1. 서버 OpenAI 클라이언트 설정 ✅
2. `MeetingRecording` 모델 추가 ✅
3. 회의 상세 모달에 녹음 업로드 UI 추가 ✅
4. `/api/ai/meetings/:id/recordings` 업로드 라우트 ✅
5. `/api/ai/recordings/:id/transcribe` 전사 라우트 ✅
6. 전사 결과를 회의 상세에서 확인 ✅
7. 회의자료 초안 생성/승인/폐기 ✅
8. 회의 할 일 선택 후 업무 생성 ✅
9. AI 업무 초안 승인 후 Task 생성 ✅
10. OpenAI 구조화 Tool Plan으로 프로젝트/회의자료/업무/팀 생성 승인 실행 ✅
11. 루틴 업무 DB/API와 AI 루틴 생성 승인 실행 ✅

이후 기존 데이터 수정 diff 승인 카드와 외부 공유 도구를 붙인다.
