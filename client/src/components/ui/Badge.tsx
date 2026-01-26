import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { TaskPriority, TaskStatus } from '@/types';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition-colors',
        {
          'bg-blue-100 text-blue-800 ring-blue-300': variant === 'default',
          'bg-gray-100 text-gray-700 ring-gray-300': variant === 'secondary',
          'bg-green-100 text-green-800 ring-green-300': variant === 'success',
          'bg-amber-100 text-amber-800 ring-amber-300': variant === 'warning',
          'bg-red-100 text-red-800 ring-red-300': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    TODO: {
      label: '예정',
      className: 'bg-slate-100 text-slate-700 ring-slate-300',
      dotColor: 'bg-slate-500',
    },
    IN_PROGRESS: {
      label: '진행중',
      className: 'bg-blue-100 text-blue-800 ring-blue-300',
      dotColor: 'bg-blue-600',
    },
    REVIEW: {
      label: '검토',
      className: 'bg-amber-100 text-amber-800 ring-amber-300',
      dotColor: 'bg-amber-600',
    },
    DONE: {
      label: '완료',
      className: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
      dotColor: 'bg-emerald-600',
    },
  };

  const { label, className, dotColor } = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-inset transition-colors',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full mr-2',
          dotColor
        )}
      />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = {
    LOW: {
      label: '낮음',
      className: 'bg-slate-100 text-slate-700 ring-slate-300',
    },
    MEDIUM: {
      label: '보통',
      className: 'bg-blue-100 text-blue-700 ring-blue-300',
    },
    HIGH: {
      label: '높음',
      className: 'bg-orange-100 text-orange-700 ring-orange-300',
    },
    URGENT: {
      label: '긴급',
      className: 'bg-red-100 text-red-700 ring-red-300',
    },
  };

  const { label, className } = config[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-inset transition-colors',
        className
      )}
    >
      {label}
    </span>
  );
}
