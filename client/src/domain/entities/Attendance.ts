/**
 * Attendance (출석) 엔티티 정의
 */
import type { Member } from '@/types';
import type { Cell } from './Cell';

// 출석 상태
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'ONLINE';

// 모임 유형
export type MeetingType = 'SUNDAY_SERVICE' | 'CELL_MEETING';

// 출석 기록 엔티티
export interface Attendance {
  id: string;
  cellId: string;
  memberId: string;
  attendDate: string;
  meetingType: MeetingType;
  status: AttendanceStatus;
  note?: string;
  checkedById: string;
  createdAt: string;
  updatedAt: string;
  cell?: Pick<Cell, 'id' | 'name' | 'color'>;
  member?: Pick<Member, 'id' | 'name' | 'email' | 'avatarUrl'>;
  checkedBy?: Pick<Member, 'id' | 'name'>;
}

// 날짜별 출석 현황 (출석 체크 UI용)
export interface DateAttendanceInfo {
  cellId: string;
  cellName: string;
  attendDate: string;
  meetingType: MeetingType;
  members: MemberAttendanceInfo[];
  summary: {
    total: number;
    checked: number;
    unchecked: number;
  };
}

export interface MemberAttendanceInfo {
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberAvatar?: string;
  role: string;
  status: AttendanceStatus | null;
  note?: string;
  attendanceId?: string;
}

// 주간 출석 현황
export interface WeeklyAttendanceInfo {
  cellId: string;
  cellName: string;
  weekStart: string;
  weekEnd: string;
  members: WeeklyMemberAttendance[];
}

export interface WeeklyMemberAttendance {
  memberId: string;
  memberName: string;
  role: string;
  sundayService: AttendanceStatus | null;
  cellMeeting: AttendanceStatus | null;
}

// ==================== 통계 타입 ====================

// 주간 통계
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

// 월간 통계
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

export interface MemberMonthlyStats {
  memberId: string;
  memberName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onlineCount: number;
  attendanceRate: number;
}

// 개인 출석 이력
export interface MemberAttendanceHistory {
  member: Pick<Member, 'id' | 'name' | 'email'>;
  attendances: Attendance[];
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    online: number;
    attendanceRate: number;
  };
}

// 미출석자 정보
export interface AbsenteeInfo {
  memberId: string;
  memberName: string;
  memberEmail: string;
  cellId: string;
  cellName: string;
  consecutiveAbsences: number;
  lastAttendDate: string | null;
}

// 전체 요약 (대시보드용)
export interface AttendanceSummary {
  totalCells: number;
  totalMembers: number;
  thisWeekRate: number;
  lastWeekRate: number;
  thisMonthRate: number;
  topCells: { cellId: string; cellName: string; rate: number }[];
  needsAttention: AbsenteeInfo[];
}
