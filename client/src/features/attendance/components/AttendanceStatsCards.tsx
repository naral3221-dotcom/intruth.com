/**
 * AttendanceStatsCards
 * 출석 통계 카드 컴포넌트
 */
import { Users, TrendingUp, TrendingDown, Minus, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyStats, AttendanceSummary, AbsenteeInfo } from '../types';

/**
 * 주간 통계 카드
 */
interface WeeklyStatsCardProps {
  stats: WeeklyStats;
  onClick?: () => void;
  className?: string;
}

export function WeeklyStatsCard({ stats, onClick, className }: WeeklyStatsCardProps) {
  const TrendIcon =
    stats.trend === 'UP' ? TrendingUp : stats.trend === 'DOWN' ? TrendingDown : Minus;
  const trendColor =
    stats.trend === 'UP'
      ? 'text-green-600'
      : stats.trend === 'DOWN'
      ? 'text-red-600'
      : 'text-gray-500';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border bg-white',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{stats.cellName}</h3>
        <div className={cn('flex items-center gap-1', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{stats.attendanceRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <div>
          <div className="font-semibold text-green-600">{stats.presentCount}</div>
          <div className="text-gray-500">출석</div>
        </div>
        <div>
          <div className="font-semibold text-red-600">{stats.absentCount}</div>
          <div className="text-gray-500">결석</div>
        </div>
        <div>
          <div className="font-semibold text-yellow-600">{stats.lateCount}</div>
          <div className="text-gray-500">지각</div>
        </div>
        <div>
          <div className="font-semibold text-blue-600">{stats.excusedCount}</div>
          <div className="text-gray-500">사유</div>
        </div>
        <div>
          <div className="font-semibold text-purple-600">{stats.onlineCount}</div>
          <div className="text-gray-500">온라인</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
        <span>전체 {stats.totalMembers}명</span>
        <span>지난 주 {stats.previousWeekRate}%</span>
      </div>
    </div>
  );
}

/**
 * 요약 통계 카드
 */
interface SummaryStatsCardsProps {
  summary: AttendanceSummary;
  className?: string;
}

export function SummaryStatsCards({ summary, className }: SummaryStatsCardsProps) {
  const weekTrend = summary.thisWeekRate - summary.lastWeekRate;

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* 전체 셀 */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{summary.totalCells}</div>
            <div className="text-sm text-blue-600">전체 셀</div>
          </div>
        </div>
      </div>

      {/* 전체 멤버 */}
      <div className="p-4 rounded-lg bg-green-50 border border-green-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">{summary.totalMembers}</div>
            <div className="text-sm text-green-600">전체 멤버</div>
          </div>
        </div>
      </div>

      {/* 이번 주 출석률 */}
      <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900">{summary.thisWeekRate}%</span>
              {weekTrend !== 0 && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    weekTrend > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {weekTrend > 0 ? '+' : ''}
                  {weekTrend.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-sm text-purple-600">이번 주 출석률</div>
          </div>
        </div>
      </div>

      {/* 이번 달 출석률 */}
      <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-900">{summary.thisMonthRate}%</div>
            <div className="text-sm text-orange-600">이번 달 출석률</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 미출석자 알림 카드
 */
interface AbsenteeAlertCardProps {
  absentees: AbsenteeInfo[];
  className?: string;
}

export function AbsenteeAlertCard({ absentees, className }: AbsenteeAlertCardProps) {
  if (absentees.length === 0) {
    return null;
  }

  return (
    <div className={cn('p-4 rounded-lg bg-red-50 border border-red-100', className)}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-red-900">주의가 필요한 멤버</h3>
        <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
          {absentees.length}명
        </span>
      </div>

      <div className="space-y-2">
        {absentees.slice(0, 5).map((absentee) => (
          <div
            key={`${absentee.cellId}-${absentee.memberId}`}
            className="flex items-center justify-between p-2 bg-white rounded-md"
          >
            <div>
              <span className="font-medium text-gray-900">{absentee.memberName}</span>
              <span className="text-sm text-gray-500 ml-2">({absentee.cellName})</span>
            </div>
            <span className="text-sm text-red-600 font-medium">
              {absentee.consecutiveAbsences}주 연속 결석
            </span>
          </div>
        ))}
      </div>

      {absentees.length > 5 && (
        <div className="mt-2 text-center text-sm text-red-600">
          외 {absentees.length - 5}명 더 있음
        </div>
      )}
    </div>
  );
}
