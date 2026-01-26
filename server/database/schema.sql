-- =============================================
-- Workflow 인증 시스템 데이터베이스 스키마
-- balancelab23 데이터베이스에서 실행
-- =============================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS wf_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '로그인 ID (이름)',
    password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시 (password_hash 함수 사용)',
    name VARCHAR(100) NOT NULL COMMENT '표시 이름',
    email VARCHAR(255) NULL COMMENT '이메일 (선택)',
    department VARCHAR(100) NULL COMMENT '부서',
    position VARCHAR(100) NULL COMMENT '직책',
    avatar_url VARCHAR(500) NULL COMMENT '프로필 이미지 URL',
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member' COMMENT '권한',
    must_change_password TINYINT(1) NOT NULL DEFAULT 1 COMMENT '비밀번호 변경 필요 여부',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '계정 활성화 상태',
    last_login_at DATETIME NULL COMMENT '마지막 로그인 시간',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 세션 테이블 (토큰 기반 인증)
CREATE TABLE IF NOT EXISTS wf_sessions (
    id VARCHAR(64) PRIMARY KEY COMMENT '세션 토큰',
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NULL COMMENT '접속 IP',
    user_agent TEXT NULL COMMENT '브라우저 정보',
    expires_at DATETIME NOT NULL COMMENT '만료 시간',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES wf_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 로그인 기록 테이블 (보안 감사용)
CREATE TABLE IF NOT EXISTS wf_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT '로그인 시도한 사용자 (실패 시 NULL)',
    username VARCHAR(50) NOT NULL COMMENT '입력한 사용자명',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    failure_reason VARCHAR(100) NULL COMMENT '실패 사유',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 초기 관리자 계정 생성
-- 비밀번호: admin123 (반드시 변경하세요!)
-- =============================================
INSERT INTO wf_users (username, password_hash, name, role, must_change_password)
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '관리자', 'admin', 1);
-- 참고: 위 해시는 'password'의 bcrypt 해시입니다.
-- 실제 운영 시 PHP password_hash('admin123', PASSWORD_DEFAULT)로 생성한 해시를 사용하세요.
