# Railway 배포 가이드

## 사전 준비

1. [Railway](https://railway.app) 계정 생성
2. Hobby 플랜 구독 ($5/월)
3. GitHub 연동

---

## 배포 단계

### 1. Railway 프로젝트 생성

1. Railway 대시보드에서 **New Project** 클릭
2. **Deploy from GitHub repo** 선택
3. `INTRUTH.COM` 저장소 선택

### 2. PostgreSQL 추가

1. 프로젝트에서 **New** → **Database** → **Add PostgreSQL**
2. PostgreSQL이 추가되면 자동으로 `DATABASE_URL` 환경변수 생성됨

### 3. 환경 변수 설정

프로젝트 **Variables** 탭에서 다음 환경변수 추가:

#### 필수 환경변수

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `DATABASE_URL` | (자동 생성됨) | PostgreSQL 연결 문자열 |
| `NODE_ENV` | `production` | 프로덕션 환경 |
| `JWT_SECRET` | (강력한 랜덤 문자열) | JWT 서명용 시크릿 |
| `PORT` | `3001` | 서버 포트 (Railway가 자동 설정하기도 함) |

#### 클라이언트 빌드용

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `VITE_USE_MOCK` | `false` | 실제 API 사용 |
| `VITE_API_BASE_URL` | `/api` | API 경로 (기본값 사용) |
| `VITE_LOG_LEVEL` | `error` | 로그 레벨 |

#### OneDrive 연동 (나중에 추가)

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `ONEDRIVE_CLIENT_ID` | (Azure에서 발급) | Azure 앱 클라이언트 ID |
| `ONEDRIVE_CLIENT_SECRET` | (Azure에서 발급) | Azure 앱 시크릿 |
| `ONEDRIVE_REDIRECT_URI` | `https://your-domain.com/api/onedrive/callback` | OAuth 리다이렉트 |
| `ONEDRIVE_FOLDER_PATH` | `/워크플로우/첨부파일` | OneDrive 저장 경로 |

### 4. 빌드 & 시작 명령어 설정

Railway **Settings** 탭에서:

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

또는 `railway.json`을 사용하면 자동 설정됨.

### 5. 데이터베이스 마이그레이션

첫 배포 후, Railway CLI 또는 콘솔에서:

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 마이그레이션 실행
railway run npm run db:migrate
```

또는 Railway 대시보드에서 **Deploy** → **Redeploy with new variables** 후 수동으로 마이그레이션.

### 6. 커스텀 도메인 연결

1. Railway 프로젝트 **Settings** → **Domains**
2. **Add Custom Domain** 클릭
3. 도메인 입력 (예: `intruth.com`)
4. 표시되는 CNAME 레코드를 도메인 DNS에 추가

#### DNS 설정 예시 (Cloudflare)

| Type | Name | Content |
|------|------|---------|
| CNAME | @ | `your-app.up.railway.app` |
| CNAME | www | `your-app.up.railway.app` |

---

## 로컬에서 프로덕션 빌드 테스트

```bash
# 루트에서
npm run build

# 서버 시작 (프로덕션 모드)
cd server
NODE_ENV=production node dist/server.js
```

---

## 트러블슈팅

### 빌드 실패

1. `prisma generate` 오류 → `DATABASE_URL` 환경변수 확인
2. TypeScript 오류 → 로컬에서 `npm run build` 테스트

### 데이터베이스 연결 실패

1. PostgreSQL 서비스가 Running 상태인지 확인
2. `DATABASE_URL` 형식 확인: `postgresql://user:pass@host:port/db`

### 정적 파일 404

1. 클라이언트 빌드가 성공했는지 확인
2. `client/dist` 폴더가 생성되었는지 확인
3. 서버의 `NODE_ENV=production` 확인

---

## 예상 비용

| 항목 | 월 비용 |
|------|---------|
| Railway Hobby 기본 | $5 |
| 서버 사용량 | $2~5 |
| PostgreSQL | $2~5 |
| **총합** | **$10~15** |

---

## 배포 후 체크리스트

- [ ] 사이트 접속 확인
- [ ] 로그인 기능 확인
- [ ] API 호출 확인 (개발자 도구 네트워크 탭)
- [ ] 데이터 CRUD 확인
- [ ] 파일 업로드 확인 (OneDrive 연동 시)
