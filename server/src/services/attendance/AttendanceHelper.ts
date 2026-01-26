/**
 * Attendance Helper
 * 출석 관련 날짜/주차 계산 유틸리티
 */

/**
 * 주의 시작일 계산 (일요일 기준)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 주의 종료일 계산 (토요일 기준)
 */
export function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * 월의 주차 목록 가져오기
 */
export function getWeeksInMonth(year: number, month: number): { start: Date; end: Date }[] {
  const weeks: { start: Date; end: Date }[] = [];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  let weekStart = getWeekStart(monthStart);

  while (weekStart <= monthEnd) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      start: new Date(Math.max(weekStart.getTime(), monthStart.getTime())),
      end: new Date(Math.min(weekEnd.getTime(), monthEnd.getTime())),
    });

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

/**
 * 출석 상태별 카운트 계산
 */
export function countByStatus<T extends { status: string; memberId: string }>(
  attendances: T[],
  status: string
): number {
  return new Set(
    attendances.filter((a) => a.status === status).map((a) => a.memberId)
  ).size;
}

/**
 * 출석률 계산 (출석 + 지각 + 온라인 / 전체)
 */
export function calculateAttendanceRate(
  attendances: { status: string; memberId: string }[],
  totalMembers: number
): number {
  if (totalMembers === 0) return 0;

  const attendedMembers = new Set(
    attendances
      .filter((a) => ['PRESENT', 'LATE', 'ONLINE'].includes(a.status))
      .map((a) => a.memberId)
  );

  return Math.round((attendedMembers.size / totalMembers) * 1000) / 10;
}

/**
 * 트렌드 계산 (5% 이상 변화 시)
 */
export function calculateTrend(
  currentRate: number,
  previousRate: number
): 'UP' | 'DOWN' | 'SAME' {
  if (currentRate > previousRate + 5) return 'UP';
  if (currentRate < previousRate - 5) return 'DOWN';
  return 'SAME';
}
