/**
 * CellCard
 * 셀 카드 컴포넌트
 */
import { Users, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cell, MyCellInfo } from '../types';

interface CellCardProps {
  cell: Cell | MyCellInfo;
  onClick?: () => void;
  showMemberCount?: boolean;
  showLeader?: boolean;
  className?: string;
}

export function CellCard({
  cell,
  onClick,
  showMemberCount = true,
  showLeader = true,
  className,
}: CellCardProps) {
  const myRole = 'myRole' in cell ? cell.myRole : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border bg-white transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300',
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* 색상 인디케이터 */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: cell.color }}
          >
            <Users className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{cell.name}</h3>
            {myRole && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {myRole === 'LEADER' ? '리더' : myRole === 'SUB_LEADER' ? '부리더' : '멤버'}
              </span>
            )}
          </div>
        </div>

        {onClick && <ChevronRight className="w-5 h-5 text-gray-400" />}
      </div>

      {/* 설명 */}
      {cell.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{cell.description}</p>
      )}

      {/* 하단 정보 */}
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        {showMemberCount && cell.memberCount !== undefined && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{cell.memberCount}명</span>
          </div>
        )}

        {showLeader && cell.leader && (
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{cell.leader.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 셀 카드 리스트
 */
interface CellListProps {
  cells: (Cell | MyCellInfo)[];
  onCellClick?: (cell: Cell | MyCellInfo) => void;
  emptyMessage?: string;
  className?: string;
}

export function CellList({
  cells,
  onCellClick,
  emptyMessage = '셀이 없습니다.',
  className,
}: CellListProps) {
  if (cells.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {cells.map((cell) => (
        <CellCard
          key={cell.id}
          cell={cell}
          onClick={onCellClick ? () => onCellClick(cell) : undefined}
        />
      ))}
    </div>
  );
}
