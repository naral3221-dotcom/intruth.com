<?php
/**
 * Workflow API 설정 파일
 */

// 에러 표시 설정 (운영 시 false로 변경)
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// 데이터베이스 설정
define('DB_HOST', 'localhost');
define('DB_NAME', 'balancelab23');
define('DB_USER', 'balancelab23');
define('DB_PASS', 'erer0.0.');
define('DB_CHARSET', 'utf8mb4');

// 세션 설정
define('SESSION_DURATION', 60 * 60 * 8);  // 8시간
define('SESSION_TOKEN_LENGTH', 64);

// CORS 설정
define('CORS_ORIGIN', '*');

// 보안 설정
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_DURATION', 60 * 15);  // 15분

/**
 * 데이터베이스 연결
 */
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

            $options = array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            );

            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                die('Database connection failed: ' . $e->getMessage());
            }
            http_response_code(500);
            die(json_encode(array('error' => 'Database connection failed')));
        }
    }

    return $pdo;
}

/**
 * CORS 헤더 설정
 */
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');

    // Preflight 요청 처리
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * JSON 응답 전송
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 에러 응답 전송
 */
function errorResponse($message, $statusCode = 400) {
    jsonResponse(array('error' => $message), $statusCode);
}

/**
 * 요청 본문 JSON 파싱
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : array();
}

/**
 * 보안 토큰 생성
 */
function generateToken($length = 64) {
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes($length / 2));
    }
    // PHP 5.x 호환
    $token = '';
    for ($i = 0; $i < $length; $i++) {
        $token .= dechex(mt_rand(0, 15));
    }
    return $token;
}

/**
 * 클라이언트 IP 주소 가져오기
 */
function getClientIP() {
    $headers = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR');

    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];
            if (strpos($ip, ',') !== false) {
                $parts = explode(',', $ip);
                $ip = trim($parts[0]);
            }
            return $ip;
        }
    }

    return 'unknown';
}

/**
 * 현재 인증된 사용자 가져오기
 */
function getCurrentUser() {
    $headers = array();
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }

    $authHeader = '';
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $db = getDB();

    $stmt = $db->prepare('
        SELECT u.* FROM wf_users u
        JOIN wf_sessions s ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1
    ');
    $stmt->execute(array($token));
    $user = $stmt->fetch();

    if (!$user) {
        return null;
    }

    unset($user['password_hash']);

    return $user;
}

/**
 * 인증 필수 체크
 */
function requireAuth() {
    $user = getCurrentUser();
    if (!$user) {
        errorResponse('인증이 필요합니다.', 401);
    }
    return $user;
}

/**
 * 관리자 권한 필수 체크
 */
function requireAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        errorResponse('관리자 권한이 필요합니다.', 403);
    }
    return $user;
}
