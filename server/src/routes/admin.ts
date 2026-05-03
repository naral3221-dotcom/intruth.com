import { Router, Response } from 'express';
import { authenticate, AuthRequest, checkPermission } from '../middleware/auth.js';
import { getAdminService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

router.use(authenticate, checkPermission('system.manage_settings'));

router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminService = getAdminService();
    const id = req.query.id ? String(req.query.id) : null;
    const result = id ? await adminService.findById(id) : await adminService.findAll();
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminService = getAdminService();
    const result = await adminService.create(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.put('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.query.id ? String(req.query.id) : '';
    const adminService = getAdminService();
    const user = await adminService.update(id, req.body || {});
    res.json({ user });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.delete('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.query.id ? String(req.query.id) : '';
    const adminService = getAdminService();
    await adminService.remove(id, req.member!.id);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminService = getAdminService();
    const tempPassword = await adminService.resetPassword(String(req.body?.userId || ''), req.body?.newPassword);
    res.json({ tempPassword });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
