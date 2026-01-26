-- 프로젝트-팀-담당자 매핑 테이블
-- 프로젝트에 팀별로 담당자를 할당하는 기능 지원

CREATE TABLE IF NOT EXISTS wf_project_team_assignees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    team_id INT NOT NULL,
    member_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES wf_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES wf_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES wf_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_team_member (project_id, team_id, member_id),
    INDEX idx_project_id (project_id),
    INDEX idx_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
