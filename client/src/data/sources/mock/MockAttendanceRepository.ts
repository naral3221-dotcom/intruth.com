/**
 * Mock Attendance Repository
 * IAttendanceRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
import type {
  IAttendanceRepository,
  AttendanceListParams,
  BulkAttendanceDTO,
  UpdateAttendanceDTO,
  StatsParams,
} from '@/domain/repositories/IAttendanceRepository';
import type {
  Attendance,
  DateAttendanceInfo,
  WeeklyAttendanceInfo,
  WeeklyStats,
  MonthlyStats,
  MemberAttendanceHistory,
  AttendanceSummary,
} from '@/domain/entities/Attendance';
import { MockStorage } from './MockStorage';

const STORAGE_KEY = 'workflow_attendances';

// Mock 출석 데이터
const mockAttendances: Attendance[] = [];

export class MockAttendanceRepository implements IAttendanceRepository {
  private storage = MockStorage.getInstance();

  private getAttendances(): Attendance[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[MockAttendanceRepository] Failed to load attendances:', e);
    }
    return [...mockAttendances];
  }

  private saveAttendances(attendances: Attendance[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendances));
  }

  async findAll(params?: AttendanceListParams): Promise<Attendance[]> {
    await this.storage.delay(200);
    let attendances = this.getAttendances();

    if (params?.cellId) {
      attendances = attendances.filter((a) => a.cellId === params.cellId);
    }
    if (params?.memberId) {
      attendances = attendances.filter((a) => a.memberId === params.memberId);
    }
    if (params?.meetingType) {
      attendances = attendances.filter((a) => a.meetingType === params.meetingType);
    }
    if (params?.startDate) {
      attendances = attendances.filter((a) => a.attendDate >= params.startDate!);
    }
    if (params?.endDate) {
      attendances = attendances.filter((a) => a.attendDate <= params.endDate!);
    }

    return attendances;
  }

  async findByDate(
    cellId: string,
    date: string,
    meetingType: 'SUNDAY_SERVICE' | 'CELL_MEETING'
  ): Promise<DateAttendanceInfo> {
    await this.storage.delay(200);

    // Mock 셀 멤버 데이터 가져오기
    const cellMembersStr = localStorage.getItem('workflow_cell_members');
    const cellMembers = cellMembersStr ? JSON.parse(cellMembersStr) : [];
    const cellCellMembers = cellMembers.filter(
      (cm: { cellId: string; isActive: boolean }) => cm.cellId === cellId && cm.isActive
    );

    // 해당 날짜의 출석 데이터
    const attendances = this.getAttendances().filter(
      (a) => a.cellId === cellId && a.attendDate === date && a.meetingType === meetingType
    );

    // 셀 이름 가져오기
    const cellsStr = localStorage.getItem('workflow_cells');
    const cells = cellsStr ? JSON.parse(cellsStr) : [];
    const cell = cells.find((c: { id: string }) => c.id === cellId);

    // 멤버별 출석 정보 조합
    const members = cellCellMembers.map(
      (cm: {
        memberId: string;
        role: string;
        member?: {
          name?: string;
          email?: string;
          avatarUrl?: string;
        };
      }) => {
        const attendance = attendances.find((a) => a.memberId === cm.memberId);
        return {
          memberId: cm.memberId,
          memberName: cm.member?.name || '알 수 없음',
          memberEmail: cm.member?.email || '',
          memberAvatar: cm.member?.avatarUrl,
          role: cm.role,
          status: attendance?.status || null,
          note: attendance?.note,
          attendanceId: attendance?.id,
        };
      }
    );

    const checkedCount = members.filter(
      (m: { status: string | null }) => m.status !== null
    ).length;

    return {
      cellId,
      cellName: cell?.name || '알 수 없음',
      attendDate: date,
      meetingType,
      members,
      summary: {
        total: members.length,
        checked: checkedCount,
        unchecked: members.length - checkedCount,
      },
    };
  }

  async findWeekly(cellId: string, weekStart: string): Promise<WeeklyAttendanceInfo> {
    await this.storage.delay(200);

    const weekEnd = this.addDays(weekStart, 6);

    // Mock 셀 멤버 데이터 가져오기
    const cellMembersStr = localStorage.getItem('workflow_cell_members');
    const cellMembers = cellMembersStr ? JSON.parse(cellMembersStr) : [];
    const cellCellMembers = cellMembers.filter(
      (cm: { cellId: string; isActive: boolean }) => cm.cellId === cellId && cm.isActive
    );

    // 셀 이름 가져오기
    const cellsStr = localStorage.getItem('workflow_cells');
    const cells = cellsStr ? JSON.parse(cellsStr) : [];
    const cell = cells.find((c: { id: string }) => c.id === cellId);

    // 해당 주의 출석 데이터
    const attendances = this.getAttendances().filter(
      (a) => a.cellId === cellId && a.attendDate >= weekStart && a.attendDate <= weekEnd
    );

    const members = cellCellMembers.map(
      (cm: {
        memberId: string;
        role: string;
        member?: {
          name?: string;
        };
      }) => {
        const sundayAttendance = attendances.find(
          (a) => a.memberId === cm.memberId && a.meetingType === 'SUNDAY_SERVICE'
        );
        const cellAttendance = attendances.find(
          (a) => a.memberId === cm.memberId && a.meetingType === 'CELL_MEETING'
        );

        return {
          memberId: cm.memberId,
          memberName: cm.member?.name || '알 수 없음',
          role: cm.role,
          sundayService: sundayAttendance?.status || null,
          cellMeeting: cellAttendance?.status || null,
        };
      }
    );

    return {
      cellId,
      cellName: cell?.name || '알 수 없음',
      weekStart,
      weekEnd,
      members,
    };
  }

  async checkBulk(data: BulkAttendanceDTO): Promise<Attendance[]> {
    await this.storage.delay(300);
    const currentMember = this.storage.getCurrentMember();
    const attendances = this.getAttendances();

    const results: Attendance[] = [];

    for (const item of data.attendances) {
      // 기존 출석 데이터 찾기
      const existingIndex = attendances.findIndex(
        (a) =>
          a.cellId === data.cellId &&
          a.memberId === item.memberId &&
          a.attendDate === data.attendDate &&
          a.meetingType === data.meetingType
      );

      if (existingIndex !== -1) {
        // 업데이트
        attendances[existingIndex] = {
          ...attendances[existingIndex],
          status: item.status,
          note: item.note,
          updatedAt: new Date().toISOString(),
        };
        results.push(attendances[existingIndex]);
      } else {
        // 새로 생성
        const newAttendance: Attendance = {
          id: this.storage.generateId('att'),
          cellId: data.cellId,
          memberId: item.memberId,
          attendDate: data.attendDate,
          meetingType: data.meetingType,
          status: item.status,
          note: item.note,
          checkedById: currentMember.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        attendances.push(newAttendance);
        results.push(newAttendance);
      }
    }

    this.saveAttendances(attendances);
    return results;
  }

  async update(id: string, data: UpdateAttendanceDTO): Promise<Attendance> {
    await this.storage.delay(200);
    const attendances = this.getAttendances();
    const index = attendances.findIndex((a) => a.id === id);

    if (index === -1) {
      throw new Error('출석 데이터를 찾을 수 없습니다.');
    }

    attendances[index] = {
      ...attendances[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.saveAttendances(attendances);
    return attendances[index];
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);
    const attendances = this.getAttendances();
    const index = attendances.findIndex((a) => a.id === id);

    if (index === -1) {
      throw new Error('출석 데이터를 찾을 수 없습니다.');
    }

    attendances.splice(index, 1);
    this.saveAttendances(attendances);
  }

  async getWeeklyStats(params?: StatsParams): Promise<WeeklyStats[]> {
    await this.storage.delay(200);

    // Mock 통계 데이터 반환
    const mockStats: WeeklyStats[] = [
      {
        cellId: params?.cellId || 'cell-1',
        cellName: '청년 1셀',
        weekStart: params?.weekStart || this.getWeekStart(new Date()),
        weekEnd: this.addDays(params?.weekStart || this.getWeekStart(new Date()), 6),
        totalMembers: 8,
        presentCount: 6,
        absentCount: 1,
        lateCount: 1,
        excusedCount: 0,
        onlineCount: 0,
        attendanceRate: 75,
        previousWeekRate: 80,
        trend: 'DOWN',
      },
    ];

    return mockStats;
  }

  async getMonthlyStats(params?: StatsParams): Promise<MonthlyStats[]> {
    await this.storage.delay(200);

    const now = new Date();
    const year = params?.year || now.getFullYear();
    const month = params?.month || now.getMonth() + 1;

    const mockStats: MonthlyStats[] = [
      {
        cellId: params?.cellId || 'cell-1',
        cellName: '청년 1셀',
        year,
        month,
        weeklyBreakdown: [],
        averageRate: 78,
        bestWeekRate: 85,
        worstWeekRate: 70,
        totalPresent: 24,
        totalAbsent: 4,
        memberStats: [],
      },
    ];

    return mockStats;
  }

  async getMemberHistory(memberId: string, limit = 20): Promise<MemberAttendanceHistory> {
    await this.storage.delay(200);

    const attendances = this.getAttendances().filter((a) => a.memberId === memberId);
    const recentAttendances = attendances.slice(0, limit);

    const stats = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      absent: attendances.filter((a) => a.status === 'ABSENT').length,
      late: attendances.filter((a) => a.status === 'LATE').length,
      excused: attendances.filter((a) => a.status === 'EXCUSED').length,
      online: attendances.filter((a) => a.status === 'ONLINE').length,
      attendanceRate:
        attendances.length > 0
          ? Math.round(
              (attendances.filter((a) => a.status === 'PRESENT').length /
                attendances.length) *
                100
            )
          : 0,
    };

    return {
      member: {
        id: memberId,
        name: '알 수 없음',
        email: '',
      },
      attendances: recentAttendances,
      stats,
    };
  }

  async getSummary(): Promise<AttendanceSummary> {
    await this.storage.delay(200);

    // Mock 요약 데이터
    return {
      totalCells: 2,
      totalMembers: 14,
      thisWeekRate: 78,
      lastWeekRate: 82,
      thisMonthRate: 80,
      topCells: [
        { cellId: 'cell-1', cellName: '청년 1셀', rate: 85 },
        { cellId: 'cell-2', cellName: '청년 2셀', rate: 75 },
      ],
      needsAttention: [],
    };
  }

  // Helper methods
  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}
