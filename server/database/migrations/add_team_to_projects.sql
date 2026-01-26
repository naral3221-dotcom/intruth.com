-- 프로젝트에 팀 연동 기능 추가
-- 실행일: 배포 전 1회 실행 필요

-- team_id 컬럼 추가 (이미 있으면 무시)
SET @dbname = DATABASE();
SET @tablename = 'wf_projects';
SET @columnname = 'team_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE wf_projects ADD COLUMN team_id INT AFTER owner_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 외래키 추가 (이미 있으면 무시됨)
-- 주의: 외래키 이름이 중복되면 에러 발생할 수 있음
-- ALTER TABLE wf_projects ADD CONSTRAINT fk_projects_team FOREIGN KEY (team_id) REFERENCES wf_teams(id) ON DELETE SET NULL;

SELECT 'Migration completed: team_id column added to wf_projects' AS result;
