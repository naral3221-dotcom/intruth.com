-- 루틴 업무 테이블
CREATE TABLE IF NOT EXISTS wf_routine_tasks (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- 반복 설정 (JSON 배열로 요일 저장: [1,3,5] = 월,수,금)
    repeat_days JSON NOT NULL,
    repeat_type ENUM('daily', 'weekly', 'custom') DEFAULT 'weekly',

    -- 소속
    project_id VARCHAR(36),  -- NULL이면 개인 루틴

    -- 기타
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    estimated_minutes INT,

    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES wf_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES wf_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 루틴 담당자 테이블 (다중 담당자 지원)
CREATE TABLE IF NOT EXISTS wf_routine_assignees (
    id VARCHAR(36) PRIMARY KEY,
    routine_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_routine_assignee (routine_id, user_id),
    FOREIGN KEY (routine_id) REFERENCES wf_routine_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES wf_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 루틴 완료 기록 테이블 (매일 체크 이력)
CREATE TABLE IF NOT EXISTS wf_routine_completions (
    id VARCHAR(36) PRIMARY KEY,
    routine_id VARCHAR(36) NOT NULL,
    completed_date DATE NOT NULL,  -- 완료한 날짜 (YYYY-MM-DD)
    completed_by VARCHAR(36) NOT NULL,  -- 완료 체크한 사람
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 같은 루틴을 같은 날짜에 같은 사람이 중복 완료 불가
    UNIQUE KEY unique_completion (routine_id, completed_date, completed_by),
    FOREIGN KEY (routine_id) REFERENCES wf_routine_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES wf_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인덱스
CREATE INDEX idx_routine_project ON wf_routine_tasks(project_id);
CREATE INDEX idx_routine_created_by ON wf_routine_tasks(created_by);
CREATE INDEX idx_routine_active ON wf_routine_tasks(is_active);
CREATE INDEX idx_completion_date ON wf_routine_completions(completed_date);
CREATE INDEX idx_completion_routine ON wf_routine_completions(routine_id);
