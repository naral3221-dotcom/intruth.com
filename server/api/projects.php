<?php
/**
 * 프로젝트 API
 *
 * GET    /api/projects.php         - 프로젝트 목록
 * GET    /api/projects.php?id=1    - 프로젝트 상세
 * POST   /api/projects.php         - 프로젝트 생성
 * PUT    /api/projects.php?id=1    - 프로젝트 수정
 * DELETE /api/projects.php?id=1    - 프로젝트 삭제
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getProject($db, $_GET['id']);
        } else {
            getProjects($db);
        }
        break;
    case 'POST':
        createProject($db, $user);
        break;
    case 'PUT':
        updateProject($db, $_GET['id']);
        break;
    case 'DELETE':
        deleteProject($db, $_GET['id']);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function getProjects($db) {
    $stmt = $db->query('
        SELECT p.*,
               u.name as owner_name,
               u.avatar_url as owner_avatar,
               t.name as team_name,
               t.color as team_color,
               (SELECT COUNT(*) FROM wf_tasks WHERE project_id = p.id) as task_count
        FROM wf_projects p
        LEFT JOIN wf_users u ON p.owner_id = u.id
        LEFT JOIN wf_teams t ON p.team_id = t.id
        ORDER BY p.created_at DESC
    ');
    $projects = $stmt->fetchAll();

    $result = array();
    foreach ($projects as $p) {
        $projectData = formatProject($p);
        // 프로젝트별 teamAssignments 조회
        $projectData['teamAssignments'] = getProjectTeamAssignments($db, $p['id']);
        $result[] = $projectData;
    }

    jsonResponse($result);
}

function getProject($db, $id) {
    $stmt = $db->prepare('
        SELECT p.*,
               u.name as owner_name,
               u.avatar_url as owner_avatar,
               t.name as team_name,
               t.color as team_color,
               (SELECT COUNT(*) FROM wf_tasks WHERE project_id = p.id) as task_count
        FROM wf_projects p
        LEFT JOIN wf_users u ON p.owner_id = u.id
        LEFT JOIN wf_teams t ON p.team_id = t.id
        WHERE p.id = ?
    ');
    $stmt->execute(array($id));
    $project = $stmt->fetch();

    if (!$project) {
        errorResponse('프로젝트를 찾을 수 없습니다.', 404);
    }

    // 프로젝트 멤버 조회
    $stmt = $db->prepare('
        SELECT m.*, pm.role
        FROM wf_members m
        JOIN wf_project_members pm ON m.id = pm.member_id
        WHERE pm.project_id = ?
    ');
    $stmt->execute(array($id));
    $members = $stmt->fetchAll();

    $result = formatProject($project);
    $result['members'] = array();
    foreach ($members as $m) {
        $result['members'][] = array(
            'id' => (string)$m['id'],
            'name' => $m['name'],
            'email' => $m['email'],
            'department' => $m['department'],
            'position' => $m['position'],
            'avatarUrl' => $m['avatar_url'],
            'role' => $m['role']
        );
    }

    // teamAssignments 조회
    $result['teamAssignments'] = getProjectTeamAssignments($db, $id);

    jsonResponse($result);
}

function createProject($db, $user) {
    $input = getJsonInput();

    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : null;
    $startDate = isset($input['startDate']) && $input['startDate'] ? $input['startDate'] : null;
    $endDate = isset($input['endDate']) && $input['endDate'] ? $input['endDate'] : null;
    $teamId = isset($input['teamId']) && $input['teamId'] ? $input['teamId'] : null;
    $teamAssignments = isset($input['teamAssignments']) ? $input['teamAssignments'] : array();

    if (empty($name)) {
        errorResponse('프로젝트 이름은 필수입니다.');
    }

    $stmt = $db->prepare('
        INSERT INTO wf_projects (name, description, start_date, end_date, owner_id, team_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute(array($name, $description, $startDate, $endDate, $user['id'], $teamId));

    $projectId = $db->lastInsertId();

    // teamAssignments 저장
    if (!empty($teamAssignments)) {
        saveProjectTeamAssignments($db, $projectId, $teamAssignments);
    }

    // 생성된 프로젝트 조회
    $stmt = $db->prepare('
        SELECT p.*,
               u.name as owner_name,
               u.avatar_url as owner_avatar,
               t.name as team_name,
               t.color as team_color,
               0 as task_count
        FROM wf_projects p
        LEFT JOIN wf_users u ON p.owner_id = u.id
        LEFT JOIN wf_teams t ON p.team_id = t.id
        WHERE p.id = ?
    ');
    $stmt->execute(array($projectId));
    $project = $stmt->fetch();

    $result = formatProject($project);
    $result['teamAssignments'] = getProjectTeamAssignments($db, $projectId);

    jsonResponse($result, 201);
}

function updateProject($db, $id) {
    if (!$id) {
        errorResponse('프로젝트 ID가 필요합니다.');
    }

    $input = getJsonInput();

    // 프로젝트 존재 확인
    $stmt = $db->prepare('SELECT id FROM wf_projects WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('프로젝트를 찾을 수 없습니다.', 404);
    }

    $updates = array();
    $params = array();

    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = 'name = ?';
        $params[] = trim($input['name']);
    }

    if (array_key_exists('description', $input)) {
        $updates[] = 'description = ?';
        $params[] = $input['description'];
    }

    if (array_key_exists('status', $input)) {
        $updates[] = 'status = ?';
        $params[] = $input['status'];
    }

    if (array_key_exists('startDate', $input)) {
        $updates[] = 'start_date = ?';
        $params[] = $input['startDate'] ? $input['startDate'] : null;
    }

    if (array_key_exists('endDate', $input)) {
        $updates[] = 'end_date = ?';
        $params[] = $input['endDate'] ? $input['endDate'] : null;
    }

    if (array_key_exists('teamId', $input)) {
        $updates[] = 'team_id = ?';
        $params[] = $input['teamId'] ? $input['teamId'] : null;
    }

    // 업데이트할 필드가 있으면 실행
    if (!empty($updates)) {
        $params[] = $id;
        $sql = 'UPDATE wf_projects SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }

    // teamAssignments 업데이트 (배열이 전달되면 기존 데이터 삭제 후 새로 저장)
    if (array_key_exists('teamAssignments', $input)) {
        $teamAssignments = $input['teamAssignments'];
        if (is_array($teamAssignments)) {
            // 기존 teamAssignments 삭제
            $stmt = $db->prepare('DELETE FROM wf_project_team_assignees WHERE project_id = ?');
            $stmt->execute(array($id));

            // 새 teamAssignments 저장
            if (!empty($teamAssignments)) {
                saveProjectTeamAssignments($db, $id, $teamAssignments);
            }
        }
    }

    // 업데이트된 프로젝트 조회
    $stmt = $db->prepare('
        SELECT p.*,
               u.name as owner_name,
               u.avatar_url as owner_avatar,
               t.name as team_name,
               t.color as team_color,
               (SELECT COUNT(*) FROM wf_tasks WHERE project_id = p.id) as task_count
        FROM wf_projects p
        LEFT JOIN wf_users u ON p.owner_id = u.id
        LEFT JOIN wf_teams t ON p.team_id = t.id
        WHERE p.id = ?
    ');
    $stmt->execute(array($id));
    $project = $stmt->fetch();

    $result = formatProject($project);
    $result['teamAssignments'] = getProjectTeamAssignments($db, $id);

    jsonResponse($result);
}

function deleteProject($db, $id) {
    if (!$id) {
        errorResponse('프로젝트 ID가 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_projects WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('프로젝트를 찾을 수 없습니다.', 404);
    }

    // teamAssignments도 CASCADE로 자동 삭제됨
    $stmt = $db->prepare('DELETE FROM wf_projects WHERE id = ?');
    $stmt->execute(array($id));

    jsonResponse(array('success' => true, 'message' => '프로젝트가 삭제되었습니다.'));
}

/**
 * 프로젝트의 teamAssignments 저장
 */
