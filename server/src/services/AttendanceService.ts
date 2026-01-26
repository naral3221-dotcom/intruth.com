/**
 * Attendance Service
 * 출석 CRUD 관련 비즈니스 로직
 *
 * 통계 관련 기능은 AttendanceStatsService로 분리됨
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../shared/errors.js';
import { AttendanceStatsService } from './attendance/AttendanceStatsService.js';
import { getWeekStart } from './attendance/AttendanceHelper.js';

// Types
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'ONLINE';
export type MeetingType = 'SUNDAY_SERVICE' | 'CELL_MEETING';

// Input DTOs
export interface AttendanceListParams {
  cellId?: string;
  memberId?: string;
  meetingType?: MeetingType;
  startDate?: Date;
  endDate?: Date;
}

export interface BulkAttendanceInput {
  cellId: string;
  attendDate: Date;
  meetingType: MeetingType;
  attendances: {
    memberId: string;
    status: AttendanceStatus;
    note?: string;
  }[];
}

export interface UpdateAttendanceInput {
  status?: AttendanceStatus;
  note?: string;
}

// Re-export stats types for convenience
export type {
  StatsParams,
  WeeklyStats,
  MonthlyStats,
  MemberMonthlyStats,
  AbsenteeInfo,
  AttendanceSummary,
} from './attendance/AttendanceStatsService.js';

export class AttendanceService {
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
      select: {
        id: true,
        name: true,
        color: true,
      },
    },
    member: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    },
    checkedBy: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  private statsService: AttendanceStatsService;

  constructor(private prisma: PrismaClient) {
    this.statsService = new AttendanceStatsService(prisma);
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * 출석 기록 목록 조회
   */
  async findAll(params?: AttendanceListParams) {
    const where: Prisma.AttendanceWhereInput = {};

    if (params?.cellId) where.cellId = params.cellId;
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.meetingType) where.meetingType = params.meetingType;
    if (params?.startDate || params?.endDate) {
      where.attendDate = {};
      if (params.startDate) where.attendDate.gte = params.startDate;
      if (params.endDate) where.attendDate.lte = params.endDate;
    }

    return this.prisma.attendance.findMany({
      where,
      select: this.defaultAttendanceSelect,
      orderBy: { attendDate: 'desc' },
    });
  }

  /**
   * 특정 날짜의 셀 출석 현황 조회
   */
  async findByDate(cellId: string, attendDate: Date, meetingType: MeetingType) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    // 해당 날짜의 출석 기록
    const startOfDay = new Date(attendDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        cellId,
        attendDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        meetingType,
      },
      select: this.defaultAttendanceSelect,
    });

    // 셀 활성 구성원 목록
    const members = await this.prisma.cellMember.findMany({
      where: { cellId, isActive: true },
      select: {
        memberId: true,
        role: true,
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 출석 기록이 있는 멤버 ID 목록
    const attendedMemberIds = new Set(attendances.map((a) => a.memberId));

    // 멤버별 출석 상태 맵핑
    const memberAttendances = members.map((m) => {
      const attendance = attendances.find((a) => a.memberId === m.memberId);
      return {
        memberId: m.memberId,
        memberName: m.member.name,
        memberEmail: m.member.email,
        memberAvatar: m.member.avatarUrl,
        role: m.role,
        status: attendance?.status || null,
        note: attendance?.note || null,
        attendanceId: attendance?.id || null,
      };
    });

    return {
      cellId,
      cellName: cell.name,
      attendDate,
      meetingType,
      members: memberAttendances,
      summary: {
        total: members.length,
        checked: attendedMemberIds.size,
        unchecked: members.length - attendedMemberIds.size,
      },
    };
  }

  /**
   * 주간 출석 현황 조회
   */
  async findWeekly(cellId: string, weekStart: Date) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        cellId,
        attendDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: this.defaultAttendanceSelect,
      orderBy: [{ attendDate: 'asc' }, { meetingType: 'asc' }],
    });

    // 멤버별 주간 출석 현황 정리
    const members = await this.prisma.cellMember.findMany({
      where: { cellId, isActive: true },
      select: {
        memberId: true,
        role: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const weeklyData = members.map((m) => {
      const memberAttendances = attendances.filter((a) => a.memberId === m.memberId);
      return {
        memberId: m.memberId,
        memberName: m.member.name,
        role: m.role,
        sundayService: memberAttendances.find((a) => a.meetingType === 'SUNDAY_SERVICE')?.status || null,
        cellMeeting: memberAttendances.find((a) => a.meetingType === 'CELL_MEETING')?.status || null,
      };
    });

    return {
      cellId,
      cellName: cell.name,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      members: weeklyData,
    };
  }

  /**
   * 일괄 출석 체크
   */
  async checkBulk(input: BulkAttendanceInput, checkerId: string) {
    const cell = await this.prisma.cell.findUnique({
      where: { id: input.cellId },
    });

    if (!cell) {
      throw new NotFoundError('셀을 찾을 수 없습니다.');
    }

    // 셀 구성원 확인
    const memberIds = input.attendances.map((a) => a.memberId);
    const cellMembers = await this.prisma.cellMember.findMany({
      where: {
        cellId: input.cellId,
        memberId: { in: memberIds },
        isActive: true,
      },
    });

    const validMemberIds = new Set(cellMembers.map((m) => m.memberId));
    const invalidMembers = memberIds.filter((id) => !validMemberIds.has(id));

    if (invalidMembers.length > 0) {
      throw new ValidationError(`유효하지 않은 셀 구성원이 있습니다: ${invalidMembers.join(', ')}`);
    }

    // upsert로 출석 기록 저장 (이미 있으면 업데이트)
    const results = await Promise.all(
      input.attendances.map((attendance) =>
        this.prisma.attendance.upsert({
          where: {
            cellId_memberId_attendDate_meetingType: {
              cellId: input.cellId,
              memberId: attendance.memberId,
              attendDate: input.attendDate,
              meetingType: input.meetingType,
            },
          },
          create: {
            cellId: input.cellId,
            memberId: attendance.memberId,
            attendDate: input.attendDate,
            meetingType: input.meetingType,
            status: attendance.status,
            note: attendance.note,
            checkedById: checkerId,
          },
          update: {
            status: attendance.status,
            note: attendance.note,
            checkedById: checkerId,
          },
          select: this.defaultAttendanceSelect,
        })
      )
    );

    return results;
  }

  /**
   * 출석 기록 수정
   */
  async update(id: string, input: UpdateAttendanceInput, checkerId: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('출석 기록을 찾을 수 없습니다.');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: input.status,
        note: input.note,
        checkedById: checkerId,
      },
      select: this.defaultAttendanceSelect,
    });
  }

  /**
   * 출석 기록 삭제
   */
  async delete(id: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('출석 기록을 찾을 수 없습니다.');
    }

    await this.prisma.attendance.delete({ where: { id } });
  }

  // ============================================
  // Stats Delegation (통계 기능 위임)
  // ============================================

  /**
   * 주간 통계 조회
   */
  getWeeklyStats(...args: Parameters<AttendanceStatsService['getWeeklyStats']>) {
    return this.statsService.getWeeklyStats(...args);
  }

  /**
   * 월간 통계 조회
   */
  getMonthlyStats(...args: Parameters<AttendanceStatsService['getMonthlyStats']>) {
    return this.statsService.getMonthlyStats(...args);
  }

  /**
   * 개인 출석 이력 조회
   */
  getMemberHistory(...args: Parameters<AttendanceStatsService['getMemberHistory']>) {
    return this.statsService.getMemberHistory(...args);
  }

  /**
   * 전체 요약 조회 (대시보드용)
   */
  getSummary() {
    return this.statsService.getSummary();
  }

  /**
   * 연속 결석자 목록 조회
   */
  getAbsentees(...args: Parameters<AttendanceStatsService['getAbsentees']>) {
    return this.statsService.getAbsentees(...args);
  }
}
