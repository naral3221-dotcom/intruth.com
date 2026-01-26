/**
 * Attendance Repository 인터페이스
 * 출석 데이터 접근을 위한 추상화 계층
 */
import type {
  Attendance,
  AttendanceStatus,
  MeetingType,
  DateAttendanceInfo,
  WeeklyAttendanceInfo,
  WeeklyStats,
  MonthlyStats,
  MemberAttendanceHistory,
  AttendanceSummary,
} from '../entities/Attendance';

// DTO (Data Transfer Objects)
export interface AttendanceListParams {
  cellId?: string;
  memberId?: string;
  meetingType?: MeetingType;
  startDate?: string;
  endDate?: string;
}

export interface BulkAttendanceDTO {
  cellId: string;
  attendDate: string;
  meetingType: MeetingType;
  attendances: {
    memberId: string;
    status: AttendanceStatus;
    note?: string;
  }[];
}

export interface UpdateAttendanceDTO {
  status?: AttendanceStatus;
  note?: string;
}

export interface StatsParams {
  cellId?: string;
  year?: number;
  month?: number;
  weekStart?: string;
}

// Repository 인터페이스
export interface IAttendanceRepository {
  // Query methods (조회)
  findAll(params?: AttendanceListParams): Promise<Attendance[]>;
  findByDate(cellId: string, date: string, meetingType: MeetingType): Promise<DateAttendanceInfo>;
  findWeekly(cellId: string, weekStart: string): Promise<WeeklyAttendanceInfo>;

  // Command methods (변경)
  checkBulk(data: BulkAttendanceDTO): Promise<Attendance[]>;
  update(id: string, data: UpdateAttendanceDTO): Promise<Attendance>;
  delete(id: string): Promise<void>;

  // Statistics methods (통계)
  getWeeklyStats(params?: StatsParams): Promise<WeeklyStats[]>;
  getMonthlyStats(params?: StatsParams): Promise<MonthlyStats[]>;
  getMemberHistory(memberId: string, limit?: number): Promise<MemberAttendanceHistory>;
  getSummary(): Promise<AttendanceSummary>;
}
