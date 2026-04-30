import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getDashboardService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

// 전체 요약 통계
router.get('/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dashboardService = getDashboardService();
    const summary = await dashboardService.getSummary();
    res.json(summary);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 내 업무 현황
router.get('/my-tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const dashboardService = getDashboardService();

    const tasks = await dashboardService.getMyTasks(
      req.member!.id,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 내 지연된 업무
router.get('/my-overdue', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dashboardService = getDashboardService();
    const tasks = await dashboardService.getMyOverdueTasks(req.member!.id);
    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 내 다가오는 업무
router.get('/my-upcoming', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { days } = req.query;
    const dashboardService = getDashboardService();

    const tasks = await dashboardService.getMyUpcomingTasks(
      req.member!.id,
      days ? parseInt(days as string, 10) : 7
    );

    res.json(tasks);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 팀 진행 현황
router.get('/team-progress', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dashboardService = getDashboardService();
    const progress = await dashboardService.getTeamProgress();
    res.json(progress);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 멤버별 진행 현황
router.get('/member-progress/:memberId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dashboardService = getDashboardService();
    const progress = await dashboardService.getMemberProgress(req.params.memberId);

    if (!progress) {
      res.status(404).json({ error: '멤버 진행 현황을 찾을 수 없습니다.' });
      return;
    }

    res.json(progress);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트별 진행 현황
router.get('/projects-progress', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dashboardService = getDashboardService();
    const progress = await dashboardService.getProjectsProgress();
    res.json(progress);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 최근 활동
router.get('/recent-activities', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const dashboardService = getDashboardService();

    const activities = await dashboardService.getRecentActivities(
      limit ? parseInt(limit as string, 10) : 20
    );

    res.json(activities);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
