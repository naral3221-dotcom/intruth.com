import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getAttendanceService } from '../di/container.js';
import { handleError } from '../shared/errors.js';
import type { MeetingType } from '../services/AttendanceService.js';

const router = Router();

// 출석 기록 목록 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cellId, memberId, meetingType, startDate, endDate } = req.query;
    const attendanceService = getAttendanceService();

    const attendances = await attendanceService.findAll({
      cellId: cellId as string,
      memberId: memberId as string,
      meetingType: meetingType as MeetingType,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(attendances);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 특정 날짜의 셀 출석 현황 조회
router.get('/date/:cellId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cellId } = req.params;
    const { date, meetingType } = req.query;
    const attendanceService = getAttendanceService();

    const result = await attendanceService.findByDate(
      cellId,
      date ? new Date(date as string) : new Date(),
      (meetingType as MeetingType) || 'SUNDAY_SERVICE'
    );

    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 주간 출석 현황 조회
router.get('/weekly/:cellId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cellId } = req.params;
    const { weekStart } = req.query;
    const attendanceService = getAttendanceService();

    const result = await attendanceService.findWeekly(
      cellId,
      weekStart ? new Date(weekStart as string) : getWeekStart(new Date())
    );

    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 일괄 출석 체크
router.post('/check', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attendanceService = getAttendanceService();
    const { cellId, attendDate, meetingType, attendances } = req.body;

    const result = await attendanceService.checkBulk(
      {
        cellId,
        attendDate: new Date(attendDate),
        meetingType,
        attendances,
      },
      req.user!.id
    );

    res.status(201).json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 출석 기록 수정
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attendanceService = getAttendanceService();
    const result = await attendanceService.update(req.params.id, req.body, req.user!.id);
    res.json(result);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 출석 기록 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attendanceService = getAttendanceService();
    await attendanceService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// ==================== 통계 API ====================

// 주간 통계
router.get('/stats/weekly', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cellId, weekStart } = req.query;
    const attendanceService = getAttendanceService();

    const stats = await attendanceService.getWeeklyStats({
      cellId: cellId as string,
      weekStart: weekStart ? new Date(weekStart as string) : undefined,
    });

    res.json(stats);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 월간 통계
router.get('/stats/monthly', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cellId, year, month } = req.query;
    const attendanceService = getAttendanceService();

    const stats = await attendanceService.getMonthlyStats({
      cellId: cellId as string,
      year: year ? parseInt(year as string, 10) : undefined,
      month: month ? parseInt(month as string, 10) : undefined,
    });

    res.json(stats);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 개인 출석 이력
router.get('/stats/member/:memberId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const attendanceService = getAttendanceService();

    const history = await attendanceService.getMemberHistory(
      req.params.memberId,
      limit ? parseInt(limit as string, 10) : 20
    );

    res.json(history);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 전체 요약 (대시보드용)
router.get('/stats/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attendanceService = getAttendanceService();
    const summary = await attendanceService.getSummary();
    res.json(summary);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 헬퍼 함수
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default router;
