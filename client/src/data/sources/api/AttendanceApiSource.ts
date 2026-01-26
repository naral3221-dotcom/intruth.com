/**
 * Attendance API Source
 * Attendance 관련 API 호출을 담당하는 클래스
 */
import type { HttpClient } from './HttpClient';
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
} from '@/domain/entities/Attendance';

export interface AttendanceApiListParams {
  cellId?: string;
  memberId?: string;
  meetingType?: MeetingType;
  startDate?: string;
  endDate?: string;
}

export interface BulkAttendanceInput {
  cellId: string;
  attendDate: string;
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

export interface StatsApiParams {
  cellId?: string;
  year?: number;
  month?: number;
  weekStart?: string;
}

export class AttendanceApiSource {
  constructor(private httpClient: HttpClient) {}

  // 출석 기록 목록 조회
  async list(params?: AttendanceApiListParams): Promise<Attendance[]> {
    const searchParams = new URLSearchParams();
    if (params?.cellId) searchParams.set('cellId', params.cellId);
    if (params?.memberId) searchParams.set('memberId', params.memberId);
    if (params?.meetingType) searchParams.set('meetingType', params.meetingType);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return this.httpClient.get<Attendance[]>(`/attendance${query ? `?${query}` : ''}`);
  }

  // 특정 날짜의 셀 출석 현황 조회
  async getByDate(cellId: string, date: string, meetingType: MeetingType): Promise<DateAttendanceInfo> {
    const params = new URLSearchParams();
    params.set('date', date);
    params.set('meetingType', meetingType);
    return this.httpClient.get<DateAttendanceInfo>(`/attendance/date/${cellId}?${params.toString()}`);
  }

  // 주간 출석 현황 조회
  async getWeekly(cellId: string, weekStart: string): Promise<WeeklyAttendanceInfo> {
    return this.httpClient.get<WeeklyAttendanceInfo>(`/attendance/weekly/${cellId}?weekStart=${weekStart}`);
  }

  // 일괄 출석 체크
  async checkBulk(data: BulkAttendanceInput): Promise<Attendance[]> {
    return this.httpClient.post<Attendance[]>('/attendance/check', data);
  }

  // 출석 기록 수정
  async update(id: string, data: UpdateAttendanceInput): Promise<Attendance> {
    return this.httpClient.put<Attendance>(`/attendance/${id}`, data);
  }

  // 출석 기록 삭제
  async delete(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/attendance/${id}`);
  }

  // ==================== 통계 API ====================

  // 주간 통계
  async getWeeklyStats(params?: StatsApiParams): Promise<WeeklyStats[]> {
    const searchParams = new URLSearchParams();
    if (params?.cellId) searchParams.set('cellId', params.cellId);
    if (params?.weekStart) searchParams.set('weekStart', params.weekStart);
    const query = searchParams.toString();
    return this.httpClient.get<WeeklyStats[]>(`/attendance/stats/weekly${query ? `?${query}` : ''}`);
  }

  // 월간 통계
  async getMonthlyStats(params?: StatsApiParams): Promise<MonthlyStats[]> {
    const searchParams = new URLSearchParams();
    if (params?.cellId) searchParams.set('cellId', params.cellId);
    if (params?.year) searchParams.set('year', String(params.year));
    if (params?.month) searchParams.set('month', String(params.month));
    const query = searchParams.toString();
    return this.httpClient.get<MonthlyStats[]>(`/attendance/stats/monthly${query ? `?${query}` : ''}`);
  }

  // 개인 출석 이력
  async getMemberHistory(memberId: string, limit = 20): Promise<MemberAttendanceHistory> {
    return this.httpClient.get<MemberAttendanceHistory>(`/attendance/stats/member/${memberId}?limit=${limit}`);
  }

  // 전체 요약 (대시보드용)
  async getSummary(): Promise<AttendanceSummary> {
    return this.httpClient.get<AttendanceSummary>('/attendance/stats/summary');
  }
}
