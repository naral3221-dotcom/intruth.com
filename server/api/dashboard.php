<?php
/**
 * 대시보드 API
 *
 * GET /api/dashboard.php?action=summary       - 통계 요약
 * GET /api/dashboard.php?action=my-tasks      - 내 업무
 * GET /api/dashboard.php?action=team-progress - 팀 진행 현황
 * GET /api/dashboard.php?action=activities    - 최근 활동
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();

$action = isset($_GET['action']) ? $_GET['action'] : 'summary';

switch ($action) {
    case 'summary':
        getSummary($db);
        break;
    case 'my-tasks':
        getMyTasks($db, $user);
        break;
    case 'team-progress':
        getTeamProgress($db);
        break;
    case 'activities':
        getActivities($db);
        break;
    default:
        getSummary($db);
}

function getSummary($db) {
    // 전체 태스크 수
    $stmt = $db->query('SELECT COUNT(*) as cnt FROM wf_tasks WHERE parent_id IS NULL');
    $total = $stmt->fetch()['cnt'];

    // 상태별 태스크 수
    $stmt = $db->query('SELECT status, COUNT(*) as cnt FROM wf_tasks WHERE parent_id IS NULL GROUP BY status');
    $statusCounts = array('TODO' => 0, 'IN_PROGRESS' => 0, 'REVIEW' => 0, 'DONE' => 0);
    while ($row = $stmt->fetch()) {
        $statusCounts[$row['status']] = (int)$row['cnt'];
    }

    // 마감 지난 태스크
    $stmt = $db->query('SELECT COUNT(*) as cnt FROM wf_tasks WHERE parent_id IS NULL AND due_date < CURDATE() AND status != "DONE"');
    $overdue = $stmt->fetch()['cnt'];

    // 프로젝트 수
    $stmt = $db->query('SELECT COUNT(*) as cnt FROM wf_projects');
    $projects = $stmt->fetch()['cnt'];

    // 멤버 수
    $stmt = $db->query('SELECT COUNT(*) as cnt FROM wf_members WHERE is_active = 1');
    $members = $stmt->fetch()['cnt'];

    jsonResponse(array(
        'total' => (int)$total,
        'todo' => $statusCounts['TODO'],
        'inProgress' => $statusCounts['IN_PROGRESS'],
        'review' => $statusCounts['REVIEW'],
        'done' => $statusCounts['DONE'],
        'overdue' => (int)$overdue,
        'projects' => (int)$projects,
        'members' => (int)$members
    ));
}

function getMyTasks($db, $user) {
    // 현재 사용자의 멤버 ID 조회
    $stmt = $db->prepare('SELECT id FROM wf_members WHERE user_id = ?');
    $stmt->execute(array($user['id']));
    $member = $stmt->fetch();

    if (!$member) {
        jsonResponse(array());
        return;
    }

    $stmt = $db->prepare('
        SELECT t.*,
               p.name as project_name
        FROM wf_tasks t
        LEFT JOIN wf_projects p ON t.project_id = p.id
        WHERE t.assignee_id = ? AND t.status != "DONE" AND t.parent_id IS NULL
        ORDER BY
            CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
            t.due_date ASC,
            t.priority DESC
        LIMIT 10
    ');
    $stmt->execute(array($member['id']));
    $tasks = $stmt->fetchAll();

    $result = array();
    foreach ($tasks as $t) {
        $result[] = array(
            'id' => (string)$t['id'],
            'title' => $t['title'],
            'status' => $t['status'],
            'priority' => $t['priority'],
            'dueDate' => $t['due_date'],
            'project' => $t['project_id'] ? array(
                'id' => (string)$t['project_id'],
                'name' => $t['project_name']
            ) : null
        );
    }

    jsonResponse($result);
}

function getTeamProgress($db) {
    $stmt = $db->query('
        SELECT m.id, m.name, m.avatar_url, m.department,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = m.id AND status = "TODO" AND parent_id IS NULL) as todo,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = m.id AND status = "IN_PROGRESS" AND parent_id IS NULL) as in_progress,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = m.id AND status = "REVIEW" AND parent_id IS NULL) as review,
               (SELECT COUNT(*) FROM wf_tasks WHERE assignee_id = m.id AND status = "DONE" AND parent_id IS NULL) as done
        FROM wf_members m
        WHERE m.is_active = 1
        ORDER BY m.name ASC
    ');
    $members = $stmt->fetchAll();

    $result = array();
    foreach ($members as $m) {
        $total = (int)$m['todo'] + (int)$m['in_progress'] + (int)$m['review'] + (int)$m['done'];
        $result[] = array(
            'id' => (string)$m['id'],
            'name' => $m['name'],
            'avatarUrl' => $m['avatar_url'],
            'department' => $m['department'],
            'taskStats' => array(
                'todo' => (int)$m['todo'],
                'inProgress' => (int)$m['in_progress'],
                'review' => (int)$m['review'],
                'done' => (int)$m['done']
            ),
            'total' => $total
        );
    }

    jsonResponse($result);
}

function getActivities($db) {
    $stmt = $db->query('
        SELECT al.*, u.name as user_name, u.avatar_url as user_avatar
        FROM wf_activity_logs al
        LEFT JOIN wf_users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 20
    ');
    $activities = $stmt->fetchAll();

    $result = array();
    foreach ($activities as $a) {
        $result[] = array(
            'id' => (string)$a['id'],
            'action' => $a['action'],
            'targetType' => $a['target_type'],
            'targetId' => $a['target_id'] ? (string)$a['target_id'] : null,
            'details' => $a['details'],
            'user' => $a['user_id'] ? array(
                'id' => (string)$a['user_id'],
                'name' => $a['user_name'],
                'avatarUrl' => $a['user_avatar']
            ) : null,
            'createdAt' => $a['created_at']
        );
    }

    jsonResponse($result);
}
