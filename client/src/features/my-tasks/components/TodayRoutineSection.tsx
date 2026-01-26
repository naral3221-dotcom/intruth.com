import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  Circle,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock
} from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { useRoutineStore, type DayFilter } from '@/stores/routineStore';
import { useUIStore } from '@/stores/uiStore';
import type { RoutineTask } from '@/types';

// 요일 이름
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_NAMES_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 요일 배지 컴포넌트
function DayBadges({ repeatDays, repeatType }: { repeatDays: number[]; repeatType: string }) {
  const today = new Date().getDay();

  if (repeatType === 'daily') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
        매일
      </span>
    );
  }

  return (
    <div className="flex gap-0.5">
      {DAY_NAMES.map((day, index) => (
        <span
          key={index}
          className={`text-[9px] w-4 h-4 flex items-center justify-center rounded ${
            repeatDays.includes(index)
              ? index === today
                ? 'bg-cyan-500/30 text-cyan-300 font-medium'
                : 'bg-primary/30 text-primary font-medium'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {day}
        </span>
      ))}
    </div>
  );
}

// 루틴 아이템 컴포넌트
function RoutineItem({
  routine,
  onToggle,
  onContextMenu,
  selectedDay,
}: {
  routine: RoutineTask;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, routine: RoutineTask) => void;
  selectedDay: DayFilter;
}) {
  const priorityColors = {
    LOW: 'text-gray-400',
    MEDIUM: 'text-blue-400',
    HIGH: 'text-orange-400',
    URGENT: 'text-red-400',
  };

  const today = new Date().getDay();
  const isToday = selectedDay === today || selectedDay === 'all';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group
        ${routine.isCompletedToday
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : 'bg-foreground/5 hover:bg-secondary border border-transparent'
        }`}
      onClick={() => isToday && onToggle(routine.id)}
      onContextMenu={(e) => onContextMenu(e, routine)}
    >
      {/* 체크박스 */}
      <motion.div
        whileHover={isToday ? { scale: 1.1 } : undefined}
        whileTap={isToday ? { scale: 0.9 } : undefined}
        className="shrink-0"
      >
        {routine.isCompletedToday ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className={`w-5 h-5 ${
            isToday
              ? 'text-muted-foreground group-hover:text-primary transition-colors'
              : 'text-muted-foreground opacity-50'
          }`} />
        )}
      </motion.div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${
            routine.isCompletedToday ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}>
            {routine.title}
          </span>
          {routine.priority !== 'MEDIUM' && (
            <span className={`text-[10px] ${priorityColors[routine.priority]}`}>
              {routine.priority === 'HIGH' ? '높음' : routine.priority === 'URGENT' ? '긴급' : '낮음'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <DayBadges repeatDays={routine.repeatDays} repeatType={routine.repeatType} />
          {routine.estimatedMinutes && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {routine.estimatedMinutes}분
            </span>
          )}
          {routine.project && (
            <span className="text-[10px] text-muted-foreground">
              {routine.project.name}
            </span>
          )}
        </div>
      </div>

      {/* 담당자 뱃지 (이름 전체 표시) */}
      {routine.assignees.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {routine.assignees.slice(0, 2).map((assignee) => (
            <span
              key={assignee.id}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
            >
              {assignee.name}
            </span>
          ))}
          {routine.assignees.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{routine.assignees.length - 2}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface TodayRoutineSectionProps {
  onCreateRoutine?: () => void;
}

export function TodayRoutineSection({ onCreateRoutine }: TodayRoutineSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    selectedDay,
    loading,
    fetchRoutinesByDay,
    toggleComplete,
    getFilteredRoutines,
    getFilteredCompletedCount,
    getFilteredTotalCount
  } = useRoutineStore();
  const { openContextMenu } = useUIStore();

  // 필터된 루틴 가져오기 (getFilteredRoutines 사용)
  const filteredRoutines = getFilteredRoutines();

  const today = new Date().getDay();

  // 루틴 아이템 우클릭 핸들러
  const handleRoutineContextMenu = (e: React.MouseEvent, routine: RoutineTask) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu('routine', { x: e.clientX, y: e.clientY }, { routine });
  };

  // 요일 선택 핸들러
  const handleDaySelect = (day: DayFilter) => {
    fetchRoutinesByDay(day, true);
  };

  useEffect(() => {
    fetchRoutinesByDay(today, true); // 기본: 오늘 요일
  }, [fetchRoutinesByDay, today]);

  const completedCount = getFilteredCompletedCount();
  const totalCount = getFilteredTotalCount();
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // 선택된 요일 라벨
  const getSelectedDayLabel = () => {
    if (selectedDay === 'all') return '전체';
    if (selectedDay === today) return '오늘';
    return `${DAY_NAMES[selectedDay]}요일`;
  };

  const getSelectedDayFullLabel = () => {
    if (selectedDay === 'all') return '전체 루틴';
    return DAY_NAMES_FULL[selectedDay as number];
  };

  return (
    <Card className="overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              {getSelectedDayLabel()} 루틴
              {selectedDay !== 'all' && (
                <span className="text-sm text-muted-foreground font-normal">
                  ({getSelectedDayFullLabel()})
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0
                ? `${completedCount}/${totalCount} 완료`
                : '등록된 루틴이 없습니다'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 진행률 표시 */}
          {totalCount > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          )}

          {/* 새로고침 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              fetchRoutinesByDay(selectedDay, true);
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>

          {/* 확장/축소 */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* 루틴 목록 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* 요일 선택 버튼 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {/* 전체 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDaySelect('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedDay === 'all'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-foreground/5 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  전체
                </button>
                {/* 요일 버튼들 */}
                {DAY_NAMES.map((day, idx) => (
                  <button
                    key={day}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDaySelect(idx);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      selectedDay === idx
                        ? idx === today
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : idx === today
                          ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                          : 'bg-foreground/5 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {loading && filteredRoutines.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : filteredRoutines.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-3">
                    {selectedDay === 'all'
                      ? '등록된 루틴이 없습니다'
                      : `${getSelectedDayLabel()}에 예정된 루틴이 없습니다`}
                  </p>
                  {onCreateRoutine && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onCreateRoutine}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      루틴 추가
                    </motion.button>
                  )}
                </div>
              ) : (
                <>
                  {filteredRoutines.map((routine) => (
                    <RoutineItem
                      key={routine.id}
                      routine={routine}
                      onToggle={toggleComplete}
                      onContextMenu={handleRoutineContextMenu}
                      selectedDay={selectedDay}
                    />
                  ))}

                  {/* 루틴 추가 버튼 */}
                  {onCreateRoutine && (
                    <motion.button
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onCreateRoutine}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      새 루틴 추가
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
