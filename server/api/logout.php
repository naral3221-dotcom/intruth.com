<?php
/**
 * 로그아웃 API
 * POST /api/logout.php
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

$authHeader = '';
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    }
}
if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

if (!empty($authHeader) && preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    $token = $matches[1];
    $db = getDB();
    $stmt = $db->prepare('DELETE FROM wf_sessions WHERE id = ?');
    $stmt->execute(array($token));
}

jsonResponse(array('success' => true, 'message' => '로그아웃되었습니다.'));
