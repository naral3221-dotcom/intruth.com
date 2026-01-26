<?php
/**
 * 루틴 업무 API
 *
 * GET    /api/routine_tasks.php                    - 루틴 목록 (오늘 요일에 해당하는 루틴)
 * GET    /api/routine_tasks.php?id=xxx             - 루틴 상세
 * GET    /api/routine_tasks.php?projectId=xxx      - 프로젝트 루틴 목록
 * GET    /api/routine_tasks.php?all=1              - 전체 루틴 목록
 * POST   /api/routine_tasks.php                    - 루틴 생성
 * PUT    /api/routine_tasks.php?id=xxx             - 루틴 수정
 * DELETE /api/routine_tasks.php?id=xxx             - 루틴 삭제
 * PATCH  /api/routine_tasks.php?id=xxx&action=complete   - 완료 체크
 * PATCH  /api/routine_tasks.php?id=xxx&action=uncomplete - 완료 취소
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getRoutine($db, $_GET['id']);
        } else {
            getRoutines($db, $user);
        }
        break;
    case 'POST':
        createRoutine($db, $user);
        break;
    case 'PUT':
        updateRoutine($db, $_GET['id']);
        break;
    case 'PATCH':
        $action = $_GET['action'] ?? '';
        if ($action === 'complete') {
            completeRoutine($db, $_GET['id'], $user);
        } elseif ($action === 'uncomplete') {
            uncompleteRoutine($db, $_GET['id'], $user);
        } else {
            errorResponse('Invalid action', 400);
        }
        break;
    case 'DELETE':
        deleteRoutine($db, $_GET['id']);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

// 루틴 목록 조회
function getRoutines($db, $user) {
    $where = ['r.is_active = 1'];
    $params = [];

    // 프로젝트별 조회
    if (isset($_GET['projectId']) && $_GET['projectId']) {
        $where[] = 'r.project_id = ?';
        $params[] = $_GET['projectId'];
    }

    // 전체 목록 조회가 아니면 오늘 요일에 해당하는 루틴만
    if (!isset($_GET['all'])) {
        $todayDow = (int)date('w'); // 0=일, 1=월, ..., 6=토
        // MariaDB 호환: JSON_CONTAINS 대신 LIKE 사용
        $where[] = "(r.repeat_type = 'daily' OR r.repeat_days LIKE ?)";
        $params[] = '%' . $todayDow . '%';
    }

    // 개인 루틴만 (프로젝트 없는 것)
    if (isset($_GET['personal']) && $_GET['personal']) {
        $where[] = 'r.project_id IS NULL';
        // 담당자에 현재 사용자가 포함되어 있거나 생성자인 경우
        $where[] = '(r.created_by = ? OR EXISTS (SELECT 1 FROM wf_routine_assignees ra WHERE ra.routine_id = r.id AND ra.user_id = ?))';
        $params[] = $user['id'];
        $params[] = $user['id'];
    }

    $whereClause = implode(' AND ', $where);
    $today = date('Y-m-d');

    $sql = "
        SELECT r.*,
               p.name as project_name,
               u.name as creator_name,
               u.avatar_url as creator_avatar,
               (SELECT COUNT(*) FROM wf_routine_completions rc
                WHERE rc.routine_id = r.id AND rc.completed_date = ?) as completion_count
        FROM wf_routine_tasks r
        LEFT JOIN wf_projects p ON r.project_id = p.id
        LEFT JOIN wf_users u ON r.created_by = u.id
        WHERE {$whereClause}
        ORDER BY r.created_at DESC
    ";

    array_unshift($params, $today);

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $routines = $stmt->fetchAll();

    $result = [];
    foreach ($routines as $r) {
        $result[] = formatRoutine($r, $db, $user['id'], $today);
    }

    jsonResponse($result);
}

// 루틴 상세 조회
function getRoutine($db, $id) {
    $today = date('Y-m-d');

    $stmt = $db->prepare("
        SELECT r.*,
               p.name as project_name,
               u.name as creator_name,
               u.avatar_url as creator_avatar
        FROM wf_routine_tasks r
        LEFT JOIN wf_projects p ON r.project_id = p.id
        LEFT JOIN wf_users u ON r.created_by = u.id
        WHERE r.id = ?
    ");
    $stmt->execute([$id]);
    $routine = $stmt->fetch();

    if (!$routine) {
        errorResponse('Routine not found', 404);
    }

    global $user;
    jsonResponse(formatRoutine($routine, $db, $user['id'], $today));
}

// 루틴 생성
function createRoutine($db, $user) {
    $data = getJsonInput();

    $title = $data['title'] ?? '';
    $description = $data['description'] ?? null;
    $repeatDays = $data['repeatDays'] ?? [1,2,3,4,5]; // 기본: 평일
    $repeatType = $data['repeatType'] ?? 'weekly';
    $projectId = $data['projectId'] ?? null;
    $priority = $data['priority'] ?? 'MEDIUM';
    $estimatedMinutes = $data['estimatedMinutes'] ?? null;
    $assigneeIds = $data['assigneeIds'] ?? [$user['id']]; // 기본: 생성자

    if (empty($title)) {
        errorResponse('Title is required', 400);
    }

    $db->beginTransaction();

    try {
        // 루틴 생성 (INT auto_increment)
        $stmt = $db->prepare("
            INSERT INTO wf_routine_tasks
            (title, description, repeat_days, repeat_type, project_id, priority, estimated_minutes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $title, $description, json_encode($repeatDays), $repeatType,
            $projectId ?: null, $priority, $estimatedMinutes, $user['id']
        ]);

        $id = $db->lastInsertId();

        // 담당자 추가
        foreach ($assigneeIds as $assigneeId) {
            $stmt = $db->prepare("
                INSERT INTO wf_routine_assignees (routine_id, user_id)
                VALUES (?, ?)
            ");
            $stmt->execute([$id, $assigneeId]);
        }

        $db->commit();

        // 생성된 루틴 반환
        getRoutine($db, $id);

    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Failed to create routine: ' . $e->getMessage(), 500);
    }
}

// 루틴 수정
function updateRoutine($db, $id) {
    $data = getJsonInput();

    $fields = [];
    $params = [];

    if (isset($data['title'])) {
        $fields[] = 'title = ?';
        $params[] = $data['title'];
    }
    if (isset($data['description'])) {
        $fields[] = 'description = ?';
        $params[] = $data['description'];
    }
    if (isset($data['repeatDays'])) {
        $fields[] = 'repeat_days = ?';
        $params[] = json_encode($data['repeatDays']);
    }
    if (isset($data['repeatType'])) {
        $fields[] = 'repeat_type = ?';
        $params[] = $data['repeatType'];
    }
    if (isset($data['projectId'])) {
        $fields[] = 'project_id = ?';
        $params[] = $data['projectId'] ?: null;
    }
    if (isset($data['priority'])) {
        $fields[] = 'priority = ?';
        $params[] = $data['priority'];
    }
    if (isset($data['estimatedMinutes'])) {
        $fields[] = 'estimated_minutes = ?';
        $params[] = $data['estimatedMinutes'];
    }
    if (isset($data['isActive'])) {
        $fields[] = 'is_active = ?';
        $params[] = $data['isActive'] ? 1 : 0;
    }

    if (empty($fields)) {
        errorResponse('No fields to update', 400);
    }

    $db->beginTransaction();

    try {
        $params[] = $id;
        $stmt = $db->prepare("UPDATE wf_routine_tasks SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);

        // 담당자 업데이트
        if (isset($data['assigneeIds'])) {
            // 기존 담당자 삭제
            $stmt = $db->prepare("DELETE FROM wf_routine_assignees WHERE routine_id = ?");
            $stmt->execute([$id]);

            // 새 담당자 추가
            foreach ($data['assigneeIds'] as $assigneeId) {
                $stmt = $db->prepare("
                    INSERT INTO wf_routine_assignees (routine_id, user_id)
                    VALUES (?, ?)
                ");
                $stmt->execute([$id, $assigneeId]);
            }
        }

        $db->commit();

        getRoutine($db, $id);

    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Failed to update routine: ' . $e->getMessage(), 500);
    }
}

// 루틴 삭제
function deleteRoutine($db, $id) {
    $stmt = $db->prepare("DELETE FROM wf_routine_tasks WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

// 루틴 완료 체크
function completeRoutine($db, $id, $user) {
    $today = date('Y-m-d');

    try {
        $stmt = $db->prepare("
            INSERT INTO wf_routine_completions (routine_id, completed_date, completed_by)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$id, $today, $user['id']]);

        jsonResponse(['success' => true, 'completed' => true, 'date' => $today]);

    } catch (PDOException $e) {
        // 중복 완료 시도 (이미 완료됨)
        if ($e->getCode() == 23000) {
            jsonResponse(['success' => true, 'completed' => true, 'date' => $today, 'message' => 'Already completed']);
        }
        throw $e;
    }
}

// 루틴 완료 취소
function uncompleteRoutine($db, $id, $user) {
    $today = date('Y-m-d');

    $stmt = $db->prepare("
        DELETE FROM wf_routine_completions
        WHERE routine_id = ? AND completed_date = ? AND completed_by = ?
    ");
    $stmt->execute([$id, $today, $user['id']]);

    jsonResponse(['success' => true, 'completed' => false, 'date' => $today]);
}

// 루틴 포맷팅
function formatRoutine($r, $db, $userId, $today) {
    // 담당자 목록 조회
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.avatar_url, u.department, u.position
        FROM wf_routine_assignees ra
        JOIN wf_users u ON ra.user_id = u.id
        WHERE ra.routine_id = ?
    ");
    $stmt->execute([$r['id']]);
    $assignees = $stmt->fetchAll();

    // 현재 사용자의 오늘 완료 여부
    $stmt = $db->prepare("
        SELECT id FROM wf_routine_completions
        WHERE routine_id = ? AND completed_date = ? AND completed_by = ?
    ");
    $stmt->execute([$r['id'], $today, $userId]);
    $isCompletedToday = (bool)$stmt->fetch();

    // 최근 완료 이력 (최근 7일)
    $stmt = $db->prepare("
        SELECT rc.completed_date, rc.completed_at, u.name as completed_by_name
        FROM wf_routine_completions rc
        JOIN wf_users u ON rc.completed_by = u.id
        WHERE rc.routine_id = ? AND rc.completed_date >= DATE_SUB(?, INTERVAL 7 DAY)
        ORDER BY rc.completed_date DESC
    ");
    $stmt->execute([$r['id'], $today]);
    $recentCompletions = $stmt->fetchAll();

    $repeatDays = json_decode($r['repeat_days'], true) ?? [];

    return [
        'id' => $r['id'],
        'title' => $r['title'],
        'description' => $r['description'],
        'repeatDays' => $repeatDays,
        'repeatType' => $r['repeat_type'],
        'projectId' => $r['project_id'],
        'project' => $r['project_id'] ? [
            'id' => $r['project_id'],
            'name' => $r['project_name']
        ] : null,
        'priority' => $r['priority'],
        'estimatedMinutes' => $r['estimated_minutes'] ? (int)$r['estimated_minutes'] : null,
        'isActive' => (bool)$r['is_active'],
        'assignees' => array_map(function($a) {
            return [
                'id' => $a['id'],
                'name' => $a['name'],
                'email' => $a['email'],
                'avatarUrl' => $a['avatar_url'],
                'department' => $a['department'],
                'position' => $a['position']
            ];
        }, $assignees),
        'isCompletedToday' => $isCompletedToday,
        'recentCompletions' => array_map(function($c) {
            return [
                'date' => $c['completed_date'],
                'completedAt' => $c['completed_at'],
                'completedByName' => $c['completed_by_name']
            ];
        }, $recentCompletions),
        'createdBy' => [
            'id' => $r['created_by'],
            'name' => $r['creator_name'],
            'avatarUrl' => $r['creator_avatar']
        ],
        'createdAt' => $r['created_at'],
        'updatedAt' => $r['updated_at']
    ];
}
