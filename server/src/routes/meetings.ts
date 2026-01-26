import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getMeetingService } from '../di/container.js';
import { handleError } from '../shared/errors.js';
import { ValidationError } from '../shared/errors.js';
import multer from 'multer';

const router = Router();

// Multer 설정 - 메모리 스토리지 사용
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 회의자료 목록
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, authorId, attendeeId, status, startDate, endDate, search } = req.query;
    const meetingService = getMeetingService();

    const meetings = await meetingService.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      authorId: authorId ? Number(authorId) : undefined,
      attendeeId: attendeeId ? Number(attendeeId) : undefined,
      status: status as 'DRAFT' | 'PUBLISHED' | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: search as string | undefined,
    });

    res.json(meetings);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 회의자료 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();
    const meeting = await meetingService.findById(Number(req.params.id));
    res.json(meeting);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 회의자료 생성
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, meetingDate, location, projectId, content, contentType, summary, attendeeIds, status, agendas, actionItems } = req.body;
    const meetingService = getMeetingService();

    const meeting = await meetingService.create(
      {
        title,
        meetingDate: new Date(meetingDate),
        location,
        projectId: projectId ? Number(projectId) : null,
        content,
        contentType,
        summary,
        attendeeIds: attendeeIds?.map(Number),
        status,
        agendas,
        actionItems: actionItems?.map((item: any) => ({
          ...item,
          assigneeId: item.assigneeId ? Number(item.assigneeId) : undefined,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        })),
      },
      Number(req.member!.id)
    );

    res.status(201).json(meeting);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 회의자료 수정
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, meetingDate, location, projectId, content, contentType, summary, attendeeIds, status } = req.body;
    const meetingService = getMeetingService();

    const meeting = await meetingService.update(
      Number(req.params.id),
      {
        title,
        meetingDate: meetingDate ? new Date(meetingDate) : undefined,
        location,
        projectId: projectId !== undefined ? (projectId ? Number(projectId) : null) : undefined,
        content,
        contentType,
        summary,
        attendeeIds: attendeeIds?.map(Number),
        status,
      },
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.json(meeting);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 회의자료 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();

    await meetingService.delete(Number(req.params.id), {
      id: req.member!.id,
      permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
    });

    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 첨부파일 업로드
router.post('/:id/attachments', authenticate, upload.array('files', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const meetingId = Number(req.params.id);

    if (!files || files.length === 0) {
      throw new ValidationError('파일이 없습니다.');
    }

    const meetingService = getMeetingService();

    const uploadedFiles = files.map((file) => ({
      buffer: file.buffer,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    const attachments = await meetingService.uploadAttachments(meetingId, uploadedFiles);

    res.status(201).json(attachments);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 첨부파일 삭제
router.delete('/:id/attachments/:attachmentId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();

    await meetingService.deleteAttachment(
      Number(req.params.id),
      Number(req.params.attachmentId),
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 댓글 목록
router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();
    const comments = await meetingService.getComments(Number(req.params.id));
    res.json(comments);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 댓글 작성
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    const meetingService = getMeetingService();

    const comment = await meetingService.createComment(
      Number(req.params.id),
      content,
      Number(req.member!.id)
    );

    res.status(201).json(comment);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 댓글 삭제
router.delete('/:id/comments/:commentId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();

    await meetingService.deleteComment(Number(req.params.commentId), {
      id: req.member!.id,
      permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
    });

    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// ==================== 안건 (Agenda) 라우트 ====================

// 안건 목록 조회
router.get('/:id/agendas', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();
    const agendas = await meetingService.getAgendas(Number(req.params.id));
    res.json(agendas);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 안건 추가
router.post('/:id/agendas', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, duration, presenter, order } = req.body;
    const meetingService = getMeetingService();

    const agenda = await meetingService.createAgenda(
      Number(req.params.id),
      { title, description, duration, presenter, order },
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.status(201).json(agenda);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 안건 수정
router.put('/:id/agendas/:agendaId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, duration, presenter, order, status } = req.body;
    const meetingService = getMeetingService();

    const agenda = await meetingService.updateAgenda(
      Number(req.params.agendaId),
      { title, description, duration, presenter, order, status },
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.json(agenda);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 안건 삭제
router.delete('/:id/agendas/:agendaId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();

    await meetingService.deleteAgenda(Number(req.params.agendaId), {
      id: req.member!.id,
      permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
    });

    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 안건 순서 변경
router.put('/:id/agendas/reorder', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { agendaIds } = req.body;
    const meetingService = getMeetingService();

    const agendas = await meetingService.reorderAgendas(
      Number(req.params.id),
      agendaIds.map(Number),
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.json(agendas);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// ==================== 액션 아이템 (ActionItem) 라우트 ====================

// 액션 아이템 목록 조회
router.get('/:id/action-items', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();
    const actionItems = await meetingService.getActionItems(Number(req.params.id));
    res.json(actionItems);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 액션 아이템 추가
router.post('/:id/action-items', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, assigneeId, dueDate, priority } = req.body;
    const meetingService = getMeetingService();

    const actionItem = await meetingService.createActionItem(
      Number(req.params.id),
      {
        title,
        description,
        assigneeId: assigneeId ? Number(assigneeId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
      },
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.status(201).json(actionItem);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 액션 아이템 수정
router.put('/:id/action-items/:actionItemId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, assigneeId, dueDate, priority, status } = req.body;
    const meetingService = getMeetingService();

    const actionItem = await meetingService.updateActionItem(
      Number(req.params.actionItemId),
      {
        title,
        description,
        assigneeId: assigneeId !== undefined ? (assigneeId ? Number(assigneeId) : undefined) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        status,
      },
      {
        id: req.member!.id,
        permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
      }
    );

    res.json(actionItem);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 액션 아이템 삭제
router.delete('/:id/action-items/:actionItemId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetingService = getMeetingService();

    await meetingService.deleteActionItem(Number(req.params.actionItemId), {
      id: req.member!.id,
      permissions: req.member!.permissions as Record<string, Record<string, boolean>> | undefined,
    });

    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
