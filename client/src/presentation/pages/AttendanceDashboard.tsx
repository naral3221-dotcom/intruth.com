/**
 * AttendanceDashboard
 * 출석 대시보드 페이지
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Users, BarChart3, Settings, Plus, ArrowRight } from 'lucide-react';
import {
  useCells,
  useAttendanceSummary,
  useWeeklyStats,
  CellList,
  SummaryStatsCards,
  WeeklyStatsCard,
  AbsenteeAlertCard,
} from '@/features/attendance';

export function AttendanceDashboard() {
  const { myCells, loading: cellsLoading } = useCells();
  const { summary, loading: summaryLoading } = useAttendanceSummary();
  const { stats: weeklyStats, loading: statsLoading } = useWeeklyStats();

  const loading = cellsLoading || summaryLoading || statsLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">셀 출석</h1>
          <p className="text-gray-500">셀 그룹 출석을 관리하고 통계를 확인하세요</p>
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickMenuCard
          to="/attendance/check"
          icon={ClipboardCheck}
          title="출석 체크"
          description="주일/셀모임 출석 체크"
          color="bg-green-500"
        />
        <QuickMenuCard
          to="/attendance/cells"
          icon={Users}
          title="셀 관리"
          description="셀 생성 및 구성원 관리"
          color="bg-blue-500"
        />
        <QuickMenuCard
          to="/attendance/reports"
          icon={BarChart3}
          title="통계 리포트"
          description="주간/월간 출석 통계"
          color="bg-purple-500"
        />
        <QuickMenuCard
          to="/attendance/cells"
          icon={Settings}
          title="설정"
          description="출석 체크 설정"
          color="bg-gray-500"
        />
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* 요약 통계 */}
          {summary && <SummaryStatsCards summary={summary} />}

          {/* 미출석자 알림 */}
          {summary && summary.needsAttention.length > 0 && (
            <AbsenteeAlertCard absentees={summary.needsAttention} />
          )}

          {/* 내 셀 */}
          {myCells.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">내 셀</h2>
                <Link
                  to="/attendance/check"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  출석 체크하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <CellList
                cells={myCells}
                onCellClick={(cell) => (window.location.href = `/attendance/check?cellId=${cell.id}`)}
              />
            </section>
          )}

          {/* 이번 주 출석률 */}
          {weeklyStats.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">이번 주 출석률</h2>
                <Link
                  to="/attendance/reports"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  전체 통계 보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weeklyStats.slice(0, 6).map((stat) => (
                  <WeeklyStatsCard key={stat.cellId} stats={stat} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
}

interface QuickMenuCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

function QuickMenuCard({ to, icon: Icon, title, description, color }: QuickMenuCardProps) {
  return (
    <Link
      to={to}
      className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

export default AttendanceDashboard;
