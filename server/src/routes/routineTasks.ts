import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json([]);
});

router.get('/:id', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(404).json({ error: 'Routine task not found.' });
});

router.post('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Routine task write API is not ready yet.' });
});

router.put('/:id', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Routine task write API is not ready yet.' });
});

router.patch('/:id/complete', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Routine task completion API is not ready yet.' });
});

router.patch('/:id/uncomplete', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Routine task completion API is not ready yet.' });
});

router.delete('/:id', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Routine task write API is not ready yet.' });
});

export default router;
