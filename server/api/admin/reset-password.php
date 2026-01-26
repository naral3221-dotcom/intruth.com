<?php
/**
 * 관리자용 비밀번호 초기화 API
 *
 * POST /api/admin/reset-password.php
 * Body: { "userId": 1, "newPassword": "선택사항" }
 *
 * newPassword가 없으면 기본값 '123456789' 사용
 */

require_once __DIR__ . '/../config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

// 관리자 권한 확인
$admin = requireAdmin();

$input = getJsonInput();
$userId = isset($input['userId']) ? $input['userId'] : null;
$newPassword = isset($input['newPassword']) ? $input['newPassword'] : '123456789';  // 기본 비밀번호

if (!$userId) {
    errorResponse('사용자 ID가 필요합니다.');
}

if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
    errorResponse('비밀번호는 ' . PASSWORD_MIN_LENGTH . '자 이상이어야 합니다.');
}

$db = getDB();

// 사용자 존재 확인
$stmt = $db->prepare('SELECT id, username, name FROM wf_users WHERE id = ?');
$stmt->execute(array($userId));
$user = $stmt->fetch();

if (!$user) {
    errorResponse('사용자를 찾을 수 없습니다.', 404);
}

// 비밀번호 해시 생성
$passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

// 비밀번호 업데이트 (must_change_password = 1로 설정)
$stmt = $db->prepare('
    UPDATE wf_users
    SET password_hash = ?, must_change_password = 1, updated_at = NOW()
    WHERE id = ?
');
$stmt->execute(array($passwordHash, $userId));

// 해당 사용자의 모든 세션 삭제 (강제 로그아웃)
$stmt = $db->prepare('DELETE FROM wf_sessions WHERE user_id = ?');
$stmt->execute(array($userId));

jsonResponse(array(
    'success' => true,
    'message' => $user['name'] . '님의 비밀번호가 초기화되었습니다.',
    'tempPassword' => $newPassword,  // 관리자에게 표시
    'user' => array(
        'id' => (string)$user['id'],
        'username' => $user['username'],
        'name' => $user['name'],
    ),
));
