<?php
/**
 * 현재 로그인한 사용자 정보 API
 * GET /api/me.php
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$user = requireAuth();

$email = $user['email'] ? $user['email'] : '';
jsonResponse(array(
    'id' => (string)$user['id'],
    'username' => $user['username'],
    'email' => $email,
    'name' => $user['name'],
    'avatarUrl' => $user['avatar_url'],
    'department' => $user['department'],
    'position' => $user['position'],
    'role' => $user['role'],
    'mustChangePassword' => (bool)$user['must_change_password'],
    'createdAt' => $user['created_at'],
));
