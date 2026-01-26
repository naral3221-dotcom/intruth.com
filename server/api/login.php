<?php
/**
 * 로그인 API
 * POST /api/login.php
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$input = getJsonInput();
$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? $input['password'] : '';

if (empty($username) || empty($password)) {
    errorResponse('아이디와 비밀번호를 입력해주세요.');
}

$db = getDB();
$clientIP = getClientIP();
$userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

// 로그인 시도 횟수 체크
$stmt = $db->prepare('
    SELECT COUNT(*) as attempts FROM wf_login_logs
    WHERE ip_address = ? AND success = 0 AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
');
$stmt->execute(array($clientIP, LOGIN_LOCKOUT_DURATION));
$row = $stmt->fetch();
$attempts = $row['attempts'];

if ($attempts >= MAX_LOGIN_ATTEMPTS) {
    $logStmt = $db->prepare('
        INSERT INTO wf_login_logs (username, ip_address, user_agent, success, failure_reason)
        VALUES (?, ?, ?, 0, ?)
    ');
    $logStmt->execute(array($username, $clientIP, $userAgent, 'Too many attempts'));
    errorResponse('로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.', 429);
}

// 사용자 조회
$stmt = $db->prepare('SELECT * FROM wf_users WHERE username = ?');
$stmt->execute(array($username));
$user = $stmt->fetch();

// 사용자 없음 또는 비활성화
if (!$user || !$user['is_active']) {
    $logStmt = $db->prepare('
        INSERT INTO wf_login_logs (user_id, username, ip_address, user_agent, success, failure_reason)
        VALUES (?, ?, ?, ?, 0, ?)
    ');
    $userId = $user ? $user['id'] : null;
    $reason = $user ? 'Account disabled' : 'User not found';
    $logStmt->execute(array($userId, $username, $clientIP, $userAgent, $reason));
    errorResponse('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
}

// 비밀번호 검증
if (!password_verify($password, $user['password_hash'])) {
    $logStmt = $db->prepare('
        INSERT INTO wf_login_logs (user_id, username, ip_address, user_agent, success, failure_reason)
        VALUES (?, ?, ?, ?, 0, ?)
    ');
    $logStmt->execute(array($user['id'], $username, $clientIP, $userAgent, 'Invalid password'));
    errorResponse('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
}

// 세션 토큰 생성
$token = generateToken();
$expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

// 기존 세션 삭제
$stmt = $db->prepare('DELETE FROM wf_sessions WHERE user_id = ?');
$stmt->execute(array($user['id']));

// 새 세션 저장
$stmt = $db->prepare('
    INSERT INTO wf_sessions (id, user_id, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?)
');
$stmt->execute(array($token, $user['id'], $clientIP, $userAgent, $expiresAt));

// 마지막 로그인 시간 업데이트
$stmt = $db->prepare('UPDATE wf_users SET last_login_at = NOW() WHERE id = ?');
$stmt->execute(array($user['id']));

// 로그인 성공 기록
$logStmt = $db->prepare('
    INSERT INTO wf_login_logs (user_id, username, ip_address, user_agent, success)
    VALUES (?, ?, ?, ?, 1)
');
$logStmt->execute(array($user['id'], $username, $clientIP, $userAgent));

// 응답
$email = $user['email'] ? $user['email'] : '';
jsonResponse(array(
    'token' => $token,
    'user' => array(
        'id' => (string)$user['id'],
        'username' => $user['username'],
        'email' => $email,
        'name' => $user['name'],
        'avatarUrl' => $user['avatar_url'],
        'department' => $user['department'],
        'position' => $user['position'],
        'role' => $user['role'],
        'createdAt' => $user['created_at'],
    ),
    'mustChangePassword' => (bool)$user['must_change_password'],
));
