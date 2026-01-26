<?php
/**
 * 태스크(업무) API
 *
 * GET    /api/tasks.php              - 태스크 목록
 * GET    /api/tasks.php?id=1         - 태스크 상세
 * POST   /api/tasks.php              - 태스크 생성
 * PUT    /api/tasks.php?id=1         - 태스크 수정
 * PATCH  /api/tasks.php?id=1&action=status - 상태 변경
 * DELETE /api/tasks.php?id=1         - 태스크 삭제
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getTask($db, $_GET['id']);
        } else {
            getTasks($db);
        }
        break;
    case 'POST':
        createTask($db, $user);
        break;
    case 'PUT':
        updateTask($db, $_GET['id']);
        break;
    case 'PATCH':
        if (isset($_GET['action']) && $_GET['action'] === 'status') {
            updateTaskStatus($db, $_GET['id']);
        } else {
            updateTask($db, $_GET['id']);
        }
        break;
    case 'DELETE':
        deleteTask($db, $_GET['id']);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function getTasks($db) {
    $where = array('t.parent_id IS NULL');
    $params = array();

    if (isset($_GET['projectId']) && $_GET['projectId']) {
        $where[] = 't.project_id = ?';
        $params[] = $_GET['projectId'];
    }

    if (isset($_GET['status']) && $_GET['status']) {
        $where[] = 't.status = ?';
        $params[] = $_GET['status'];
    }

    if (isset($_GET['assigneeId']) && $_GET['assigneeId']) {
        $where[] = 't.assignee_id = ?';
        $params[] = $_GET['assigneeId'];
    }

    $whereClause = implode(' AND ', $where);

    $sql = "
        SELECT t.*,
               p.name as project_name,
               a.name as assignee_name,
               a.avatar_url as assignee_avatar,
               a.department as assignee_department,
               a.position as assignee_position,
               r.name as reporter_name,
               r.avatar_url as reporter_avatar,
               (SELECT COUNT(*) FROM wf_tasks WHERE parent_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM wf_comments WHERE task_id = t.id) as comment_count
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        LEFT JOIN wf_users a ON t.assignee_id = a.id
        LEFT JOIN wf_users r ON t.reporter_id = r.id
        WHERE {$whereClause}
        ORDER BY t.task_order ASC, t.created_at DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll();

    $result = array();
    foreach ($tasks as $t) {
        $task = formatTask($t, $db);
        $result[] = $task;
    }

    jsonResponse($result);
}

function getTask($db, $id) {
    $stmt = $db->prepare('
        SELECT t.*,
               p.name as project_name,
               a.name as assignee_name,
               a.avatar_url as assignee_avatar,
               a.department as assignee_department,
               a.position as assignee_position,
               r.name as reporter_name,
               r.avatar_url as reporter_avatar,
               (SELECT COUNT(*) FROM wf_tasks WHERE parent_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM wf_comments WHERE task_id = t.id) as comment_count
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        LEFT JOIN wf_users a ON t.assignee_id = a.id
        LEFT JOIN wf_users r ON t.reporter_id = r.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($id));
    $task = $stmt->fetch();

    if (!$task) {
        errorResponse('업무를 찾을 수 없습니다.', 404);
    }

    jsonResponse(formatTask($task, $db, true));
}

function createTask($db, $user) {
    $input = getJsonInput();

    $projectId = isset($input['projectId']) ? $input['projectId'] : null;
    $parentId = isset($input['parentId']) ? $input['parentId'] : null;
    $title = isset($input['title']) ? trim($input['title']) : '';
    $description = isset($input['description']) ? trim($input['description']) : null;
    $status = isset($input['status']) ? $input['status'] : 'TODO';
    $priority = isset($input['priority']) ? $input['priority'] : 'MEDIUM';
    $assigneeId = isset($input['assigneeId']) ? $input['assigneeId'] : null;
    $assigneeIds = isset($input['assigneeIds']) ? $input['assigneeIds'] : array();
    $startDate = isset($input['startDate']) && $input['startDate'] ? $input['startDate'] : null;
    $dueDate = isset($input['dueDate']) && $input['dueDate'] ? $input['dueDate'] : null;
    $folderUrl = isset($input['folderUrl']) ? $input['folderUrl'] : null;

    if (empty($title)) {
        errorResponse('업무 제목은 필수입니다.');
    }

    // 현재 사용자 ID를 reporter로 사용 (wf_users 테이블 기준)
    $reporterId = $user['id'];

    // 단일 assigneeId가 있고 assigneeIds가 없으면 변환
    if ($assigneeId && empty($assigneeIds)) {
        $assigneeIds = array($assigneeId);
    }

    // 첫 번째 담당자를 메인 담당자로 설정
    $mainAssigneeId = !empty($assigneeIds) ? $assigneeIds[0] : null;

    // 순서 계산
    $stmt = $db->prepare('SELECT MAX(task_order) as max_order FROM wf_tasks WHERE status = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))');
    $stmt->execute(array($status, $projectId, $projectId));
    $row = $stmt->fetch();
    $order = ($row['max_order'] !== null) ? $row['max_order'] + 1 : 0;

    $stmt = $db->prepare('
        INSERT INTO wf_tasks (project_id, parent_id, title, description, status, priority, assignee_id, reporter_id, start_date, due_date, task_order, folder_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute(array($projectId, $parentId, $title, $description, $status, $priority, $mainAssigneeId, $reporterId, $startDate, $dueDate, $order, $folderUrl));

    $taskId = $db->lastInsertId();

    // 다중 담당자 저장 (member_id 컬럼 사용 - wf_users 참조)
    if (!empty($assigneeIds)) {
        $stmt = $db->prepare('INSERT INTO wf_task_assignees (task_id, member_id) VALUES (?, ?)');
        foreach ($assigneeIds as $aid) {
            $stmt->execute(array($taskId, $aid));
        }
    }

    // 생성된 태스크 조회
    $stmt = $db->prepare('
        SELECT t.*,
               p.name as project_name,
               a.name as assignee_name,
               a.avatar_url as assignee_avatar,
               a.department as assignee_department,
               a.position as assignee_position,
               r.name as reporter_name,
               r.avatar_url as reporter_avatar,
               0 as subtask_count,
               0 as comment_count
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        LEFT JOIN wf_users a ON t.assignee_id = a.id
        LEFT JOIN wf_users r ON t.reporter_id = r.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($taskId));
    $task = $stmt->fetch();

    jsonResponse(formatTask($task, $db), 201);
}

function updateTask($db, $id) {
    if (!$id) {
        errorResponse('업무 ID가 필요합니다.');
    }

    $input = getJsonInput();

    // 태스크 존재 확인
    $stmt = $db->prepare('SELECT id FROM wf_tasks WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('업무를 찾을 수 없습니다.', 404);
    }

    $updates = array();
    $params = array();

    if (isset($input['title']) && !empty(trim($input['title']))) {
        $updates[] = 'title = ?';
        $params[] = trim($input['title']);
    }

    if (array_key_exists('description', $input)) {
        $updates[] = 'description = ?';
        $params[] = $input['description'];
    }

    if (isset($input['status'])) {
        $updates[] = 'status = ?';
        $params[] = $input['status'];
        if ($input['status'] === 'DONE') {
            $updates[] = 'completed_at = NOW()';
        }
    }

    if (isset($input['priority'])) {
        $updates[] = 'priority = ?';
        $params[] = $input['priority'];
    }

    if (array_key_exists('assigneeId', $input)) {
        $updates[] = 'assignee_id = ?';
        $params[] = $input['assigneeId'];
    }

    if (array_key_exists('startDate', $input)) {
        $updates[] = 'start_date = ?';
        $params[] = $input['startDate'] ? $input['startDate'] : null;
    }

    if (array_key_exists('dueDate', $input)) {
        $updates[] = 'due_date = ?';
        $params[] = $input['dueDate'] ? $input['dueDate'] : null;
    }

    if (array_key_exists('folderUrl', $input)) {
        $updates[] = 'folder_url = ?';
        $params[] = $input['folderUrl'];
    }

    if (isset($input['order'])) {
        $updates[] = 'task_order = ?';
        $params[] = $input['order'];
    }

    // 다중 담당자 업데이트
    if (isset($input['assigneeIds'])) {
        // 기존 담당자 삭제
        $stmt = $db->prepare('DELETE FROM wf_task_assignees WHERE task_id = ?');
        $stmt->execute(array($id));

        // 새 담당자 추가 (member_id 컬럼 사용 - wf_users 참조)
        if (!empty($input['assigneeIds'])) {
            $stmt = $db->prepare('INSERT INTO wf_task_assignees (task_id, member_id) VALUES (?, ?)');
            foreach ($input['assigneeIds'] as $aid) {
                $stmt->execute(array($id, $aid));
            }
            // 메인 담당자 업데이트
            $updates[] = 'assignee_id = ?';
            $params[] = $input['assigneeIds'][0];
        }
    }

    if (!empty($updates)) {
        $params[] = $id;
        $sql = 'UPDATE wf_tasks SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }

    // 업데이트된 태스크 조회
    $stmt = $db->prepare('
        SELECT t.*,
               p.name as project_name,
               a.name as assignee_name,
               a.avatar_url as assignee_avatar,
               a.department as assignee_department,
               a.position as assignee_position,
               r.name as reporter_name,
               r.avatar_url as reporter_avatar,
               (SELECT COUNT(*) FROM wf_tasks WHERE parent_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM wf_comments WHERE task_id = t.id) as comment_count
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        LEFT JOIN wf_users a ON t.assignee_id = a.id
        LEFT JOIN wf_users r ON t.reporter_id = r.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($id));
    $task = $stmt->fetch();

    jsonResponse(formatTask($task, $db));
}

function updateTaskStatus($db, $id) {
    if (!$id) {
        errorResponse('업무 ID가 필요합니다.');
    }

    $input = getJsonInput();
    $status = isset($input['status']) ? $input['status'] : null;
    $order = isset($input['order']) ? $input['order'] : null;

    if (!$status) {
        errorResponse('상태값이 필요합니다.');
    }

    $updates = array('status = ?');
    $params = array($status);

    if ($status === 'DONE') {
        $updates[] = 'completed_at = NOW()';
    }

    if ($order !== null) {
        $updates[] = 'task_order = ?';
        $params[] = $order;
    }

    $params[] = $id;
    $sql = 'UPDATE wf_tasks SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // 업데이트된 태스크 조회
    $stmt = $db->prepare('
        SELECT t.*,
               p.name as project_name,
               a.name as assignee_name,
               a.avatar_url as assignee_avatar,
               a.department as assignee_department,
               a.position as assignee_position,
               r.name as reporter_name,
               r.avatar_url as reporter_avatar,
               (SELECT COUNT(*) FROM wf_tasks WHERE parent_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM wf_comments WHERE task_id = t.id) as comment_count
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        LEFT JOIN wf_users a ON t.assignee_id = a.id
        LEFT JOIN wf_users r ON t.reporter_id = r.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($id));
    $task = $stmt->fetch();

    jsonResponse(formatTask($task, $db));
}

function deleteTask($db, $id) {
    if (!$id) {
        errorResponse('업무 ID가 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_tasks WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('업무를 찾을 수 없습니다.', 404);
    }

    $stmt = $db->prepare('DELETE FROM wf_tasks WHERE id = ?');
    $stmt->execute(array($id));

    jsonResponse(array('success' => true, 'message' => '업무가 삭제되었습니다.'));
}

function formatTask($t, $db, $includeSubtasks = false) {
    $task = array(
        'id' => (string)$t['id'],
        'projectId' => $t['project_id'] ? (string)$t['project_id'] : null,
        'title' => $t['title'],
        'description' => $t['description'],
        'status' => $t['status'],
        'priority' => $t['priority'],
        'startDate' => $t['start_date'],
        'dueDate' => $t['due_date'],
        'completedAt' => $t['completed_at'],
        'order' => (int)$t['task_order'],
        'folderUrl' => $t['folder_url'],
        'project' => $t['project_id'] ? array(
            'id' => (string)$t['project_id'],
            'name' => $t['project_name']
        ) : null,
        'assignee' => $t['assignee_id'] ? array(
            'id' => (string)$t['assignee_id'],
            'name' => $t['assignee_name'],
            'avatarUrl' => $t['assignee_avatar'],
            'department' => $t['assignee_department'],
            'position' => isset($t['assignee_position']) ? $t['assignee_position'] : null
        ) : null,
        'reporter' => $t['reporter_id'] ? array(
            'id' => (string)$t['reporter_id'],
            'name' => $t['reporter_name'],
            'avatarUrl' => $t['reporter_avatar']
        ) : null,
        '_count' => array(
            'subtasks' => (int)$t['subtask_count'],
            'comments' => (int)$t['comment_count']
        ),
        'createdAt' => $t['created_at'],
        'updatedAt' => $t['updated_at']
    );

    // 다중 담당자 조회 (wf_users 테이블에서)
    $stmt = $db->prepare('
        SELECT u.id, u.name, u.avatar_url, u.department, u.position
        FROM wf_task_assignees ta
        JOIN wf_users u ON ta.member_id = u.id
        WHERE ta.task_id = ?
    ');
    $stmt->execute(array($t['id']));
    $assignees = $stmt->fetchAll();

    if (!empty($assignees)) {
        $task['assignees'] = array();
        foreach ($assignees as $a) {
            $task['assignees'][] = array(
                'id' => (string)$a['id'],
                'name' => $a['name'],
                'avatarUrl' => $a['avatar_url'],
                'department' => $a['department'],
                'position' => $a['position']
            );
        }
    }

    // 하위 태스크 조회
    if ($includeSubtasks) {
        $stmt = $db->prepare('
            SELECT t.*,
                   p.name as project_name,
                   a.name as assignee_name,
                   a.avatar_url as assignee_avatar,
                   a.department as assignee_department,
                   a.position as assignee_position,
                   r.name as reporter_name,
                   r.avatar_url as reporter_avatar,
                   0 as subtask_count,
                   (SELECT COUNT(*) FROM wf_comments WHERE task_id = t.id) as comment_count
            FROM wf_tasks t
            LEFT JOIN wf_projects p ON t.project_id = p.id
            LEFT JOIN wf_users a ON t.assignee_id = a.id
            LEFT JOIN wf_users r ON t.reporter_id = r.id
            WHERE t.parent_id = ?
            ORDER BY t.task_order ASC
        ');
        $stmt->execute(array($t['id']));
        $subtasks = $stmt->fetchAll();

        $task['subtasks'] = array();
        foreach ($subtasks as $st) {
            $task['subtasks'][] = formatTask($st, $db, false);
        }
    }

    // 라벨 조회
    $stmt = $db->prepare('
        SELECT l.id, l.name, l.color
        FROM wf_task_labels tl
        JOIN wf_labels l ON tl.label_id = l.id
        WHERE tl.task_id = ?
    ');
    $stmt->execute(array($t['id']));
    $labels = $stmt->fetchAll();

    $task['labels'] = array();
    foreach ($labels as $l) {
        $task['labels'][] = array(
            'id' => (string)$l['id'],
            'name' => $l['name'],
            'color' => $l['color']
        );
    }

    return $task;
}
