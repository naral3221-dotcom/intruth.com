<?php
/**
 * 비밀번호 변경 API
 * POST /api/change-password.php
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();
$input = getJsonInput();

$currentPassword = isset($input['currentPassword']) ? $input['currentPassword'] : '';
$newPassword = isset($input['newPassword']) ? $input['newPassword'] : '';

if (empty($currentPassword) || empty($newPassword)) {
    errorResponse('현재 비밀번호와 새 비밀번호를 입력해주세요.');
}

if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
    errorResponse('새 비밀번호는 ' . PASSWORD_MIN_LENGTH . '자 이상이어야 합니다.');
}

if ($currentPassword === $newPassword) {
    errorResponse('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
}

$db = getDB();

$stmt = $db->prepare('SELECT password_hash FROM wf_users WHERE id = ?');
$stmt->execute(array($user['id']));
$userData = $stmt->fetch();

if (!password_verify($currentPassword, $userData['password_hash'])) {
    errorResponse('현재 비밀번호가 올바르지 않습니다.', 401);
}

$newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);

$stmt = $db->prepare('
    UPDATE wf_users
    SET password_hash = ?, must_change_password = 0, updated_at = NOW()
    WHERE id = ?
');
$stmt->execute(array($newPasswordHash, $user['id']));

jsonResponse(array(
    'success' => true,
    'message' => '비밀번호가 변경되었습니다.'
));
