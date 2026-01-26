-- Workflow 데이터 테이블 스키마
-- 기존 wf_users, wf_sessions, wf_login_logs 테이블에 추가

-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS wf_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED') DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    owner_id INT,
    team_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES wf_users(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES wf_teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 멤버 테이블 (wf_users와 별개로 프로젝트 멤버 정보)
CREATE TABLE IF NOT EXISTS wf_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    department VARCHAR(100),
    position VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES wf_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 프로젝트-멤버 연결 테이블
CREATE TABLE IF NOT EXISTS wf_project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    member_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES wf_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES wf_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_member (project_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 업무(태스크) 테이블
CREATE TABLE IF NOT EXISTS wf_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    parent_id INT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE') DEFAULT 'TODO',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    assignee_id INT,
    reporter_id INT,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP NULL,
    task_order INT DEFAULT 0,
    folder_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES wf_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES wf_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES wf_members(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES wf_members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 다중 담당자 테이블
CREATE TABLE IF NOT EXISTS wf_task_assignees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    member_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES wf_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES wf_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_assignee (task_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 라벨 테이블
CREATE TABLE IF NOT EXISTS wf_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 태스크-라벨 연결 테이블
CREATE TABLE IF NOT EXISTS wf_task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES wf_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES wf_labels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_label (task_id, label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS wf_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    author_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES wf_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES wf_members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 팀 테이블
CREATE TABLE IF NOT EXISTS wf_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    leader_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES wf_members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 팀-멤버 연결 테이블
CREATE TABLE IF NOT EXISTS wf_team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    member_id INT NOT NULL,
    role ENUM('LEADER', 'MEMBER') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES wf_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES wf_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_member (team_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 활동 로그 테이블
CREATE TABLE IF NOT EXISTS wf_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES wf_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 인덱스 추가
CREATE INDEX idx_tasks_project ON wf_tasks(project_id);
CREATE INDEX idx_tasks_status ON wf_tasks(status);
CREATE INDEX idx_tasks_assignee ON wf_tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON wf_tasks(due_date);
CREATE INDEX idx_activity_logs_user ON wf_activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON wf_activity_logs(created_at);

-- 기본 데이터: admin 사용자를 멤버로 추가
INSERT INTO wf_members (user_id, name, email, department, position)
SELECT id, name, email, department, position FROM wf_users WHERE username = 'admin'
ON DUPLICATE KEY UPDATE name = VALUES(name);
