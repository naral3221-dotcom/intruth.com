/**
 * AttendanceCheckGrid
 * 출석 체크 그리드 컴포넌트
 */
import { useState } from 'react';
import { User, MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttendanceStatusSelector } from './AttendanceStatusBadge';
import type { AttendanceStatus } from '../types';

interface AttendanceCheckItem {
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  role: string;
  status: AttendanceStatus | null;
  note: string;
}

interface AttendanceCheckGridProps {
  items: AttendanceCheckItem[];
  onStatusChange: (memberId: string, status: AttendanceStatus) => void;
  onNoteChange: (memberId: string, note: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AttendanceCheckGrid({
  items,
  onStatusChange,
  onNoteChange,
  disabled = false,
  className,
}: AttendanceCheckGridProps) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <AttendanceCheckRow
          key={item.memberId}
          item={item}
          onStatusChange={(status) => onStatusChange(item.memberId, status)}
          onNoteChange={(note) => onNoteChange(item.memberId, note)}
          showNote={expandedNote === item.memberId}
          onToggleNote={() =>
            setExpandedNote(expandedNote === item.memberId ? null : item.memberId)
          }
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface AttendanceCheckRowProps {
  item: AttendanceCheckItem;
  onStatusChange: (status: AttendanceStatus) => void;
  onNoteChange: (note: string) => void;
  showNote: boolean;
  onToggleNote: () => void;
  disabled?: boolean;
}

function AttendanceCheckRow({
  item,
  onStatusChange,
  onNoteChange,
  showNote,
  onToggleNote,
  disabled,
}: AttendanceCheckRowProps) {
  const roleLabel = item.role === 'LEADER' ? '리더' : item.role === 'SUB_LEADER' ? '부리더' : '';

  return (
    <div className="bg-white rounded-lg border p-3">
      <div className="flex items-center gap-3">
        {/* 아바타 */}
        <div className="flex-shrink-0">
          {item.memberAvatar ? (
            <img
              src={item.memberAvatar}
              alt={item.memberName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {/* 이름 & 역할 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{item.memberName}</span>
            {roleLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {/* 메모 버튼 */}
        <button
          type="button"
          onClick={onToggleNote}
          className={cn(
            'p-2 rounded-md transition-colors',
            showNote || item.note ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
          )}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {/* 상태 선택 */}
      <div className="mt-3">
        <AttendanceStatusSelector
          value={item.status}
          onChange={onStatusChange}
          disabled={disabled}
        />
      </div>

      {/* 메모 입력 */}
      {showNote && (
        <div className="mt-3">
          <textarea
            value={item.note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="메모를 입력하세요..."
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 빠른 전체 선택 버튼
 */
interface QuickSelectButtonsProps {
  onSelectAll: (status: AttendanceStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickSelectButtons({ onSelectAll, disabled, className }: QuickSelectButtonsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-gray-500 mr-2">전체:</span>
      <button
        type="button"
        onClick={() => onSelectAll('PRESENT')}
        disabled={disabled}
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        출석
      </button>
      <button
        type="button"
        onClick={() => onSelectAll('ABSENT')}
        disabled={disabled}
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
      >
        <X className="w-4 h-4" />
        결석
      </button>
    </div>
  );
}
