<?php
/**
 * 루틴 테이블 생성 스크립트
 * 한 번만 실행하면 됨
 */

require_once __DIR__ . '/config.php';

$db = getDB();

try {
    // 루틴 업무 테이블 (user_id가 INT 타입임)
    $db->exec("
        CREATE TABLE IF NOT EXISTS wf_routine_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            repeat_days TEXT NOT NULL,
            repeat_type VARCHAR(20) DEFAULT 'weekly',
            project_id INT DEFAULT NULL,
            priority VARCHAR(20) DEFAULT 'MEDIUM',
            estimated_minutes INT,
            is_active TINYINT(1) DEFAULT 1,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_project (project_id),
            INDEX idx_created_by (created_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "wf_routine_tasks created\n";

    // 루틴 담당자 테이블
    $db->exec("
        CREATE TABLE IF NOT EXISTS wf_routine_assignees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            routine_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_routine_assignee (routine_id, user_id),
            INDEX idx_routine (routine_id),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "wf_routine_assignees created\n";

    // 루틴 완료 기록 테이블
    $db->exec("
        CREATE TABLE IF NOT EXISTS wf_routine_completions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            routine_id INT NOT NULL,
            completed_date DATE NOT NULL,
            completed_by INT NOT NULL,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_completion (routine_id, completed_date, completed_by),
            INDEX idx_routine (routine_id),
            INDEX idx_completed_by (completed_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "wf_routine_completions created\n";

    echo "\nAll routine tables created successfully!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
