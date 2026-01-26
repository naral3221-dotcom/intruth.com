<?php
/**
 * 팀 API
 *
 * GET    /api/teams.php                              - 팀 목록
 * GET    /api/teams.php?id=1                         - 팀 상세
 * POST   /api/teams.php                              - 팀 생성
 * PUT    /api/teams.php?id=1                         - 팀 수정
 * DELETE /api/teams.php?id=1                         - 팀 삭제
 * GET    /api/teams.php?id=1&members=1               - 팀 멤버 목록
 * POST   /api/teams.php?id=1&members=1               - 팀 멤버 추가
 * DELETE /api/teams.php?id=1&memberId=2              - 팀 멤버 삭제
 * PATCH  /api/teams.php?id=1&memberId=2              - 팀 멤버 역할 수정
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

$teamId = isset($_GET['id']) ? $_GET['id'] : null;
$memberId = isset($_GET['memberId']) ? $_GET['memberId'] : null;
$isMembers = isset($_GET['members']);

// 팀 멤버 관련 요청
if ($teamId && ($isMembers || $memberId)) {
    switch ($method) {
        case 'GET':
            getTeamMembers($db, $teamId);
            break;
        case 'POST':
            addTeamMember($db, $teamId);
            break;
        case 'DELETE':
            removeTeamMember($db, $teamId, $memberId);
            break;
        case 'PATCH':
            updateTeamMemberRole($db, $teamId, $memberId);
            break;
        default:
            errorResponse('Method not allowed', 405);
    }
} else {
    // 팀 CRUD
    switch ($method) {
        case 'GET':
            if ($teamId) {
                getTeam($db, $teamId);
            } else {
                getTeams($db);
            }
            break;
        case 'POST':
            createTeam($db);
            break;
        case 'PUT':
            updateTeam($db, $teamId);
            break;
        case 'DELETE':
            deleteTeam($db, $teamId);
            break;
        default:
            errorResponse('Method not allowed', 405);
    }
}

function getTeams($db) {
    $stmt = $db->query('
        SELECT t.*,
               m.id as leader_member_id, m.name as leader_name, m.avatar_url as leader_avatar,
               m.department as leader_department, m.position as leader_position,
               (SELECT COUNT(*) FROM wf_team_members WHERE team_id = t.id) as member_count
        FROM wf_teams t
        LEFT JOIN wf_users m ON t.leader_id = m.id
        ORDER BY t.created_at DESC
    ');
    $teams = $stmt->fetchAll();

    $result = array();
    foreach ($teams as $t) {
        $result[] = formatTeam($t);
    }

    jsonResponse($result);
}

function getTeam($db, $id) {
    $stmt = $db->prepare('
        SELECT t.*,
               m.id as leader_member_id, m.name as leader_name, m.avatar_url as leader_avatar,
               m.department as leader_department, m.position as leader_position,
               (SELECT COUNT(*) FROM wf_team_members WHERE team_id = t.id) as member_count
        FROM wf_teams t
        LEFT JOIN wf_users m ON t.leader_id = m.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($id));
    $team = $stmt->fetch();

    if (!$team) {
        errorResponse('팀을 찾을 수 없습니다.', 404);
    }

    // 팀 멤버 조회
    $stmt = $db->prepare('
        SELECT tm.*, u.name, u.email, u.department, u.position, u.avatar_url
        FROM wf_team_members tm
        JOIN wf_users u ON tm.member_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.role DESC, u.name ASC
    ');
    $stmt->execute(array($id));
    $members = $stmt->fetchAll();

    $result = formatTeam($team);
    $result['members'] = array();
    foreach ($members as $m) {
        $result['members'][] = array(
            'id' => (string)$m['id'],
            'teamId' => (string)$m['team_id'],
            'memberId' => (string)$m['member_id'],
            'role' => $m['role'],
            'joinedAt' => $m['joined_at'],
            'member' => array(
                'id' => (string)$m['member_id'],
                'name' => $m['name'],
                'email' => $m['email'],
                'department' => $m['department'],
                'position' => $m['position'],
                'avatarUrl' => $m['avatar_url']
            )
        );
    }

    jsonResponse($result);
}

function createTeam($db) {
    $input = getJsonInput();

    $name = isset($input['name']) ? trim($input['name']) : '';
    $description = isset($input['description']) ? trim($input['description']) : null;
    $color = isset($input['color']) ? trim($input['color']) : '#6366f1';
    $leaderId = isset($input['leaderId']) ? $input['leaderId'] : null;

    if (empty($name)) {
        errorResponse('팀 이름은 필수입니다.');
    }

    $stmt = $db->prepare('
        INSERT INTO wf_teams (name, description, color, leader_id)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute(array($name, $description, $color, $leaderId));

    $teamId = $db->lastInsertId();

    // 리더가 지정되었으면 자동으로 팀 멤버로 추가
    if ($leaderId) {
        $stmt = $db->prepare('
            INSERT INTO wf_team_members (team_id, member_id, role)
            VALUES (?, ?, ?)
        ');
        $stmt->execute(array($teamId, $leaderId, 'LEADER'));
    }

    // 생성된 팀 조회
    $stmt = $db->prepare('
        SELECT t.*,
               m.id as leader_member_id, m.name as leader_name, m.avatar_url as leader_avatar,
               m.department as leader_department, m.position as leader_position,
               (SELECT COUNT(*) FROM wf_team_members WHERE team_id = t.id) as member_count
        FROM wf_teams t
        LEFT JOIN wf_users m ON t.leader_id = m.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($teamId));
    $team = $stmt->fetch();

    jsonResponse(formatTeam($team), 201);
}

function updateTeam($db, $id) {
    if (!$id) {
        errorResponse('팀 ID가 필요합니다.');
    }

    $input = getJsonInput();

    $stmt = $db->prepare('SELECT id FROM wf_teams WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('팀을 찾을 수 없습니다.', 404);
    }

    $updates = array();
    $params = array();

    if (isset($input['name']) && !empty(trim($input['name']))) {
        $updates[] = 'name = ?';
        $params[] = trim($input['name']);
    }

    if (array_key_exists('description', $input)) {
        $updates[] = 'description = ?';
        $params[] = $input['description'];
    }

    if (array_key_exists('color', $input)) {
        $updates[] = 'color = ?';
        $params[] = $input['color'];
    }

    if (array_key_exists('leaderId', $input)) {
        $updates[] = 'leader_id = ?';
        $params[] = $input['leaderId'];
    }

    if (empty($updates)) {
        errorResponse('변경할 내용이 없습니다.');
    }

    $params[] = $id;
    $sql = 'UPDATE wf_teams SET ' . implode(', ', $updates) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // 업데이트된 팀 조회
    $stmt = $db->prepare('
        SELECT t.*,
               m.id as leader_member_id, m.name as leader_name, m.avatar_url as leader_avatar,
               m.department as leader_department, m.position as leader_position,
               (SELECT COUNT(*) FROM wf_team_members WHERE team_id = t.id) as member_count
        FROM wf_teams t
        LEFT JOIN wf_users m ON t.leader_id = m.id
        WHERE t.id = ?
    ');
    $stmt->execute(array($id));
    $team = $stmt->fetch();

    jsonResponse(formatTeam($team));
}

function deleteTeam($db, $id) {
    if (!$id) {
        errorResponse('팀 ID가 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_teams WHERE id = ?');
    $stmt->execute(array($id));
    if (!$stmt->fetch()) {
        errorResponse('팀을 찾을 수 없습니다.', 404);
    }

    $stmt = $db->prepare('DELETE FROM wf_teams WHERE id = ?');
    $stmt->execute(array($id));

    jsonResponse(array('success' => true, 'message' => '팀이 삭제되었습니다.'));
}

function getTeamMembers($db, $teamId) {
    $stmt = $db->prepare('SELECT id FROM wf_teams WHERE id = ?');
    $stmt->execute(array($teamId));
    if (!$stmt->fetch()) {
        errorResponse('팀을 찾을 수 없습니다.', 404);
    }

    $stmt = $db->prepare('
        SELECT tm.*, u.name, u.email, u.department, u.position, u.avatar_url
        FROM wf_team_members tm
        JOIN wf_users u ON tm.member_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.role DESC, u.name ASC
    ');
    $stmt->execute(array($teamId));
    $members = $stmt->fetchAll();

    $result = array();
    foreach ($members as $m) {
        $result[] = array(
            'id' => (string)$m['id'],
            'teamId' => (string)$m['team_id'],
            'memberId' => (string)$m['member_id'],
            'role' => $m['role'],
            'joinedAt' => $m['joined_at'],
            'member' => array(
                'id' => (string)$m['member_id'],
                'name' => $m['name'],
                'email' => $m['email'],
                'department' => $m['department'],
                'position' => $m['position'],
                'avatarUrl' => $m['avatar_url']
            )
        );
    }

    jsonResponse($result);
}

function addTeamMember($db, $teamId) {
    $stmt = $db->prepare('SELECT id FROM wf_teams WHERE id = ?');
    $stmt->execute(array($teamId));
    if (!$stmt->fetch()) {
        errorResponse('팀을 찾을 수 없습니다.', 404);
    }

    $input = getJsonInput();

    $memberId = isset($input['memberId']) ? $input['memberId'] : null;
    $role = isset($input['role']) ? $input['role'] : 'MEMBER';

    if (!$memberId) {
        errorResponse('멤버 ID가 필요합니다.');
    }

    // 멤버 존재 확인 (wf_users 테이블에서 확인)
    $stmt = $db->prepare('SELECT id FROM wf_users WHERE id = ?');
    $stmt->execute(array($memberId));
    if (!$stmt->fetch()) {
        errorResponse('멤버를 찾을 수 없습니다.', 404);
    }

    // 이미 팀에 속해있는지 확인
    $stmt = $db->prepare('SELECT id FROM wf_team_members WHERE team_id = ? AND member_id = ?');
    $stmt->execute(array($teamId, $memberId));
    if ($stmt->fetch()) {
        errorResponse('이미 팀에 속한 멤버입니다.');
    }

    $stmt = $db->prepare('
        INSERT INTO wf_team_members (team_id, member_id, role)
        VALUES (?, ?, ?)
    ');
    $stmt->execute(array($teamId, $memberId, $role));

    $teamMemberId = $db->lastInsertId();

    // 생성된 팀 멤버 조회
    $stmt = $db->prepare('
        SELECT tm.*, u.name, u.email, u.department, u.position, u.avatar_url
        FROM wf_team_members tm
        JOIN wf_users u ON tm.member_id = u.id
        WHERE tm.id = ?
    ');
    $stmt->execute(array($teamMemberId));
    $m = $stmt->fetch();

    jsonResponse(array(
        'id' => (string)$m['id'],
        'teamId' => (string)$m['team_id'],
        'memberId' => (string)$m['member_id'],
        'role' => $m['role'],
        'joinedAt' => $m['joined_at'],
        'member' => array(
            'id' => (string)$m['member_id'],
            'name' => $m['name'],
            'email' => $m['email'],
            'department' => $m['department'],
            'position' => $m['position'],
            'avatarUrl' => $m['avatar_url']
        )
    ), 201);
}

function removeTeamMember($db, $teamId, $memberId) {
    if (!$memberId) {
        errorResponse('멤버 ID가 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_team_members WHERE team_id = ? AND member_id = ?');
    $stmt->execute(array($teamId, $memberId));
    if (!$stmt->fetch()) {
        errorResponse('팀 멤버를 찾을 수 없습니다.', 404);
    }

    $stmt = $db->prepare('DELETE FROM wf_team_members WHERE team_id = ? AND member_id = ?');
    $stmt->execute(array($teamId, $memberId));

    jsonResponse(array('success' => true, 'message' => '팀에서 멤버가 제거되었습니다.'));
}

function updateTeamMemberRole($db, $teamId, $memberId) {
    if (!$memberId) {
        errorResponse('멤버 ID가 필요합니다.');
    }

    $input = getJsonInput();
    $role = isset($input['role']) ? $input['role'] : null;

    if (!$role) {
        errorResponse('역할이 필요합니다.');
    }

    $stmt = $db->prepare('SELECT id FROM wf_team_members WHERE team_id = ? AND member_id = ?');
    $stmt->execute(array($teamId, $memberId));
    if (!$stmt->fetch()) {
        errorResponse('팀 멤버를 찾을 수 없습니다.', 404);
    }

    $stmt = $db->prepare('UPDATE wf_team_members SET role = ? WHERE team_id = ? AND member_id = ?');
    $stmt->execute(array($role, $teamId, $memberId));

    // 업데이트된 팀 멤버 조회
    $stmt = $db->prepare('
        SELECT tm.*, u.name, u.email, u.department, u.position, u.avatar_url
        FROM wf_team_members tm
        JOIN wf_users u ON tm.member_id = u.id
        WHERE tm.team_id = ? AND tm.member_id = ?
    ');
    $stmt->execute(array($teamId, $memberId));
    $m = $stmt->fetch();

    jsonResponse(array(
        'id' => (string)$m['id'],
        'teamId' => (string)$m['team_id'],
        'memberId' => (string)$m['member_id'],
        'role' => $m['role'],
        'joinedAt' => $m['joined_at'],
        'member' => array(
            'id' => (string)$m['member_id'],
            'name' => $m['name'],
            'email' => $m['email'],
            'department' => $m['department'],
            'position' => $m['position'],
            'avatarUrl' => $m['avatar_url']
        )
    ));
}

function formatTeam($t) {
    $result = array(
        'id' => (string)$t['id'],
        'name' => $t['name'],
        'description' => $t['description'],
        'color' => $t['color'],
        'leaderId' => $t['leader_id'] ? (string)$t['leader_id'] : null,
        'memberCount' => isset($t['member_count']) ? (int)$t['member_count'] : 0,
        'createdAt' => $t['created_at'],
        'updatedAt' => $t['updated_at']
    );

    if ($t['leader_id'] && isset($t['leader_name'])) {
        $result['leader'] = array(
            'id' => (string)$t['leader_id'],
            'name' => $t['leader_name'],
            'avatarUrl' => $t['leader_avatar'],
            'department' => $t['leader_department'],
            'position' => $t['leader_position']
        );
    }

    return $result;
}