function saveProjectTeamAssignments($db, $projectId, $teamAssignments) {
    $stmt = $db->prepare('
        INSERT INTO wf_project_team_assignees (project_id, team_id, member_id)
        VALUES (?, ?, ?)
    ');

    foreach ($teamAssignments as $ta) {
        $teamId = isset($ta['teamId']) ? $ta['teamId'] : null;
        $assigneeIds = isset($ta['assigneeIds']) ? $ta['assigneeIds'] : array();

        if ($teamId && !empty($assigneeIds)) {
            foreach ($assigneeIds as $memberId) {
                try {
                    $stmt->execute(array($projectId, $teamId, $memberId));
                } catch (PDOException $e) {
                    // 중복 키 에러 무시 (이미 존재하는 경우)
                    if ($e->getCode() != 23000) {
                        throw $e;
                    }
                }
            }
        }
    }
}

/**
 * 프로젝트의 teamAssignments 조회
 */
function getProjectTeamAssignments($db, $projectId) {
    $stmt = $db->prepare('
        SELECT
            pta.team_id,
            t.name as team_name,
            t.color as team_color,
            pta.member_id,
            u.name as member_name,
            u.email as member_email,
            u.department as member_department,
            u.position as member_position,
            u.avatar_url as member_avatar
        FROM wf_project_team_assignees pta
        JOIN wf_teams t ON pta.team_id = t.id
        JOIN wf_users u ON pta.member_id = u.id
        WHERE pta.project_id = ?
        ORDER BY t.name, u.name
    ');
    $stmt->execute(array($projectId));
    $rows = $stmt->fetchAll();

    // teamId별로 그룹화
    $teamMap = array();
    foreach ($rows as $row) {
        $teamId = (string)$row['team_id'];
        if (!isset($teamMap[$teamId])) {
            $teamMap[$teamId] = array(
                'teamId' => $teamId,
                'team' => array(
                    'id' => $teamId,
                    'name' => $row['team_name'],
                    'color' => $row['team_color']
                ),
                'assigneeIds' => array(),
                'assignees' => array()
            );
        }
        $memberId = (string)$row['member_id'];
        $teamMap[$teamId]['assigneeIds'][] = $memberId;
        $teamMap[$teamId]['assignees'][] = array(
            'id' => $memberId,
            'name' => $row['member_name'],
            'email' => $row['member_email'],
            'department' => $row['member_department'],
            'position' => $row['member_position'],
            'avatarUrl' => $row['member_avatar']
        );
    }

    return array_values($teamMap);
}

function formatProject($p) {
    return array(
        'id' => (string)$p['id'],
        'name' => $p['name'],
        'description' => $p['description'],
        'status' => $p['status'],
        'startDate' => $p['start_date'],
        'endDate' => $p['end_date'],
        'owner' => $p['owner_id'] ? array(
            'id' => (string)$p['owner_id'],
            'name' => $p['owner_name'],
            'avatarUrl' => $p['owner_avatar']
        ) : null,
        'teamId' => $p['team_id'] ? (string)$p['team_id'] : null,
        'team' => $p['team_id'] ? array(
            'id' => (string)$p['team_id'],
            'name' => $p['team_name'],
            'color' => $p['team_color']
        ) : null,
        '_count' => array(
            'tasks' => (int)$p['task_count']
        ),
        'createdAt' => $p['created_at'],
        'updatedAt' => $p['updated_at']
    );
}
