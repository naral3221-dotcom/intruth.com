/**
 * Attendance Stats Service
 * 출석 통계 관련 비즈니스 로직
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../shared/errors.js';
import {
  getWeekStart,
  getWeeksInMonth,
  countByStatus,
  calculateAttendanceRate,
  calculateTrend,
} from './AttendanceHelper.js';

// Response Types
export interface WeeklyStats {
  cellId: string;
  cellName: string;
  weekStart: string;
  weekEnd: string;
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  onlineCount: number;
  attendanceRate: number;
  previousWeekRate: number;
  trend: 'UP' | 'DOWN' | 'SAME';
}

export interface MemberMonthlyStats {
  memberId: string;
  memberName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onlineCount: number;
  attendanceRate: number;
}

export interface MonthlyStats {
  cellId: string;
  cellName: string;
  year: number;
  month: number;
  weeklyBreakdown: WeeklyStats[];
  averageRate: number;
  bestWeekRate: number;
  worstWeekRate: number;
  totalPresent: number;
  totalAbsent: number;
  memberStats: MemberMonthlyStats[];
}

export interface AbsenteeInfo {
  memberId: string;
  memberName: string;
  memberEmail: string;
  cellId: string;
  cellName: string;
  consecutiveAbsences: number;
  lastAttendDate: string | null;
}

export interface AttendanceSummary {
  totalCells: number;
  totalMembers: number;
  thisWeekRate: number;
  lastWeekRate: number;
  thisMonthRate: number;
  topCells: { cellId: string; cellName: string; rate: number }[];
  needsAttention: AbsenteeInfo[];
}

export interface StatsParams {
  cellId?: string;
  year?: number;
  month?: number;
  weekStart?: Date;
}

export class AttendanceStatsService {
  private readonly defaultAttendanceSelect = {
    id: true,
    cellId: true,
    memberId: true,
    attendDate: true,
    meetingType: true,
    status: true,
    note: true,
    checkedById: true,
    createdAt: true,
    updatedAt: true,
    cell: {
      select: { id: true, name: true, color: true },
    },
    member: {
      select: { id: true, name: true, email: true, avatarUrl: true },
    },
    checkedBy: {
      select: { id: true, name: true },
    },
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * 주간 통계 조회
   */
  async getWeeklyStats(params?: StatsParams): Promise<WeeklyStats[]> {
    const now = new Date();
    const weekStart = params?.weekStart || getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);

    // 셀 목록 조회 (활성 셀만)
    const cellWhere: Prisma.CellWhereInput = { isActive: true };
    if (params?.cellId) cellWhere.id = params.cellId;

    const cells = await this.prisma.cell.findMany({
      where: cellWhere,
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: { where: { isActive: true } },
          },
        },
      },
    });

    const stats: WeeklyStats[] = [];

    for (const cell of cells) {
      // 이번 주 출석
      const thisWeekAttendances = await this.prisma.attendance.findMany({
        where: {
          cellId: cell.id,
          attendDate: { gte: weekStart, lte: weekEnd },
        },
      });

      // 지난 주 출석
      const lastWeekAttendances = await this.prisma.attendance.findMany({
        where: {
          cellId: cell.id,
          attendDate: { gte: previousWeekStart, lte: previousWeekEnd },
        },
      });

      const totalMembers = cell._count.members;

      // 상태별 카운트
      const presentCount = countByStatus(thisWeekAttendances, 'PRESENT');
      const absentCount = countByStatus(thisWeekAttendances, 'ABSENT');
      const lateCount = countByStatus(thisWeekAttendances, 'LATE');
      const excusedCount = countByStatus(thisWeekAttendances, 'EXCUSED');
      const onlineCount = countByStatus(thisWeekAttendances, 'ONLINE');

      // 출석률 계산
      const thisWeekRate = calculateAttendanceRate(thisWeekAttendances, totalMembers);
      const lastWeekRate = calculateAttendanceRate(lastWeekAttendances, totalMembers);

      stats.push({
        cellId: cell.id,
        cellName: cell.name,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalMembers,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        onlineCount,
        attendanceRate: thisWeekRate,
        previousWeekRate: lastWeekRate,
        trend: calculateTrend(thisWeekRate, lastWeekRate),
      });
    }

    return stats.sort((a, b) => b.attendanceRate - a.attendanceRate);
  }

  /**
   * 월간 통계 조회
   */
  async getMonthlyStats(params?: StatsParams): Promise<MonthlyStats[]> {
    const now = new Date();
    const year = params?.year || now.getFullYear();
    const month = params?.month || now.getMonth() + 1;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // 셀 목록 조회
    const cellWhere: Prisma.CellWhereInput = { isActive: true };
    if (params?.cellId) cellWhere.id = params.cellId;

    const cells = await this.prisma.cell.findMany({
      where: cellWhere,
      select: {
        id: true,
        name: true,
        members: {
          where: { isActive: true },
          select: {
            memberId: true,
            member: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const stats: MonthlyStats[] = [];

    for (const cell of cells) {
      // 해당 월의 모든 출석 기록
      const attendances = await this.prisma.attendance.findMany({
        where: {
          cellId: cell.id,
          attendDate: { gte: monthStart, lte: monthEnd },
        },
      });

      // 주차별 통계 계산
      const weeks = getWeeksInMonth(year, month);
      const weeklyBreakdown: WeeklyStats[] = [];

      for (const week of weeks) {
        const weekAttendances = attendances.filter(
          (a) => a.attendDate >= week.start && a.attendDate <= week.end
        );

        const rate = calculateAttendanceRate(weekAttendances, cell.members.length);

        weeklyBreakdown.push({
          cellId: cell.id,
          cellName: cell.name,
          weekStart: week.start.toISOString(),
          weekEnd: week.end.toISOString(),
          totalMembers: cell.members.length,
          presentCount: countByStatus(weekAttendances, 'PRESENT'),
          absentCount: countByStatus(weekAttendances, 'ABSENT'),
          lateCount: countByStatus(weekAttendances, 'LATE'),
          excusedCount: countByStatus(weekAttendances, 'EXCUSED'),
          onlineCount: countByStatus(weekAttendances, 'ONLINE'),
          attendanceRate: rate,
          previousWeekRate: 0,
          trend: 'SAME',
        });
      }

      // 멤버별 통계
      const memberStats: MemberMonthlyStats[] = cell.members.map((m) => {
        const memberAttendances = attendances.filter((a) => a.memberId === m.memberId);
        const presentCount = memberAttendances.filter((a) => a.status === 'PRESENT').length;
        const absentCount = memberAttendances.filter((a) => a.status === 'ABSENT').length;
        const lateCount = memberAttendances.filter((a) => a.status === 'LATE').length;
        const onlineCount = memberAttendances.filter((a) => a.status === 'ONLINE').length;
        const totalMeetings = weeks.length * 2; // 주일 + 셀모임
        const attendedCount = presentCount + lateCount + onlineCount;

        return {
          memberId: m.memberId,
          memberName: m.member.name,
          presentCount,
          absentCount,
          lateCount,
          onlineCount,
          attendanceRate: totalMeetings > 0 ? Math.round((attendedCount / totalMeetings) * 1000) / 10 : 0,
        };
      });

      // 전체 통계
      const rates = weeklyBreakdown.map((w) => w.attendanceRate);
      const totalPresent = attendances.filter((a) => ['PRESENT', 'LATE', 'ONLINE'].includes(a.status)).length;
      const totalAbsent = attendances.filter((a) => a.status === 'ABSENT').length;

      stats.push({
        cellId: cell.id,
        cellName: cell.name,
        year,
        month,
        weeklyBreakdown,
        averageRate: rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : 0,
        bestWeekRate: rates.length > 0 ? Math.max(...rates) : 0,
        worstWeekRate: rates.length > 0 ? Math.min(...rates) : 0,
        totalPresent,
        totalAbsent,
        memberStats: memberStats.sort((a, b) => b.attendanceRate - a.attendanceRate),
      });
    }

    return stats;
  }

  /**
   * 개인 출석 이력 조회
   */
  async getMemberHistory(memberId: string, limit = 20) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true },
    });

    if (!member) {
      throw new NotFoundError('멤버를 찾을 수 없습니다.');
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { memberId },
      select: this.defaultAttendanceSelect,
      orderBy: { attendDate: 'desc' },
      take: limit,
    });

    // 통계 계산
    const stats = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      absent: attendances.filter((a) => a.status === 'ABSENT').length,
      late: attendances.filter((a) => a.status === 'LATE').length,
      excused: attendances.filter((a) => a.status === 'EXCUSED').length,
      online: attendances.filter((a) => a.status === 'ONLINE').length,
    };

    const attendedCount = stats.present + stats.late + stats.online;
    const attendanceRate = stats.total > 0 ? Math.round((attendedCount / stats.total) * 1000) / 10 : 0;

    return {
      member,
      attendances,
      stats: {
        ...stats,
        attendanceRate,
      },
    };
  }

  /**
   * 전체 요약 조회 (대시보드용)
   */
  async getSummary(): Promise<AttendanceSummary> {
    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // 총 셀 수
    const totalCells = await this.prisma.cell.count({ where: { isActive: true } });

    // 총 활성 멤버 수 (중복 제거)
    const uniqueMembers = await this.prisma.cellMember.findMany({
      where: { isActive: true },
      distinct: ['memberId'],
      select: { memberId: true },
    });
    const totalMembers = uniqueMembers.length;

    // 이번 주 통계
    const thisWeekStats = await this.getWeeklyStats({ weekStart: thisWeekStart });
    const thisWeekRate =
      thisWeekStats.length > 0
        ? Math.round((thisWeekStats.reduce((sum, s) => sum + s.attendanceRate, 0) / thisWeekStats.length) * 10) / 10
        : 0;

    // 지난 주 통계
    const lastWeekStats = await this.getWeeklyStats({ weekStart: lastWeekStart });
    const lastWeekRate =
      lastWeekStats.length > 0
        ? Math.round((lastWeekStats.reduce((sum, s) => sum + s.attendanceRate, 0) / lastWeekStats.length) * 10) / 10
        : 0;

    // 이번 달 통계
    const thisMonthStats = await this.getMonthlyStats({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    const thisMonthRate =
      thisMonthStats.length > 0
        ? Math.round((thisMonthStats.reduce((sum, s) => sum + s.averageRate, 0) / thisMonthStats.length) * 10) / 10
        : 0;

    // 상위 셀 (출석률 기준)
    const topCells = thisWeekStats.slice(0, 5).map((s) => ({
      cellId: s.cellId,
      cellName: s.cellName,
      rate: s.attendanceRate,
    }));

    // 주의가 필요한 멤버 (연속 결석자)
    const needsAttention = await this.getAbsentees();

    return {
      totalCells,
      totalMembers,
      thisWeekRate,
      lastWeekRate,
      thisMonthRate,
      topCells,
      needsAttention,
    };
  }

  /**
   * 연속 결석자 목록 조회
   */
  async getAbsentees(consecutiveThreshold = 2): Promise<AbsenteeInfo[]> {
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // 최근 2주간 출석 기록 조회
    const recentAttendances = await this.prisma.attendance.findMany({
      where: {
        attendDate: { gte: twoWeeksAgo },
      },
      orderBy: { attendDate: 'desc' },
    });

    // 멤버별 연속 결석 체크
    const cellMembers = await this.prisma.cellMember.findMany({
      where: { isActive: true },
      select: {
        memberId: true,
        cellId: true,
        member: {
          select: { id: true, name: true, email: true },
        },
        cell: {
          select: { id: true, name: true },
        },
      },
    });

    const absentees: AbsenteeInfo[] = [];

    for (const cm of cellMembers) {
      const memberAttendances = recentAttendances
        .filter((a) => a.memberId === cm.memberId && a.cellId === cm.cellId)
        .sort((a, b) => new Date(b.attendDate).getTime() - new Date(a.attendDate).getTime());

      // 최근 연속 결석 횟수 계산
      let consecutiveAbsences = 0;
      let lastAttendDate: string | null = null;

      for (const attendance of memberAttendances) {
        if (attendance.status === 'ABSENT') {
          consecutiveAbsences++;
        } else if (['PRESENT', 'LATE', 'ONLINE'].includes(attendance.status)) {
          lastAttendDate = attendance.attendDate.toISOString();
          break;
        }
      }

      if (consecutiveAbsences >= consecutiveThreshold) {
        absentees.push({
          memberId: cm.memberId,
          memberName: cm.member.name,
          memberEmail: cm.member.email,
          cellId: cm.cellId,
          cellName: cm.cell.name,
          consecutiveAbsences,
          lastAttendDate,
        });
      }
    }

    return absentees.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);
  }
}
