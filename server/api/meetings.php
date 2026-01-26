<?php
/**
 * 회의자료 API
 *
 * GET    /api/meetings.php              - 회의자료 목록
 * GET    /api/meetings.php?id=1         - 회의자료 상세
 * POST   /api/meetings.php              - 회의자료 생성
 * PUT    /api/meetings.php?id=1         - 회의자료 수정
 * DELETE /api/meetings.php?id=1         - 회의자료 삭제
 * POST   /api/meetings.php?id=1&action=upload    - 첨부파일 업로드
 * DELETE /api/meetings.php?id=1&attachment=1     - 첨부파일 삭제
 * POST   /api/meetings.php?id=1&action=comment   - 댓글 작성
 * DELETE /api/meetings.php?id=1&comment=1        - 댓글 삭제
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

$user = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// 업로드 디렉토리 설정
define('UPLOAD_DIR', __DIR__ . '/../uploads/meetings/');

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            getMeeting($db, $_GET['id']);
        } else {
            getMeetings($db);
        }
        break;
    case 'POST':
        if (isset($_GET['id']) && isset($_GET['action'])) {
            if ($_GET['action'] === 'upload') {
                uploadAttachments($db, $_GET['id'], $user);
            } elseif ($_GET['action'] === 'comment') {
                addComment($db, $_GET['id'], $user);
            } else {
                errorResponse('Invalid action', 400);
            }
        } else {
            createMeeting($db, $user);
        }
        break;
    case 'PUT':
        if (isset($_GET['id'])) {
            updateMeeting($db, $_GET['id'], $user);
        } else {
            errorResponse('Meeting ID is required', 400);
        }
        break;
    case 'DELETE':
        if (isset($_GET['id'])) {
            if (isset($_GET['attachment'])) {
                deleteAttachment($db, $_GET['id'], $_GET['attachment'], $user);
            } elseif (isset($_GET['comment'])) {
                deleteComment($db, $_GET['id'], $_GET['comment'], $user);
            } else {
                deleteMeeting($db, $_GET['id'], $user);
            }
        } else {
            errorResponse('Meeting ID is required', 400);
        }
        break;
    default:
        errorResponse('Method not allowed', 405);
}

/**
 * 회의자료 목록 조회
 */
