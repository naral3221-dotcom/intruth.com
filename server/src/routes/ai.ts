import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, checkPermission, AuthRequest } from '../middleware/auth.js';
import { getAiAssistantService, getAiTranscriptionService, getMeetingService, getTaskService } from '../di/container.js';
import { handleError, ValidationError } from '../shared/errors.js';

const router = Router();
const taskPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function memberContext(req: AuthRequest) {
  return {
    id: req.member!.id,
    permissions: req.member!.permissions as unknown as Record<string, Record<string, boolean>> | undefined,
  };
}

router.get('/meetings/:meetingId/recordings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const recordings = await service.listRecordings(Number(req.params.meetingId), memberContext(req));
    res.json(recordings);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post(
  '/meetings/:meetingId/recordings',
  authenticate,
  audioUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        throw new ValidationError('녹음 파일이 없습니다.');
      }

      const service = getAiTranscriptionService();
      const recording = await service.uploadRecording(
        Number(req.params.meetingId),
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        memberContext(req)
      );

      res.status(201).json(recording);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      res.status(statusCode).json(body);
    }
  }
);

router.post('/recordings/:recordingId/transcribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const recording = await service.transcribeRecording(Number(req.params.recordingId), memberContext(req));
    res.json(recording);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/meetings/:meetingId/materials', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const meetingId = Number(req.params.meetingId);
    const result = await service.generateMeetingMaterials(meetingId, memberContext(req), {
      recordingId: req.body?.recordingId ? Number(req.body.recordingId) : undefined,
      applyToMeeting: req.body?.applyToMeeting !== false,
      replaceActionItems: req.body?.replaceActionItems === true,
    });

    const meeting = await getMeetingService().findById(meetingId);
    res.json({ ...result, meeting });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.get('/meetings/:meetingId/material-drafts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const drafts = await service.listMeetingMaterialDrafts(Number(req.params.meetingId), memberContext(req));
    res.json(drafts);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/meetings/:meetingId/material-drafts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const result = await service.createMeetingMaterialDraft(Number(req.params.meetingId), memberContext(req), {
      recordingId: req.body?.recordingId ? Number(req.body.recordingId) : undefined,
    });
    res.status(201).json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/material-drafts/:draftId/apply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const result = await service.applyMeetingMaterialDraft(Number(req.params.draftId), memberContext(req), {
      replaceActionItems: req.body?.replaceActionItems === true,
    });
    const meeting = await getMeetingService().findById(result.meetingId);
    res.json({ ...result, meeting });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/material-drafts/:draftId/discard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const draft = await service.discardMeetingMaterialDraft(Number(req.params.draftId), memberContext(req));
    res.json(draft);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post(
  '/meetings/:meetingId/action-items/tasks',
  authenticate,
  checkPermission('task.create'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const meetingId = Number(req.params.meetingId);
      const actionItemIds = Array.isArray(req.body?.actionItemIds) ? req.body.actionItemIds.map(Number) : [];
      const overrides = Array.isArray(req.body?.overrides)
        ? req.body.overrides.map((item: any) => {
          const actionItemId = Number(item?.actionItemId);

          if (!Number.isInteger(actionItemId) || actionItemId <= 0) {
            throw new ValidationError('업무 후보 편집값의 회의 할 일 ID가 올바르지 않습니다.');
          }

          const override: {
            actionItemId: number;
            title?: string;
            description?: string | null;
            priority?: string;
            assigneeId?: string | null;
            dueDate?: Date | null;
          } = { actionItemId };

          if (Object.prototype.hasOwnProperty.call(item, 'title')) {
            override.title = String(item.title || '');
          }

          if (Object.prototype.hasOwnProperty.call(item, 'description')) {
            override.description = item.description == null ? null : String(item.description);
          }

          if (Object.prototype.hasOwnProperty.call(item, 'assigneeId')) {
            override.assigneeId = item.assigneeId ? String(item.assigneeId) : null;
          }

          if (Object.prototype.hasOwnProperty.call(item, 'dueDate')) {
            if (item.dueDate) {
              const dueDate = new Date(String(item.dueDate));
              if (Number.isNaN(dueDate.getTime())) {
                throw new ValidationError('업무 후보 마감일 형식이 올바르지 않습니다.');
              }
              override.dueDate = dueDate;
            } else {
              override.dueDate = null;
            }
          }

          if (Object.prototype.hasOwnProperty.call(item, 'priority')) {
            if (!taskPriorities.has(String(item.priority))) {
              throw new ValidationError('업무 후보 우선순위가 올바르지 않습니다.');
            }
            override.priority = String(item.priority);
          }

          return override;
        })
        : undefined;
      const taskService = getTaskService();
      const result = await taskService.createFromMeetingActionItems({
        meetingId,
        actionItemIds,
        overrides,
        reporterId: req.member!.id,
        member: memberContext(req),
      });
      const meeting = await getMeetingService().findById(meetingId);
      res.status(201).json({ ...result, meeting });
    } catch (error) {
      const { statusCode, body } = handleError(error);
      res.status(statusCode).json(body);
    }
  }
);

router.post('/assistant/ask', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const result = await service.ask(memberContext(req), {
      prompt: String(req.body?.prompt || ''),
      scope: req.body?.scope
        ? {
          type: req.body.scope.type,
          id: req.body.scope.id,
        }
        : undefined,
    });
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.get('/assistant/command-messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const messages = await service.listCommandMessages(
      memberContext(req),
      req.query.limit ? Number(req.query.limit) : undefined
    );
    res.json(messages);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/assistant/command-messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const message = await service.recordCommandMessage(memberContext(req), {
      role: req.body?.role,
      content: req.body?.content,
      route: req.body?.route,
      metadata: req.body?.metadata,
    });
    res.status(201).json(message);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.delete('/assistant/command-messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const result = await service.clearCommandMessages(memberContext(req));
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.get('/assistant/runs', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const runs = await service.listRecentRuns(memberContext(req), req.query.limit ? Number(req.query.limit) : undefined);
    res.json(runs);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.get('/assistant/actions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const actions = await service.listAgentActions(memberContext(req), req.query.limit ? Number(req.query.limit) : undefined);
    res.json(actions);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post(
  '/assistant/task-drafts',
  authenticate,
  checkPermission('task.create'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const service = getAiAssistantService();
      const result = await service.createTaskDraftAction(memberContext(req), {
        prompt: String(req.body?.prompt || ''),
        scope: req.body?.scope
          ? {
            type: req.body.scope.type,
            id: req.body.scope.id,
          }
          : undefined,
      });
      res.status(201).json(result);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      res.status(statusCode).json(body);
    }
  }
);

router.post('/assistant/tool-plan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const result = await service.createToolPlanAction(memberContext(req), {
      prompt: String(req.body?.prompt || ''),
      scope: req.body?.scope
        ? {
          type: req.body.scope.type,
          id: req.body.scope.id,
        }
        : undefined,
    });
    res.status(201).json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post(
  '/assistant/actions/:actionId/approve',
  authenticate,
  checkPermission('task.create'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const service = getAiAssistantService();
      const result = await service.approveAgentAction(Number(req.params.actionId), memberContext(req));
      res.status(201).json(result);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      res.status(statusCode).json(body);
    }
  }
);

router.post('/assistant/actions/:actionId/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiAssistantService();
    const action = await service.rejectAgentAction(Number(req.params.actionId), memberContext(req));
    res.json(action);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
