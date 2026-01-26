/**
 * AttendanceStatusBadge
 * 출석 상태 뱃지 컴포넌트
 */
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '../types';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS } from '../types';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AttendanceStatusBadge({
  status,
  size = 'md',
  className,
}: AttendanceStatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-gray-100 text-gray-500',
          size === 'sm' && 'px-2 py-0.5 text-xs',
          size === 'md' && 'px-2.5 py-1 text-sm',
          size === 'lg' && 'px-3 py-1.5 text-base',
          className
        )}
      >
        미체크
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        ATTENDANCE_STATUS_COLORS[status],
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        size === 'lg' && 'px-3 py-1.5 text-base',
        className
      )}
    >
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 출석 상태 선택 버튼 그룹
 */
interface AttendanceStatusSelectorProps {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function AttendanceStatusSelector({
  value,
  onChange,
  disabled = false,
  className,
}: AttendanceStatusSelectorProps) {
  const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'ONLINE'];

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          disabled={disabled}
          className={cn(
            'px-2 py-1 text-xs rounded-md transition-all',
            'border-2',
            value === status
              ? cn(ATTENDANCE_STATUS_COLORS[status], 'border-current')
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {ATTENDANCE_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
