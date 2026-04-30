import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const emptyStats = (teamId: string) => ({
  teamId,
  memberCount: 0,
  projectCount: 0,
  taskStats: {
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
    total: 0,
  },
});

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, action } = req.query;

  if (action === 'stats') {
    res.json(id ? emptyStats(String(id)) : []);
    return;
  }

  if (action === 'members') {
    res.json([]);
    return;
  }

  if (id) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  res.json([]);
});

router.post('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Team write API is not ready yet.' });
});

router.put('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Team write API is not ready yet.' });
});

router.patch('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Team write API is not ready yet.' });
});

router.delete('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Team write API is not ready yet.' });
});

export default router;
