import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getAuthService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

// 로그인
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, id, loginId, password } = req.body;
    const authService = getAuthService();

    const result = await authService.login({ username: username || id || loginId, password });
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 현재 사용자 정보
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authService = getAuthService();
    const member = await authService.getCurrentMember(req.member!.id);
    res.json(member);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 비밀번호 변경
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authService = getAuthService();

    await authService.changePassword(req.member!.id, { currentPassword, newPassword });
    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