function getMeetings($db) {
    $where = array('1=1');
    $params = array();

    // 필터: 프로젝트
    if (isset($_GET['projectId']) && $_GET['projectId']) {
        $where[] = 'm.project_id = ?';
        $params[] = $_GET['projectId'];
    }

    // 필터: 상태
    if (isset($_GET['status']) && $_GET['status']) {
        $where[] = 'm.status = ?';
        $params[] = $_GET['status'];
    }

    // 필터: 작성자
    if (isset($_GET['authorId']) && $_GET['authorId']) {
        $where[] = 'm.author_id = ?';
        $params[] = $_GET['authorId'];
    }

    // 필터: 기간 (시작일)
    if (isset($_GET['startDate']) && $_GET['startDate']) {
        $where[] = 'm.meeting_date >= ?';
        $params[] = $_GET['startDate'];
    }

    // 필터: 기간 (종료일)
    if (isset($_GET['endDate']) && $_GET['endDate']) {
        $where[] = 'm.meeting_date <= ?';
        $params[] = $_GET['endDate'];
    }

    // 필터: 검색어
    if (isset($_GET['search']) && $_GET['search']) {
        $where[] = '(m.title LIKE ? OR m.content LIKE ?)';
        $searchTerm = '%' . $_GET['search'] . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $whereClause = implode(' AND ', $where);

    $sql = "
        SELECT m.*,
               p.name as project_name,
               a.name as author_name,
               a.avatar_url as author_avatar,
               a.department as author_department,
               a.position as author_position,
               (SELECT COUNT(*) FROM wf_meeting_attachments WHERE meeting_id = m.id) as attachment_count,
               (SELECT COUNT(*) FROM wf_meeting_comments WHERE meeting_id = m.id) as comment_count
        FROM wf_meetings m
        LEFT JOIN wf_projects p ON m.project_id = p.id
        LEFT JOIN wf_users a ON m.author_id = a.id
        WHERE {$whereClause}
        ORDER BY m.meeting_date DESC, m.created_at DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $meetings = $stmt->fetchAll();

    $result = array();
    foreach ($meetings as $m) {
        $result[] = formatMeeting($m, $db);
    }

    jsonResponse($result);
}

/**
 * 회의자료 상세 조회
 */
function getMeeting($db, $id) {
    $stmt = $db->prepare('
        SELECT m.*,
               p.name as project_name,
               a.name as author_name,
               a.avatar_url as author_avatar,
               a.department as author_department,
               a.position as author_position,
               (SELECT COUNT(*) FROM wf_meeting_attachments WHERE meeting_id = m.id) as attachment_count,
               (SELECT COUNT(*) FROM wf_meeting_comments WHERE meeting_id = m.id) as comment_count
        FROM wf_meetings m
        LEFT JOIN wf_projects p ON m.project_id = p.id
        LEFT JOIN wf_users a ON m.author_id = a.id
        WHERE m.id = ?
    ');
    $stmt->execute(array($id));
    $meeting = $stmt->fetch();

    if (!$meeting) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    jsonResponse(formatMeeting($meeting, $db, true));
}

/**
 * 회의자료 생성
 */
function createMeeting($db, $user) {
    $input = getJsonInput();

    $title = isset($input['title']) ? trim($input['title']) : '';
    $meetingDate = isset($input['meetingDate']) ? $input['meetingDate'] : null;
    $location = isset($input['location']) ? trim($input['location']) : null;
    $projectId = isset($input['projectId']) ? $input['projectId'] : null;
    $content = isset($input['content']) ? $input['content'] : '';
    $summary = isset($input['summary']) ? trim($input['summary']) : null;
    $status = isset($input['status']) ? $input['status'] : 'DRAFT';
    $attendeeIds = isset($input['attendeeIds']) ? $input['attendeeIds'] : array();

    if (empty($title)) {
        errorResponse('회의 제목은 필수입니다.');
    }

    if (empty($meetingDate)) {
        errorResponse('회의 일시는 필수입니다.');
    }

    $authorId = $user['id'];

    $stmt = $db->prepare('
        INSERT INTO wf_meetings (title, meeting_date, location, project_id, content, summary, status, author_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute(array($title, $meetingDate, $location, $projectId, $content, $summary, $status, $authorId));

    $meetingId = $db->lastInsertId();

    // 참석자 저장
    if (!empty($attendeeIds)) {
        $stmt = $db->prepare('INSERT INTO wf_meeting_attendees (meeting_id, member_id) VALUES (?, ?)');
        foreach ($attendeeIds as $attendeeId) {
            $stmt->execute(array($meetingId, $attendeeId));
        }
    }

    // 생성된 회의자료 조회
    $stmt = $db->prepare('
        SELECT m.*,
               p.name as project_name,
               a.name as author_name,
               a.avatar_url as author_avatar,
               a.department as author_department,
               a.position as author_position,
               0 as attachment_count,
               0 as comment_count
        FROM wf_meetings m
        LEFT JOIN wf_projects p ON m.project_id = p.id
        LEFT JOIN wf_users a ON m.author_id = a.id
        WHERE m.id = ?
    ');
    $stmt->execute(array($meetingId));
    $meeting = $stmt->fetch();

    jsonResponse(formatMeeting($meeting, $db), 201);
}

/**
 * 회의자료 수정
 */
function updateMeeting($db, $id, $user) {
    // 회의자료 존재 및 권한 확인
    $stmt = $db->prepare('SELECT * FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($id));
    $existing = $stmt->fetch();

    if (!$existing) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    // 작성자 본인 또는 관리자만 수정 가능
    if ($existing['author_id'] != $user['id'] && $user['role'] !== 'admin') {
        errorResponse('수정 권한이 없습니다.', 403);
    }

    $input = getJsonInput();

    $updates = array();
    $params = array();

    if (isset($input['title']) && !empty(trim($input['title']))) {
        $updates[] = 'title = ?';
        $params[] = trim($input['title']);
    }

    if (isset($input['meetingDate'])) {
        $updates[] = 'meeting_date = ?';
        $params[] = $input['meetingDate'];
    }

    if (array_key_exists('location', $input)) {
        $updates[] = 'location = ?';
        $params[] = $input['location'];
    }

    if (array_key_exists('projectId', $input)) {
        $updates[] = 'project_id = ?';
        $params[] = $input['projectId'];
    }

    if (array_key_exists('content', $input)) {
        $updates[] = 'content = ?';
        $params[] = $input['content'];
    }

    if (array_key_exists('summary', $input)) {
        $updates[] = 'summary = ?';
        $params[] = $input['summary'];
    }

    if (isset($input['status'])) {
        $updates[] = 'status = ?';
        $params[] = $input['status'];
    }

    // 참석자 업데이트
    if (isset($input['attendeeIds'])) {
        // 기존 참석자 삭제
        $stmt = $db->prepare('DELETE FROM wf_meeting_attendees WHERE meeting_id = ?');
        $stmt->execute(array($id));

        // 새 참석자 추가
        if (!empty($input['attendeeIds'])) {
            $stmt = $db->prepare('INSERT INTO wf_meeting_attendees (meeting_id, member_id) VALUES (?, ?)');
            foreach ($input['attendeeIds'] as $attendeeId) {
                $stmt->execute(array($id, $attendeeId));
            }
        }
    }

    if (!empty($updates)) {
        $params[] = $id;
        $sql = 'UPDATE wf_meetings SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }

    // 업데이트된 회의자료 조회
    $stmt = $db->prepare('
        SELECT m.*,
               p.name as project_name,
               a.name as author_name,
               a.avatar_url as author_avatar,
               a.department as author_department,
               a.position as author_position,
               (SELECT COUNT(*) FROM wf_meeting_attachments WHERE meeting_id = m.id) as attachment_count,
               (SELECT COUNT(*) FROM wf_meeting_comments WHERE meeting_id = m.id) as comment_count
        FROM wf_meetings m
        LEFT JOIN wf_projects p ON m.project_id = p.id
        LEFT JOIN wf_users a ON m.author_id = a.id
        WHERE m.id = ?
    ');
    $stmt->execute(array($id));
    $meeting = $stmt->fetch();

    jsonResponse(formatMeeting($meeting, $db));
}

/**
 * 회의자료 삭제
 */
function deleteMeeting($db, $id, $user) {
    // 회의자료 존재 및 권한 확인
    $stmt = $db->prepare('SELECT * FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($id));
    $existing = $stmt->fetch();

    if (!$existing) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    if ($existing['author_id'] != $user['id'] && $user['role'] !== 'admin') {
        errorResponse('삭제 권한이 없습니다.', 403);
    }

    // 첨부파일 삭제
    $stmt = $db->prepare('SELECT * FROM wf_meeting_attachments WHERE meeting_id = ?');
    $stmt->execute(array($id));
    $attachments = $stmt->fetchAll();

    foreach ($attachments as $attachment) {
        $filePath = UPLOAD_DIR . $id . '/' . $attachment['stored_name'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }

    // 업로드 디렉토리 삭제
    $meetingDir = UPLOAD_DIR . $id;
    if (is_dir($meetingDir)) {
        rmdir($meetingDir);
    }

    // DB에서 삭제 (CASCADE로 관련 데이터도 삭제됨)
    $stmt = $db->prepare('DELETE FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($id));

    jsonResponse(array('success' => true, 'message' => '회의자료가 삭제되었습니다.'));
}

/**
 * 첨부파일 업로드
 */
function uploadAttachments($db, $meetingId, $user) {
    // 회의자료 존재 확인
    $stmt = $db->prepare('SELECT * FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($meetingId));
    $meeting = $stmt->fetch();

    if (!$meeting) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    if (!isset($_FILES['files']) || empty($_FILES['files']['name'][0])) {
        errorResponse('업로드할 파일이 없습니다.');
    }

    // 업로드 디렉토리 생성
    $uploadPath = UPLOAD_DIR . $meetingId . '/';
    if (!is_dir($uploadPath)) {
        mkdir($uploadPath, 0755, true);
    }

    $uploadedFiles = array();
    $files = $_FILES['files'];

    for ($i = 0; $i < count($files['name']); $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }

        $originalName = $files['name'][$i];
        $tmpName = $files['tmp_name'][$i];
        $fileSize = $files['size'][$i];
        $mimeType = $files['type'][$i];

        // 파일명 생성 (UUID + 원본명)
        $storedName = generateToken(32) . '_' . $originalName;
        $filePath = $uploadPath . $storedName;

        if (move_uploaded_file($tmpName, $filePath)) {
            // DB에 저장
            $stmt = $db->prepare('
                INSERT INTO wf_meeting_attachments (meeting_id, file_name, stored_name, file_path, file_size, mime_type)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute(array($meetingId, $originalName, $storedName, '/uploads/meetings/' . $meetingId . '/' . $storedName, $fileSize, $mimeType));

            $attachmentId = $db->lastInsertId();

            $uploadedFiles[] = array(
                'id' => (int)$attachmentId,
                'meetingId' => (int)$meetingId,
                'fileName' => $originalName,
                'storedName' => $storedName,
                'filePath' => '/uploads/meetings/' . $meetingId . '/' . $storedName,
                'fileSize' => (int)$fileSize,
                'mimeType' => $mimeType
            );
        }
    }

    jsonResponse($uploadedFiles);
}

/**
 * 첨부파일 삭제
 */
function deleteAttachment($db, $meetingId, $attachmentId, $user) {
    // 회의자료 존재 및 권한 확인
    $stmt = $db->prepare('SELECT * FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($meetingId));
    $meeting = $stmt->fetch();

    if (!$meeting) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    if ($meeting['author_id'] != $user['id'] && $user['role'] !== 'admin') {
        errorResponse('삭제 권한이 없습니다.', 403);
    }

    // 첨부파일 확인
    $stmt = $db->prepare('SELECT * FROM wf_meeting_attachments WHERE id = ? AND meeting_id = ?');
    $stmt->execute(array($attachmentId, $meetingId));
    $attachment = $stmt->fetch();

    if (!$attachment) {
        errorResponse('첨부파일을 찾을 수 없습니다.', 404);
    }

    // 파일 삭제
    $filePath = UPLOAD_DIR . $meetingId . '/' . $attachment['stored_name'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // DB에서 삭제
    $stmt = $db->prepare('DELETE FROM wf_meeting_attachments WHERE id = ?');
    $stmt->execute(array($attachmentId));

    jsonResponse(array('success' => true, 'message' => '첨부파일이 삭제되었습니다.'));
}

/**
 * 댓글 작성
 */
function addComment($db, $meetingId, $user) {
    // 회의자료 존재 확인
    $stmt = $db->prepare('SELECT * FROM wf_meetings WHERE id = ?');
    $stmt->execute(array($meetingId));
    $meeting = $stmt->fetch();

    if (!$meeting) {
        errorResponse('회의자료를 찾을 수 없습니다.', 404);
    }

    $input = getJsonInput();
    $content = isset($input['content']) ? trim($input['content']) : '';

    if (empty($content)) {
        errorResponse('댓글 내용은 필수입니다.');
    }

    $stmt = $db->prepare('
        INSERT INTO wf_meeting_comments (meeting_id, author_id, content)
        VALUES (?, ?, ?)
    ');
    $stmt->execute(array($meetingId, $user['id'], $content));

    $commentId = $db->lastInsertId();

    // 생성된 댓글 조회
    $stmt = $db->prepare('
        SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
        FROM wf_meeting_comments c
        LEFT JOIN wf_users u ON c.author_id = u.id
        WHERE c.id = ?
    ');
    $stmt->execute(array($commentId));
    $comment = $stmt->fetch();

    jsonResponse(formatComment($comment), 201);
}

/**
 * 댓글 삭제
 */
function deleteComment($db, $meetingId, $commentId, $user) {
    // 댓글 존재 및 권한 확인
    $stmt = $db->prepare('SELECT * FROM wf_meeting_comments WHERE id = ? AND meeting_id = ?');
    $stmt->execute(array($commentId, $meetingId));
    $comment = $stmt->fetch();

    if (!$comment) {
        errorResponse('댓글을 찾을 수 없습니다.', 404);
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    if ($comment['author_id'] != $user['id'] && $user['role'] !== 'admin') {
        errorResponse('삭제 권한이 없습니다.', 403);
    }

    $stmt = $db->prepare('DELETE FROM wf_meeting_comments WHERE id = ?');
    $stmt->execute(array($commentId));

    jsonResponse(array('success' => true, 'message' => '댓글이 삭제되었습니다.'));
}

/**
 * 회의자료 포맷팅
 */
function formatMeeting($m, $db, $includeDetails = false) {
    $meeting = array(
        'id' => (int)$m['id'],
        'title' => $m['title'],
        'meetingDate' => $m['meeting_date'],
        'location' => $m['location'],
        'projectId' => $m['project_id'] ? (int)$m['project_id'] : null,
        'content' => $m['content'],
        'summary' => $m['summary'],
        'status' => $m['status'],
        'authorId' => (int)$m['author_id'],
        'project' => $m['project_id'] ? array(
            'id' => (int)$m['project_id'],
            'name' => $m['project_name']
        ) : null,
        'author' => array(
            'id' => (int)$m['author_id'],
            'name' => $m['author_name'],
            'avatarUrl' => $m['author_avatar'],
            'department' => $m['author_department'],
            'position' => $m['author_position']
        ),
        '_count' => array(
            'attachments' => (int)$m['attachment_count'],
            'comments' => (int)$m['comment_count']
        ),
        'createdAt' => $m['created_at'],
        'updatedAt' => $m['updated_at']
    );

    // 참석자 조회
    $stmt = $db->prepare('
        SELECT u.id, u.name, u.avatar_url, u.department, u.position
        FROM wf_meeting_attendees ma
        JOIN wf_users u ON ma.member_id = u.id
        WHERE ma.meeting_id = ?
    ');
    $stmt->execute(array($m['id']));
    $attendees = $stmt->fetchAll();

    $meeting['attendees'] = array();
    foreach ($attendees as $a) {
        $meeting['attendees'][] = array(
            'id' => (int)$a['id'],
            'name' => $a['name'],
            'avatarUrl' => $a['avatar_url'],
            'department' => $a['department'],
            'position' => $a['position']
        );
    }

    // 상세 조회 시 첨부파일과 댓글도 포함
    if ($includeDetails) {
        // 첨부파일
        $stmt = $db->prepare('SELECT * FROM wf_meeting_attachments WHERE meeting_id = ? ORDER BY uploaded_at DESC');
        $stmt->execute(array($m['id']));
        $attachments = $stmt->fetchAll();

        $meeting['attachments'] = array();
        foreach ($attachments as $att) {
            $meeting['attachments'][] = array(
                'id' => (int)$att['id'],
                'meetingId' => (int)$att['meeting_id'],
                'fileName' => $att['file_name'],
                'storedName' => $att['stored_name'],
                'filePath' => $att['file_path'],
                'fileSize' => (int)$att['file_size'],
                'mimeType' => $att['mime_type'],
                'uploadedAt' => $att['uploaded_at']
            );
        }

        // 댓글
        $stmt = $db->prepare('
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM wf_meeting_comments c
            LEFT JOIN wf_users u ON c.author_id = u.id
            WHERE c.meeting_id = ?
            ORDER BY c.created_at DESC
        ');
        $stmt->execute(array($m['id']));
        $comments = $stmt->fetchAll();

        $meeting['comments'] = array();
        foreach ($comments as $c) {
            $meeting['comments'][] = formatComment($c);
        }
    }

    return $meeting;
}

/**
 * 댓글 포맷팅
 */
function formatComment($c) {
    return array(
        'id' => (int)$c['id'],
        'meetingId' => (int)$c['meeting_id'],
        'authorId' => (int)$c['author_id'],
        'content' => $c['content'],
        'author' => array(
            'id' => (int)$c['author_id'],
            'name' => $c['author_name'],
            'avatarUrl' => $c['author_avatar']
        ),
        'createdAt' => $c['created_at'],
        'updatedAt' => $c['updated_at']
    );
}
