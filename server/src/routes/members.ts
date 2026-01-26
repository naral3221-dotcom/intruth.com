import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getMemberService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

// 팀원 목록
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, position, search } = req.query;
    const memberService = getMemberService();

    const members = await memberService.findAll({
      department: department as string,
      position: position as string,
      search: search as string,
    });

    res.json(members);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 팀원 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberService = getMemberService();
    const member = await memberService.findById(req.params.id);
    res.json(member);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 팀원별 업무
router.get('/:id/tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberService = getMemberService();
    const tasks = await memberService.getTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 팀원 업무량
router.get('/:id/workload', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberService = getMemberService();
    const workload = await memberService.getWorkload(req.params.id);
    res.json(workload);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
