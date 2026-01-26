<?php
// 비밀번호 해시 테스트
header('Content-Type: application/json');

$password = '123456789';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo json_encode(array(
    'password' => $password,
    'hash' => $hash,
    'verify' => password_verify($password, $hash),
    'php_version' => PHP_VERSION
));
