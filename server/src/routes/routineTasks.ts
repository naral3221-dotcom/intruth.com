import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getRoutineTaskService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

function toBoolean(value: unknown) {
  return value === '1' || value === 'true' || value === true;
}

function toDayOfWeek(value: unknown) {
  if (value === undefined) return undefined;
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : undefined;
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const routines = await service.findAll(req.member!, {
      personal: toBoolean(req.query.personal),
      all: toBoolean(req.query.all),
      dayOfWeek: toDayOfWeek(req.query.dayOfWeek),
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
    });
    res.json(routines);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const routine = await service.findById(req.params.id, req.member!);
    res.json(routine);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const routine = await service.create(req.member!, req.body);
    res.status(201).json(routine);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const routine = await service.update(req.params.id, req.member!, req.body);
    res.json(routine);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const result = await service.complete(req.params.id, req.member!);
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.patch('/:id/uncomplete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    const result = await service.uncomplete(req.params.id, req.member!);
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getRoutineTaskService();
    await service.delete(req.params.id, req.member!);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
