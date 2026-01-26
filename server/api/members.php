<?php
/**
 * 멤버 API
 *
 * GET    /api/members.php         - 멤버 목록
 * GET    /api/members.php?id=1    - 멤버 상세
 * POST   /api/members.php         - 멤버 추가
 * PUT    /api/members.php?id=1    - 멤버 수정
 * DELETE /api/members.php?id=1    - 멤버 삭제
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getMember($db, $_GET['id']);
        } else {
            getMembers($db);
        }
        break;
    case 'POST':
        createMember($db);
        break;
    case 'PUT':
        updateMember($db, $_GET['id']);
        break;
    case 'DELETE':
        deleteMember($db, $_GET['id']);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function getMembers($db) {
    // wf_users 테이블에서 활성 사용자 조회 (wf_members와 LEFT JOIN하여 추가 정보 가져옴)
    $stmt = $db->query('
        SELECT u.id, u.name, u.email, u.avatar_url, u.is_active, u.created_at, u.updated_at,
               COALESCE(m.department, u.department) as department,
               COALESCE(m.position, u.position) as position,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = u.id AND status != "DONE") as active_tasks
        FROM wf_users u
        LEFT JOIN wf_members m ON u.id = m.user_id
        WHERE u.is_active = 1
        ORDER BY u.name ASC
    ');
    $members = $stmt->fetchAll();

    $result = array();
    foreach ($members as $m) {
        $result[] = formatMember($m);
    }

    jsonResponse($result);
}

function getMember($db, $id) {
    $stmt = $db->prepare('
        SELECT u.id, u.name, u.email, u.avatar_url, u.is_active, u.created_at, u.updated_at,
               COALESCE(m.department, u.department) as department,
               COALESCE(m.position, u.position) as position,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = u.id AND status != "DONE") as active_tasks
        FROM wf_users u
        LEFT JOIN wf_members m ON u.id = m.user_id
        WHERE u.id = ?
    ');
    $stmt->execute(array($id));
    $member = $stmt->fetch();

    if (!$member) {
        errorResponse('멤버를 찾을 수 없습니다.', 404);
    }

    jsonResponse(formatMember($member));
}

function createMember($db) {
    $input = getJsonInput();

    $name = isset($input['name']) ? trim($input['name']) : '';
    $email = isset($input['email']) ? trim($input['email']) : null;
    $department = isset($input['department']) ? trim($input['department']) : null;
    $position = isset($input['position']) ? trim($input['position']) : null;
    $avatarUrl = isset($input['avatarUrl']) ? trim($input['avatarUrl']) : null;

    if (empty($name)) {
        errorResponse('이름은 필수입니다.');
    }

    // 이메일 중복 확인
    if ($email) {
        $stmt = $db->prepare('SELECT id FROM wf_members WHERE email = ?');
        $stmt->execute(array($email));
        if ($stmt->fetch()) {
            errorResponse('이미 등록된 이메일입니다.');
        }
    }

    $stmt = $db->prepare('
        INSERT INTO wf_members (name, email, department, position, avatar_url)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmt->execute(array($name, $email, $department, $position, $avatarUrl));

    $memberId = $db->lastInsertId();

    $stmt = $db->prepare('SELECT *, 0 as active_tasks FROM wf_members WHERE id = ?');
    $stmt->execute(array($memberId));
    $member = $stmt->fetch();

    jsonResponse(formatMember($member), 201);
}

function updateMember($db, $id) {
    if (!$id) {
        errorResponse('멤버 ID가 필요합니다.');
    }

    $input = getJsonInput();

    $stmt = $db->prepare('SELECT id FROM wf_members WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('멤버를 찾을 수 없습니다.', 404);
    }

    $updates = array();
    $params = array();

    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = 'name = ?';
        $params[] = trim($input['name']);
    }

    if (array_key_exists('email', $input)) {
        $email = trim($input['email']);
        if ($email) {
            // 이메일 중복 확인 (자기 자신 제외)
            $stmt = $db->prepare('SELECT id FROM wf_members WHERE email = ? AND id != ?');
            $stmt->execute(array($email, $id));
            if ($stmt->fetch()) {
                errorResponse('이미 등록된 이메일입니다.');
            }
        }
        $updates[] = 'email = ?';
        $params[] = $email ? $email : null;
    }

    if (array_key_exists('department', $input)) {
        $updates[] = 'department = ?';
        $params[] = trim($input['department']) ? trim($input['department']) : null;
    }

    if (array_key_exists('position', $input)) {
        $updates[] = 'position = ?';
        $params[] = trim($input['position']) ? trim($input['position']) : null;
    }

    if (array_key_exists('avatarUrl', $input)) {
        $updates[] = 'avatar_url = ?';
        $params[] = $input['avatarUrl'];
    }

    if (isset($input['isActive'])) {
        $updates[] = 'is_active = ?';
        $params[] = $input['isActive'] ? 1 : 0;
    }

    if (empty($updates)) {
        errorResponse('변경할 내용이 없습니다.');
    }

    $params[] = $id;
    $sql = 'UPDATE wf_members SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $stmt = $db->prepare('
        SELECT m.*,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = m.id AND status != "DONE") as active_tasks
        FROM wf_members m
        WHERE m.id = ?
    ');
    $stmt->execute(array($id));
    $member = $stmt->fetch();

    jsonResponse(formatMember($member));
}

function deleteMember($db, $id) {
    if (!$id) {
        errorResponse('멤버 ID가 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_members WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('멤버를 찾을 수 없습니다.', 404);
    }

    // 소프트 삭제 (is_active = 0)
    $stmt = $db->prepare('UPDATE wf_members SET is_active = 0 WHERE id = ?');
    $stmt->execute(array($id));

    jsonResponse(array('success' => true, 'message' => '멤버가 삭제되었습니다.'));
}

function formatMember($m) {
    return array(
        'id' => (string)$m['id'],
        'name' => $m['name'],
        'email' => $m['email'],
        'department' => $m['department'],
        'position' => $m['position'],
        'avatarUrl' => $m['avatar_url'],
        'isActive' => (bool)$m['is_active'],
        'activeTasks' => isset($m['active_tasks']) ? (int)$m['active_tasks'] : 0,
        'createdAt' => $m['created_at'],
        'updatedAt' => $m['updated_at']
    );
}
