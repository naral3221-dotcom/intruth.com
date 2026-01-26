/**
 * useAttendanceStats Hook
 * 출석 통계 조회 기능
 */
import { useState, useEffect, useCallback } from 'react';
import { useAttendanceRepository } from '@/di';
import type {
  WeeklyStats,
  MonthlyStats,
  AttendanceSummary,
  MemberAttendanceHistory,
} from '../types';

// 주간 통계 Hook
interface UseWeeklyStatsReturn {
  stats: WeeklyStats[];
  loading: boolean;
  error: Error | null;
  refetch: (params?: { cellId?: string; weekStart?: string }) => Promise<void>;
}

export function useWeeklyStats(initialCellId?: string): UseWeeklyStatsReturn {
  const attendanceRepository = useAttendanceRepository();

  const [stats, setStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(
    async (params?: { cellId?: string; weekStart?: string }) => {
      try {
        setLoading(true);
        setError(null);

        const data = await attendanceRepository.getWeeklyStats({
          cellId: params?.cellId || initialCellId,
          weekStart: params?.weekStart,
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch weekly stats:', err);
        setError(err instanceof Error ? err : new Error('주간 통계를 불러오는데 실패했습니다.'));
      } finally {
        setLoading(false);
      }
    },
    [attendanceRepository, initialCellId]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// 월간 통계 Hook
interface UseMonthlyStatsReturn {
  stats: MonthlyStats[];
  loading: boolean;
  error: Error | null;
  refetch: (params?: { cellId?: string; year?: number; month?: number }) => Promise<void>;
}

export function useMonthlyStats(initialParams?: {
  cellId?: string;
  year?: number;
  month?: number;
}): UseMonthlyStatsReturn {
  const attendanceRepository = useAttendanceRepository();

  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(
    async (params?: { cellId?: string; year?: number; month?: number }) => {
      try {
        setLoading(true);
        setError(null);

        const data = await attendanceRepository.getMonthlyStats({
          cellId: params?.cellId || initialParams?.cellId,
          year: params?.year || initialParams?.year,
          month: params?.month || initialParams?.month,
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch monthly stats:', err);
        setError(err instanceof Error ? err : new Error('월간 통계를 불러오는데 실패했습니다.'));
      } finally {
        setLoading(false);
      }
    },
    [attendanceRepository, initialParams]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// 전체 요약 Hook (대시보드용)
interface UseAttendanceSummaryReturn {
  summary: AttendanceSummary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAttendanceSummary(): UseAttendanceSummaryReturn {
  const attendanceRepository = useAttendanceRepository();

  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await attendanceRepository.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch attendance summary:', err);
      setError(err instanceof Error ? err : new Error('출석 요약을 불러오는데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [attendanceRepository]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}

// 개인 출석 이력 Hook
interface UseMemberHistoryReturn {
  history: MemberAttendanceHistory | null;
  loading: boolean;
  error: Error | null;
  fetchHistory: (memberId: string, limit?: number) => Promise<void>;
}

export function useMemberHistory(): UseMemberHistoryReturn {
  const attendanceRepository = useAttendanceRepository();

  const [history, setHistory] = useState<MemberAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(
    async (memberId: string, limit = 20) => {
      try {
        setLoading(true);
        setError(null);

        const data = await attendanceRepository.getMemberHistory(memberId, limit);
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch member history:', err);
        setError(err instanceof Error ? err : new Error('출석 이력을 불러오는데 실패했습니다.'));
      } finally {
        setLoading(false);
      }
    },
    [attendanceRepository]
  );

  return {
    history,
    loading,
    error,
    fetchHistory,
  };
}
