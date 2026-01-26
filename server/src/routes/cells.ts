import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getCellService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

// 셀 목록 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { leaderId, isActive, search } = req.query;
    const cellService = getCellService();

    const cells = await cellService.findAll({
      leaderId: leaderId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
    });

    res.json(cells);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 내가 속한 셀 목록 조회
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const cells = await cellService.getCellsByMemberId(req.user!.id);
    res.json(cells);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const cell = await cellService.findById(req.params.id);
    res.json(cell);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀 생성
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const cell = await cellService.create(req.body);
    res.status(201).json(cell);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀 수정
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const cell = await cellService.update(req.params.id, req.body);
    res.json(cell);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    await cellService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀 구성원 목록 조회
router.get('/:id/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;
    const cellService = getCellService();
    const members = await cellService.getMembers(req.params.id, includeInactive === 'true');
    res.json(members);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀에 구성원 추가
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const member = await cellService.addMember(req.params.id, req.body);
    res.status(201).json(member);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 셀에서 구성원 제거
router.delete('/:id/members/:memberId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    await cellService.removeMember(req.params.id, req.params.memberId);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 구성원 역할 변경
router.patch('/:id/members/:memberId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cellService = getCellService();
    const member = await cellService.updateMemberRole(req.params.id, req.params.memberId, req.body);
    res.json(member);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
