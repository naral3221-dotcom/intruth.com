<?php
/**
 * 관리자용 사용자 관리 API
 *
 * GET    /api/admin/users.php         - 사용자 목록
 * POST   /api/admin/users.php         - 사용자 생성
 * PUT    /api/admin/users.php?id=1    - 사용자 수정
 * DELETE /api/admin/users.php?id=1    - 사용자 삭제
 */

require_once __DIR__ . '/../config.php';

setCorsHeaders();

// 관리자 권한 확인
$admin = requireAdmin();

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetUsers($db);
        break;

    case 'POST':
        handleCreateUser($db);
        break;

    case 'PUT':
        handleUpdateUser($db, $admin);
        break;

    case 'DELETE':
        handleDeleteUser($db, $admin);
        break;

    default:
        errorResponse('Method not allowed', 405);
}

/**
 * 사용자 목록 조회
 */
function handleGetUsers($db) {
    $stmt = $db->query('
        SELECT id, username, name, email, department, position, avatar_url,
               role, must_change_password, is_active, last_login_at, created_at, updated_at
        FROM wf_users
        ORDER BY created_at DESC
    ');
    $users = $stmt->fetchAll();

    // 형식 변환
    $formattedUsers = array();
    foreach ($users as $user) {
        $formattedUsers[] = array(
            'id' => (string)$user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'email' => $user['email'],
            'department' => $user['department'],
            'position' => $user['position'],
            'avatarUrl' => $user['avatar_url'],
            'role' => $user['role'],
            'mustChangePassword' => (bool)$user['must_change_password'],
            'isActive' => (bool)$user['is_active'],
            'lastLoginAt' => $user['last_login_at'],
            'createdAt' => $user['created_at'],
            'updatedAt' => $user['updated_at'],
        );
    }

    jsonResponse($formattedUsers);
}

/**
 * 사용자 생성
 */
function handleCreateUser($db) {
    $input = getJsonInput();

    $username = isset($input['username']) ? trim($input['username']) : '';
    $name = isset($input['name']) ? trim($input['name']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $email = isset($input['email']) && trim($input['email']) !== '' ? trim($input['email']) : null;
    $department = isset($input['department']) && trim($input['department']) !== '' ? trim($input['department']) : null;
    $position = isset($input['position']) && trim($input['position']) !== '' ? trim($input['position']) : null;
    $role = isset($input['role']) ? $input['role'] : 'member';

    // 입력 검증
    if (empty($username) || empty($name)) {
        errorResponse('아이디와 이름은 필수입니다.');
    }

    if (strlen($username) < 2 || strlen($username) > 50) {
        errorResponse('아이디는 2~50자 사이여야 합니다.');
    }

    // 기본 비밀번호 설정
    if (empty($password)) {
        $password = '123456789';  // 기본 비밀번호
    }

    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        errorResponse('비밀번호는 ' . PASSWORD_MIN_LENGTH . '자 이상이어야 합니다.');
    }

    // role 검증
    if (!in_array($role, array('admin', 'member'))) {
        $role = 'member';
    }

    // 중복 확인
    $stmt = $db->prepare('SELECT id FROM wf_users WHERE username = ?');
    $stmt->execute(array($username));
    if ($stmt->fetch()) {
        errorResponse('이미 사용 중인 아이디입니다.');
    }

    // 비밀번호 해시
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 사용자 생성
    $stmt = $db->prepare('
        INSERT INTO wf_users (username, password_hash, name, email, department, position, role, must_change_password)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ');
    $stmt->execute(array($username, $passwordHash, $name, $email, $department, $position, $role));

    $userId = $db->lastInsertId();

    // 생성된 사용자 조회
    $stmt = $db->prepare('SELECT * FROM wf_users WHERE id = ?');
    $stmt->execute(array($userId));
    $user = $stmt->fetch();

    jsonResponse(array(
        'success' => true,
        'message' => '사용자가 생성되었습니다.',
        'user' => array(
            'id' => (string)$user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'email' => $user['email'],
            'department' => $user['department'],
            'position' => $user['position'],
            'avatarUrl' => $user['avatar_url'],
            'role' => $user['role'],
            'mustChangePassword' => (bool)$user['must_change_password'],
            'isActive' => (bool)$user['is_active'],
            'createdAt' => $user['created_at'],
        ),
        'tempPassword' => $password,  // 초기 비밀번호 (관리자에게만 표시)
    ), 201);
}

/**
 * 사용자 수정
 */
function handleUpdateUser($db, $admin) {
    $userId = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$userId) {
        errorResponse('사용자 ID가 필요합니다.');
    }

    // 사용자 존재 확인
    $stmt = $db->prepare('SELECT * FROM wf_users WHERE id = ?');
    $stmt->execute(array($userId));
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('사용자를 찾을 수 없습니다.', 404);
    }

    $input = getJsonInput();

    // 업데이트할 필드들
    $updates = array();
    $params = array();

    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = 'name = ?';
        $params[] = trim($input['name']);
    }

    if (array_key_exists('email', $input)) {
        $updates[] = 'email = ?';
        $emailVal = trim($input['email']);
        $params[] = $emailVal !== '' ? $emailVal : null;
    }

    if (array_key_exists('department', $input)) {
        $updates[] = 'department = ?';
        $deptVal = trim($input['department']);
        $params[] = $deptVal !== '' ? $deptVal : null;
    }

    if (array_key_exists('position', $input)) {
        $updates[] = 'position = ?';
        $posVal = trim($input['position']);
        $params[] = $posVal !== '' ? $posVal : null;
    }

    if (isset($input['role']) && in_array($input['role'], array('admin', 'member'))) {
        // 자기 자신의 권한은 변경 불가
        if ((int)$userId === (int)$admin['id']) {
            errorResponse('자신의 권한은 변경할 수 없습니다.');
        }
        $updates[] = 'role = ?';
        $params[] = $input['role'];
    }

    if (isset($input['isActive'])) {
        // 자기 자신은 비활성화 불가
        if ((int)$userId === (int)$admin['id']) {
            errorResponse('자신의 계정을 비활성화할 수 없습니다.');
        }
        $updates[] = 'is_active = ?';
        $params[] = $input['isActive'] ? 1 : 0;
    }

    if (empty($updates)) {
        errorResponse('변경할 내용이 없습니다.');
    }

    $params[] = $userId;
    $sql = 'UPDATE wf_users SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // 업데이트된 사용자 조회
    $stmt = $db->prepare('SELECT * FROM wf_users WHERE id = ?');
    $stmt->execute(array($userId));
    $user = $stmt->fetch();

    jsonResponse(array(
        'success' => true,
        'message' => '사용자 정보가 수정되었습니다.',
        'user' => array(
            'id' => (string)$user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'email' => $user['email'],
            'department' => $user['department'],
            'position' => $user['position'],
            'avatarUrl' => $user['avatar_url'],
            'role' => $user['role'],
            'mustChangePassword' => (bool)$user['must_change_password'],
            'isActive' => (bool)$user['is_active'],
            'createdAt' => $user['created_at'],
            'updatedAt' => $user['updated_at'],
        ),
    ));
}

/**
 * 사용자 삭제
 */
function handleDeleteUser($db, $admin) {
    $userId = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$userId) {
        errorResponse('사용자 ID가 필요합니다.');
    }

    // 자기 자신 삭제 불가
    if ((int)$userId === (int)$admin['id']) {
        errorResponse('자신의 계정은 삭제할 수 없습니다.');
    }

    // 사용자 존재 확인
    $stmt = $db->prepare('SELECT id, username FROM wf_users WHERE id = ?');
    $stmt->execute(array($userId));
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('사용자를 찾을 수 없습니다.', 404);
    }

    // 세션 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
    $stmt = $db->prepare('DELETE FROM wf_sessions WHERE user_id = ?');
    $stmt->execute(array($userId));

    // 사용자 삭제
    $stmt = $db->prepare('DELETE FROM wf_users WHERE id = ?');
    $stmt->execute(array($userId));

    jsonResponse(array(
        'success' => true,
        'message' => '사용자가 삭제되었습니다.',
    ));
}
