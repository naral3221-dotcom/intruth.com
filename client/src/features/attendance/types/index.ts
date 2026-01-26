/**
 * Attendance Feature 타입 정의
 */

// Re-export domain entities
export type {
  Cell,
  CellMember,
  CellMemberRole,
  MyCellInfo,
} from '@/domain/entities/Cell';

export type {
  Attendance,
  AttendanceStatus,
  MeetingType,
  DateAttendanceInfo,
  MemberAttendanceInfo,
  WeeklyAttendanceInfo,
  WeeklyMemberAttendance,
  WeeklyStats,
  MonthlyStats,
  MemberMonthlyStats,
  MemberAttendanceHistory,
  AbsenteeInfo,
  AttendanceSummary,
} from '@/domain/entities/Attendance';

// Feature-specific types
export interface AttendanceCheckItem {
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  role: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'ONLINE' | null;
  note?: string;
}

export interface AttendanceFormData {
  cellId: string;
  attendDate: string;
  meetingType: 'SUNDAY_SERVICE' | 'CELL_MEETING';
  attendances: {
    memberId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'ONLINE';
    note?: string;
  }[];
}

// 출석 상태 라벨
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: '출석',
  ABSENT: '결석',
  LATE: '지각',
  EXCUSED: '사유결석',
  ONLINE: '온라인',
};

// 출석 상태 색상
export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  LATE: 'bg-yellow-100 text-yellow-800',
  EXCUSED: 'bg-blue-100 text-blue-800',
  ONLINE: 'bg-purple-100 text-purple-800',
};

// 모임 유형 라벨
export const MEETING_TYPE_LABELS: Record<string, string> = {
  SUNDAY_SERVICE: '주일예배',
  CELL_MEETING: '셀 모임',
};
