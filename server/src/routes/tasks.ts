import { Router, Response } from 'express';
import { authenticate, checkPermission, AuthRequest } from '../middleware/auth.js';
import { getTaskService } from '../di/container.js';
import { handleError, NotFoundError } from '../shared/errors.js';

const router = Router();

// 업무 목록 (프로젝트별)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, status, assigneeId } = req.query;
    const taskService = getTaskService();

    const tasks = await taskService.findAll({
      projectId: projectId as string,
      status: status as string,
      assigneeId: assigneeId as string,
    });

    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 생성
router.post('/', authenticate, checkPermission('task.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, title, description, priority, assigneeId, startDate, dueDate, parentId, folderUrl } = req.body;
    const taskService = getTaskService();

    const task = await taskService.create({
      projectId,
      title,
      description,
      priority,
      assigneeId,
      reporterId: req.member!.id,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      parentId,
      folderUrl,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error);
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskService = getTaskService();
    const task = await taskService.findById(req.params.id);
    res.json(task);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 수정
router.put('/:id', authenticate, checkPermission('task.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, assigneeId, startDate, dueDate, estimatedHours, actualHours, folderUrl } = req.body;
    const taskService = getTaskService();

    const task = await taskService.update(
      req.params.id,
      {
        title,
        description,
        priority,
        assigneeId,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
        actualHours,
        folderUrl,
      },
      req.member!.id
    );

    res.json(task);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 상태 변경 (칸반 이동)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, order } = req.body;
    const taskService = getTaskService();

    const task = await taskService.updateStatus(
      req.params.id,
      { status: status as string, order },
      req.member!.id
    );

    res.json(task);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 순서 변경
router.patch('/:id/order', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { order } = req.body;
    const taskService = getTaskService();

    const task = await taskService.updateOrder(req.params.id, order);

    res.json(task);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 업무 삭제
router.delete('/:id', authenticate, checkPermission('task.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskService = getTaskService();
    await taskService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 여러 업무 일괄 삭제
router.post('/batch/delete', authenticate, checkPermission('task.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    const taskService = getTaskService();
    const deletedCount = await taskService.deleteMany(ids);
    res.json({ deletedCount });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 여러 업무 일괄 수정
router.post('/batch/update', authenticate, checkPermission('task.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, data } = req.body;
    const taskService = getTaskService();

    const tasks = await taskService.updateMany(
      ids,
      {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeId: data.assigneeId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        folderUrl: data.folderUrl,
      },
      req.member!.id
    );

    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 댓글 목록
router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskService = getTaskService();
    // findById로 업무 확인 후 댓글 반환
    const task = await taskService.findById(req.params.id);
    res.json(task.comments || []);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 댓글 작성
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    const taskService = getTaskService();

    const comment = await taskService.addComment(
      req.params.id,
      req.member!.id,
      content
    );

    res.status(201).json(comment);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 활동 로그 조회
router.get('/:id/activities', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskService = getTaskService();
    const activities = await taskService.getActivities(req.params.id);
    res.json(activities);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
