/**
 * Attendance Repository 구현체
 * IAttendanceRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
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
  MeetingType,
  DateAttendanceInfo,
  WeeklyAttendanceInfo,
  WeeklyStats,
  MonthlyStats,
  MemberAttendanceHistory,
  AttendanceSummary,
} from '@/domain/entities/Attendance';
import { AttendanceApiSource } from '../sources/api/AttendanceApiSource';

export class AttendanceRepository implements IAttendanceRepository {
  constructor(private readonly apiSource: AttendanceApiSource) {}

  async findAll(params?: AttendanceListParams): Promise<Attendance[]> {
    return this.apiSource.list({
      cellId: params?.cellId,
      memberId: params?.memberId,
      meetingType: params?.meetingType,
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
  }

  async findByDate(cellId: string, date: string, meetingType: MeetingType): Promise<DateAttendanceInfo> {
    return this.apiSource.getByDate(cellId, date, meetingType);
  }

  async findWeekly(cellId: string, weekStart: string): Promise<WeeklyAttendanceInfo> {
    return this.apiSource.getWeekly(cellId, weekStart);
  }

  async checkBulk(data: BulkAttendanceDTO): Promise<Attendance[]> {
    return this.apiSource.checkBulk({
      cellId: data.cellId,
      attendDate: data.attendDate,
      meetingType: data.meetingType,
      attendances: data.attendances,
    });
  }

  async update(id: string, data: UpdateAttendanceDTO): Promise<Attendance> {
    return this.apiSource.update(id, {
      status: data.status,
      note: data.note,
    });
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async getWeeklyStats(params?: StatsParams): Promise<WeeklyStats[]> {
    return this.apiSource.getWeeklyStats({
      cellId: params?.cellId,
      weekStart: params?.weekStart,
    });
  }

  async getMonthlyStats(params?: StatsParams): Promise<MonthlyStats[]> {
    return this.apiSource.getMonthlyStats({
      cellId: params?.cellId,
      year: params?.year,
      month: params?.month,
    });
  }

  async getMemberHistory(memberId: string, limit = 20): Promise<MemberAttendanceHistory> {
    return this.apiSource.getMemberHistory(memberId, limit);
  }

  async getSummary(): Promise<AttendanceSummary> {
    return this.apiSource.getSummary();
  }
}
