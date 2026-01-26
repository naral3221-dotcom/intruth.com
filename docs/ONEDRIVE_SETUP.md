# OneDrive 연동 설정 가이드

이 문서는 워크플로우 시스템에서 OneDrive를 파일 저장소로 사용하기 위한 설정 방법을 안내합니다.

## 1. Azure 앱 등록

### 1.1 Azure Portal 접속
1. [Azure Portal](https://portal.azure.com)에 접속
2. Microsoft 계정으로 로그인

### 1.2 앱 등록
1. 검색창에 **"앱 등록"** 또는 **"App registrations"** 검색
2. **"+ 새 등록"** 클릭

### 1.3 앱 정보 입력
| 항목 | 값 |
|------|-----|
| 이름 | `INTRUTH Workflow` (원하는 이름) |
| 지원되는 계정 유형 | **개인 Microsoft 계정만** (개인 OneDrive 사용 시) |
| | 또는 **모든 조직 디렉터리의 계정 및 개인 Microsoft 계정** |
| 리디렉션 URI | 플랫폼: **웹**, URI: `http://localhost:3001/api/onedrive/callback` |

3. **등록** 클릭

### 1.4 Client ID 확인
- 등록 완료 후 **개요** 페이지에서 **애플리케이션(클라이언트) ID** 복사
- 이 값이 `ONEDRIVE_CLIENT_ID`

### 1.5 Client Secret 생성
1. 왼쪽 메뉴에서 **인증서 및 비밀** 클릭
2. **클라이언트 비밀** 탭에서 **+ 새 클라이언트 비밀** 클릭
3. 설명: `Workflow App Secret`
4. 만료: 원하는 기간 선택 (권장: 24개월)
5. **추가** 클릭
6. **값** 복사 (이 값은 한 번만 표시됨!) → 이 값이 `ONEDRIVE_CLIENT_SECRET`

### 1.6 API 권한 설정
1. 왼쪽 메뉴에서 **API 권한** 클릭
2. **+ 권한 추가** 클릭
3. **Microsoft Graph** 선택
4. **위임된 권한** 선택
5. 다음 권한 추가:
   - `Files.ReadWrite` - 파일 읽기/쓰기
   - `offline_access` - 리프레시 토큰 발급
   - `User.Read` - 사용자 정보 읽기

6. **권한 추가** 클릭

## 2. 환경 변수 설정

`server/.env` 파일에 다음 값 추가:

```env
# OneDrive 설정
ONEDRIVE_CLIENT_ID=your-client-id-here
ONEDRIVE_CLIENT_SECRET=your-client-secret-here
ONEDRIVE_REDIRECT_URI=http://localhost:3001/api/onedrive/callback
ONEDRIVE_FOLDER_PATH=/워크플로우/첨부파일

# 프로덕션 환경에서는 리디렉션 URI를 실제 도메인으로 변경
# ONEDRIVE_REDIRECT_URI=https://your-domain.com/api/onedrive/callback
```

## 3. 패키지 설치

서버 디렉토리에서 필요한 패키지 설치:

```bash
cd server
npm install @azure/msal-node axios
```

## 4. OneDrive 인증 (최초 1회)

서버 시작 후 브라우저에서 아래 URL 접속:

```
http://localhost:3001/api/onedrive/auth
```

1. Microsoft 로그인 페이지로 리디렉션됨
2. 본인 Microsoft 계정으로 로그인
3. 앱 권한 승인
4. 인증 완료 메시지 확인

**중요**: 인증이 완료되면 리프레시 토큰이 서버에 저장되어 이후 자동으로 토큰을 갱신합니다.

## 5. 사용 방법

설정이 완료되면 기존과 동일하게 파일 업로드 기능을 사용할 수 있습니다:
- 회의자료에 첨부파일 업로드 시 자동으로 OneDrive에 저장
- 파일 다운로드 링크는 OneDrive 공유 링크로 제공

## 6. 파일 저장 구조

OneDrive에 다음과 같은 폴더 구조로 저장됩니다:

```
내 OneDrive/
└── 워크플로우/
    └── 첨부파일/
        └── meetings/
            ├── {uuid}-filename1.pdf
            ├── {uuid}-filename2.docx
            └── ...
```

## 7. 문제 해결

### 인증 오류
- Client ID, Secret이 정확한지 확인
- 리디렉션 URI가 Azure Portal 설정과 일치하는지 확인

### 파일 업로드 실패
- OneDrive 저장 용량 확인
- 네트워크 연결 상태 확인
- 토큰 만료 시 `/api/onedrive/auth`로 재인증

### 권한 오류
- Azure Portal에서 API 권한이 올바르게 설정되었는지 확인
- 관리자 동의가 필요한 경우 조직 관리자에게 문의

## 8. 보안 주의사항

- `ONEDRIVE_CLIENT_SECRET`은 절대 외부에 노출하지 마세요
- `.env` 파일은 반드시 `.gitignore`에 포함되어야 합니다
- 프로덕션 환경에서는 HTTPS를 사용하세요
