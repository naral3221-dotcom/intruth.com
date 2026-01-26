/**
 * AttendanceReportsPage
 * 출석 통계 리포트 페이지
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Users, BarChart3 } from 'lucide-react';
import {
  useWeeklyStats,
  useMonthlyStats,
  useCells,
  WeeklyStatsCard,
} from '@/features/attendance';
import type { WeeklyStats, MonthlyStats } from '@/features/attendance';
import { cn } from '@/lib/utils';

type ReportTab = 'weekly' | 'monthly';

export function AttendanceReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly');
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const { cells } = useCells();
  const { stats: weeklyStats, loading: weeklyLoading } = useWeeklyStats(selectedCellId || undefined);
  const {
    stats: monthlyStats,
    loading: monthlyLoading,
    refetch: refetchMonthly,
  } = useMonthlyStats({
    cellId: selectedCellId || undefined,
    year: selectedYear,
    month: selectedMonth,
  });

  const loading = activeTab === 'weekly' ? weeklyLoading : monthlyLoading;

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    refetchMonthly({ cellId: selectedCellId || undefined, year, month });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">통계 리포트</h1>
        <p className="text-gray-500">셀별 출석 통계를 확인하세요</p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg border p-4 flex flex-wrap gap-4 items-center">
        {/* 셀 필터 */}
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <select
            value={selectedCellId}
            onChange={(e) => setSelectedCellId(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 셀</option>
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id}>
                {cell.name}
              </option>
            ))}
          </select>
        </div>

        {/* 탭 */}
        <div className="flex bg-gray-100 rounded-lg p-1 ml-auto">
          <button
            onClick={() => setActiveTab('weekly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'weekly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
            )}
          >
            주간
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
            )}
          >
            월간
          </button>
        </div>
      </div>

      {/* 월간 필터 (월간 탭일 때만) */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={selectedYear}
            onChange={(e) => handleMonthChange(parseInt(e.target.value), selectedMonth)}
            className="px-3 py-2 border rounded-lg"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(selectedYear, parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-500">통계를 불러오는 중...</p>
        </div>
      )}

      {/* 주간 통계 */}
      {!loading && activeTab === 'weekly' && (
        <WeeklyStatsView stats={weeklyStats} />
      )}

      {/* 월간 통계 */}
      {!loading && activeTab === 'monthly' && (
        <MonthlyStatsView stats={monthlyStats} year={selectedYear} month={selectedMonth} />
      )}
    </motion.div>
  );
}

/**
 * 주간 통계 뷰
 */
function WeeklyStatsView({ stats }: { stats: WeeklyStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">이번 주 출석 데이터가 없습니다.</p>
      </div>
    );
  }

  // 전체 요약
  const totalMembers = stats.reduce((sum, s) => sum + s.totalMembers, 0);
  const avgRate =
    stats.length > 0
      ? Math.round((stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length) * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">전체 셀</div>
          <div className="text-2xl font-bold">{stats.length}개</div>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">전체 멤버</div>
          <div className="text-2xl font-bold">{totalMembers}명</div>
        </div>
        <div className="p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">평균 출석률</div>
          <div className="text-2xl font-bold text-blue-600">{avgRate}%</div>
        </div>
      </div>

      {/* 셀별 통계 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <WeeklyStatsCard key={stat.cellId} stats={stat} />
        ))}
      </div>
    </div>
  );
}

/**
 * 월간 통계 뷰
 */
function MonthlyStatsView({
  stats,
  year,
  month,
}: {
  stats: MonthlyStats[];
  year: number;
  month: number;
}) {
  if (stats.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">{year}년 {month}월 출석 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats.map((cellStats) => (
        <div key={cellStats.cellId} className="bg-white rounded-lg border overflow-hidden">
          {/* 셀 헤더 */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{cellStats.cellName}</h3>
              <div className="text-sm">
                <span className="text-gray-500">평균 출석률: </span>
                <span className="font-semibold text-blue-600">{cellStats.averageRate}%</span>
              </div>
            </div>
          </div>

          {/* 주차별 통계 */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">주차별 출석률</h4>
            <div className="space-y-2">
              {cellStats.weeklyBreakdown.map((week, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-16">{index + 1}주차</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${week.attendanceRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{week.attendanceRate}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 멤버별 통계 */}
          {cellStats.memberStats.length > 0 && (
            <div className="p-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">멤버별 출석률</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {cellStats.memberStats.slice(0, 10).map((member) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm">{member.memberName}</span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        member.attendanceRate >= 80
                          ? 'text-green-600'
                          : member.attendanceRate >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      )}
                    >
                      {member.attendanceRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AttendanceReportsPage;
