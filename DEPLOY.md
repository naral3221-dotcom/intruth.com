# Workflow 배포 가이드

## 개요

이 문서는 Workflow 시스템을 `https://balancelab.kr/secrets/workflow`에 배포하는 방법을 설명합니다.

---

## 1. 데이터베이스 설정 (HeidiSQL)

### 1.1 테이블 생성

HeidiSQL에서 `balancelab23` 데이터베이스에 접속한 후, 다음 SQL을 실행하세요:

```sql
-- server/database/schema.sql 파일의 내용을 실행
```

또는 직접 실행:

```sql
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS wf_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    department VARCHAR(100) NULL,
    position VARCHAR(100) NULL,
    avatar_url VARCHAR(500) NULL,
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    must_change_password TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 세션 테이블
CREATE TABLE IF NOT EXISTS wf_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES wf_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 로그인 기록 테이블
CREATE TABLE IF NOT EXISTS wf_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    failure_reason VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.2 초기 관리자 계정 생성

```sql
-- 비밀번호: admin123 (첫 로그인 후 변경 필요)
INSERT INTO wf_users (username, password_hash, name, role, must_change_password)
VALUES ('admin', '$2y$10$YourHashHere', '관리자', 'admin', 1);
```

비밀번호 해시는 PHP에서 생성해야 합니다:
```php
<?php
echo password_hash('admin123', PASSWORD_DEFAULT);
?>
```

---

## 2. PHP API 배포

### 2.1 파일 구조

FTP로 다음 구조로 업로드:

```
/secrets/workflow/
├── index.html          ← React 빌드 결과물
├── assets/             ← JS, CSS 등
└── api/
    ├── config.php      ← DB 설정 (수정 필요!)
    ├── login.php
    ├── logout.php
    ├── me.php
    ├── change-password.php
    └── admin/
        ├── users.php
        └── reset-password.php
```

### 2.2 config.php 수정

`server/api/config.php` 파일에서 데이터베이스 정보를 실제 값으로 변경:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'balancelab23');
define('DB_USER', '실제_DB_사용자명');  // 변경!
define('DB_PASS', '실제_DB_비밀번호');  // 변경!
```

### 2.3 FTP 업로드

`server/api/` 폴더의 모든 파일을 `/secrets/workflow/api/`로 업로드

---

## 3. React 빌드 및 배포

### 3.1 API 연동 활성화

`client/src/services/api.ts` 파일에서:

```typescript
// 목업 모드 비활성화
const USE_MOCK = false;  // true → false

// 실제 인증 API 사용
const USE_REAL_AUTH = true;  // false → true
```

### 3.2 빌드

```bash
cd client
npm install
npm run build
```

### 3.3 배포

빌드 결과물인 `client/dist/` 폴더의 모든 내용을 FTP로 `/secrets/workflow/`에 업로드:

- `index.html`
- `assets/` 폴더

---

## 4. 서버 설정 (필요 시)

### 4.1 .htaccess (Apache)

`/secrets/workflow/.htaccess` 파일 생성:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /secrets/workflow/

    # API 요청은 그대로 전달
    RewriteRule ^api/ - [L]

    # 정적 파일이 아닌 모든 요청을 index.html로 리다이렉트 (SPA)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . index.html [L]
</IfModule>

# PHP 세션 설정
php_value session.cookie_httponly 1
php_value session.cookie_secure 1
php_value session.use_strict_mode 1
```

---

## 5. 접속 테스트

### 5.1 접속 URL

```
https://balancelab.kr/secrets/workflow
```

### 5.2 테스트 계정

```
아이디: admin
비밀번호: admin123
```

첫 로그인 시 비밀번호 변경 화면이 표시됩니다.

---

## 6. 운영 가이드

### 6.1 새 팀원 계정 생성

1. 관리자로 로그인
2. 좌측 메뉴 → "사용자 관리"
3. "새 계정 생성" 버튼 클릭
4. 정보 입력 (아이디, 이름, 부서 등)
5. 생성된 임시 비밀번호를 팀원에게 전달

### 6.2 비밀번호 분실 시

1. 관리자가 "사용자 관리"에서 해당 사용자 찾기
2. "비밀번호 초기화" 버튼 클릭
3. 새 임시 비밀번호를 팀원에게 전달

### 6.3 계정 권한

- **관리자 (admin)**: 모든 기능 + 사용자 관리
- **멤버 (member)**: 일반 업무 기능

---

## 7. 보안 참고사항

- 모든 비밀번호는 bcrypt로 해시 저장
- 로그인 시도 5회 실패 시 15분 잠금
- 세션 유효 시간: 8시간
- HTTPS 환경에서만 운영 권장

---

## 파일 목록

### PHP API 파일
- `server/api/config.php` - 설정
- `server/api/login.php` - 로그인
- `server/api/logout.php` - 로그아웃
- `server/api/me.php` - 현재 사용자 정보
- `server/api/change-password.php` - 비밀번호 변경
- `server/api/admin/users.php` - 사용자 관리
- `server/api/admin/reset-password.php` - 비밀번호 초기화

### 데이터베이스
- `server/database/schema.sql` - 테이블 생성 스크립트
