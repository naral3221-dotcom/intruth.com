/**
 * useAttendanceCheck Hook
 * 출석 체크 기능
 */
import { useState, useEffect, useCallback } from 'react';
import { useAttendanceRepository, useCellRepository } from '@/di';
import type {
  AttendanceStatus,
  MeetingType,
  DateAttendanceInfo,
  MemberAttendanceInfo,
  Attendance,
} from '../types';

interface UseAttendanceCheckReturn {
  // 데이터
  attendanceInfo: DateAttendanceInfo | null;
  loading: boolean;
  submitting: boolean;
  error: Error | null;

  // 출석 체크 상태
  checkList: AttendanceCheckState[];

  // 액션
  fetchAttendance: (cellId: string, date: string, meetingType: MeetingType) => Promise<void>;
  setMemberStatus: (memberId: string, status: AttendanceStatus) => void;
  setMemberNote: (memberId: string, note: string) => void;
  setAllStatus: (status: AttendanceStatus) => void;
  submitAttendance: () => Promise<Attendance[]>;
  reset: () => void;
}

interface AttendanceCheckState {
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  role: string;
  status: AttendanceStatus | null;
  note: string;
  originalStatus: AttendanceStatus | null;
}

export function useAttendanceCheck(): UseAttendanceCheckReturn {
  const attendanceRepository = useAttendanceRepository();

  const [attendanceInfo, setAttendanceInfo] = useState<DateAttendanceInfo | null>(null);
  const [checkList, setCheckList] = useState<AttendanceCheckState[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 날짜별 출석 현황 조회
  const fetchAttendance = useCallback(
    async (cellId: string, date: string, meetingType: MeetingType) => {
      try {
        setLoading(true);
        setError(null);

        const info = await attendanceRepository.findByDate(cellId, date, meetingType);
        setAttendanceInfo(info);

        // 체크 리스트 초기화
        const initialCheckList: AttendanceCheckState[] = info.members.map((m) => ({
          memberId: m.memberId,
          memberName: m.memberName,
          memberAvatar: m.memberAvatar,
          role: m.role,
          status: m.status,
          note: m.note || '',
          originalStatus: m.status,
        }));
        setCheckList(initialCheckList);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
        setError(err instanceof Error ? err : new Error('출석 정보를 불러오는데 실패했습니다.'));
      } finally {
        setLoading(false);
      }
    },
    [attendanceRepository]
  );

  // 개별 멤버 상태 변경
  const setMemberStatus = useCallback((memberId: string, status: AttendanceStatus) => {
    setCheckList((prev) =>
      prev.map((item) => (item.memberId === memberId ? { ...item, status } : item))
    );
  }, []);

  // 개별 멤버 메모 변경
  const setMemberNote = useCallback((memberId: string, note: string) => {
    setCheckList((prev) =>
      prev.map((item) => (item.memberId === memberId ? { ...item, note } : item))
    );
  }, []);

  // 전체 상태 일괄 변경
  const setAllStatus = useCallback((status: AttendanceStatus) => {
    setCheckList((prev) => prev.map((item) => ({ ...item, status })));
  }, []);

  // 출석 제출
  const submitAttendance = useCallback(async (): Promise<Attendance[]> => {
    if (!attendanceInfo) {
      throw new Error('출석 정보가 없습니다.');
    }

    // 상태가 설정된 항목만 필터링
    const attendances = checkList
      .filter((item) => item.status !== null)
      .map((item) => ({
        memberId: item.memberId,
        status: item.status as AttendanceStatus,
        note: item.note || undefined,
      }));

    if (attendances.length === 0) {
      throw new Error('출석 체크된 항목이 없습니다.');
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await attendanceRepository.checkBulk({
        cellId: attendanceInfo.cellId,
        attendDate: attendanceInfo.attendDate,
        meetingType: attendanceInfo.meetingType,
        attendances,
      });

      // 제출 후 원본 상태 업데이트
      setCheckList((prev) =>
        prev.map((item) => ({
          ...item,
          originalStatus: item.status,
        }))
      );

      return result;
    } catch (err) {
      console.error('Failed to submit attendance:', err);
      setError(err instanceof Error ? err : new Error('출석 저장에 실패했습니다.'));
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [attendanceInfo, checkList, attendanceRepository]);

  // 리셋
  const reset = useCallback(() => {
    setAttendanceInfo(null);
    setCheckList([]);
    setError(null);
  }, []);

  return {
    attendanceInfo,
    loading,
    submitting,
    error,
    checkList,
    fetchAttendance,
    setMemberStatus,
    setMemberNote,
    setAllStatus,
    submitAttendance,
    reset,
  };
}

/**
 * useWeeklyAttendance Hook
 * 주간 출석 현황 조회
 */
interface UseWeeklyAttendanceReturn {
  weeklyData: import('../types').WeeklyAttendanceInfo | null;
  loading: boolean;
  error: Error | null;
  fetchWeekly: (cellId: string, weekStart: string) => Promise<void>;
}

export function useWeeklyAttendance(): UseWeeklyAttendanceReturn {
  const attendanceRepository = useAttendanceRepository();

  const [weeklyData, setWeeklyData] = useState<import('../types').WeeklyAttendanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeekly = useCallback(
    async (cellId: string, weekStart: string) => {
      try {
        setLoading(true);
        setError(null);

        const data = await attendanceRepository.findWeekly(cellId, weekStart);
        setWeeklyData(data);
      } catch (err) {
        console.error('Failed to fetch weekly attendance:', err);
        setError(err instanceof Error ? err : new Error('주간 출석 정보를 불러오는데 실패했습니다.'));
      } finally {
        setLoading(false);
      }
    },
    [attendanceRepository]
  );

  return {
    weeklyData,
    loading,
    error,
    fetchWeekly,
  };
}
