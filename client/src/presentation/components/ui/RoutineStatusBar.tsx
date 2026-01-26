import { motion, AnimatePresence } from 'framer-motion';
import { useRoutineStore, type DayFilter } from '@/stores/routineStore';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { RoutineTask } from '@/types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface RoutineStatusBarProps {
  projectId?: string;  // 프로젝트 페이지에서 사용 시
  showAddButton?: boolean;
}

export function RoutineStatusBar({ projectId, showAddButton = true }: RoutineStatusBarProps) {
  const {
    selectedDay,
    fetchRoutinesByDay,
    toggleComplete,
    loading,
    getFilteredRoutines
  } = useRoutineStore();
  const { openCreateRoutineModal } = useUIStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date().getDay(); // 0=일, 1=월, ..., 6=토

  useEffect(() => {
    fetchRoutinesByDay(today, true); // 기본: 오늘 요일
  }, [fetchRoutinesByDay, today]);

  // 요일 선택 핸들러
  const handleDaySelect = (day: DayFilter) => {
    fetchRoutinesByDay(day, true);
  };

  // 필터된 루틴 가져오기 (getFilteredRoutines 사용)
  const filteredRoutines = getFilteredRoutines();

  // 프로젝트별 필터링
  const displayRoutines = projectId
    ? filteredRoutines.filter(r => r.projectId === projectId)
    : filteredRoutines;

  const completedCount = displayRoutines.filter(r => r.isCompletedToday).length;
  const totalCount = displayRoutines.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // 선택된 요일 라벨
  const getSelectedDayLabel = () => {
    if (selectedDay === 'all') return '전체';
    if (selectedDay === today) return '오늘';
    return `${DAY_NAMES[selectedDay]}요일`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      {/* 헤더 바 */}
      <div
        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          {/* 왼쪽: 제목과 진행률 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="text-white font-medium">
                {getSelectedDayLabel()} 루틴
              </span>
              <span className="text-cyan-400 text-sm">
                ({completedCount}/{totalCount} 완료)
              </span>
            </div>

            {/* 진행률 바 */}
            {totalCount > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {/* 오른쪽: 요일 선택 + 확장 버튼 */}
          <div className="flex items-center gap-3">
            {/* 요일 선택 버튼 */}
            <div className="hidden md:flex items-center gap-1">
              {/* 전체 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDaySelect('all');
                }}
                className={`px-2 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  selectedDay === 'all'
                    ? 'bg-neon-violet text-white shadow-lg shadow-neon-violet/30'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    selectedDay === idx
                      ? idx === today
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-neon-violet text-white shadow-lg shadow-neon-violet/30'
                      : idx === today
                        ? 'bg-cyan-500/30 text-cyan-300 hover:bg-cyan-500/50'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* 확장/축소 버튼 */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 확장된 루틴 목록 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              {/* 모바일용 요일 선택 */}
              <div className="md:hidden flex items-center gap-1 mb-3 overflow-x-auto pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDaySelect('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedDay === 'all'
                      ? 'bg-neon-violet text-white'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  전체
                </button>
                {DAY_NAMES.map((day, idx) => (
                  <button
                    key={day}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDaySelect(idx);
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      selectedDay === idx
                        ? idx === today
                          ? 'bg-cyan-500 text-white'
                          : 'bg-neon-violet text-white'
                        : idx === today
                          ? 'bg-cyan-500/30 text-cyan-300'
                          : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-4 text-slate-400">로딩 중...</div>
              ) : displayRoutines.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 mb-2">
                    {selectedDay === 'all'
                      ? '등록된 루틴이 없습니다'
                      : `${getSelectedDayLabel()}에 예정된 루틴이 없습니다`}
                  </p>
                  {showAddButton && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateRoutineModal(projectId);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      + 새 루틴 추가
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayRoutines.map((routine) => (
                    <RoutineItem
                      key={routine.id}
                      routine={routine}
                      onToggle={() => toggleComplete(routine.id)}
                      selectedDay={selectedDay}
                    />
                  ))}

                  {showAddButton && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateRoutineModal(projectId);
                      }}
                      className="w-full py-2 text-slate-400 hover:text-cyan-400 text-sm border border-dashed border-slate-600 hover:border-cyan-400/50 rounded-lg transition-colors"
                    >
                      + 새 루틴 추가
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 루틴 아이템 컴포넌트
function RoutineItem({
  routine,
  onToggle,
  selectedDay
}: {
  routine: RoutineTask;
  onToggle: () => void;
  selectedDay: DayFilter;
}) {
  const priorityColors = {
    LOW: 'bg-slate-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
  };

  const today = new Date().getDay();
  const isToday = selectedDay === today || selectedDay === 'all';

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        routine.isCompletedToday
          ? 'bg-slate-700/30'
          : 'bg-slate-700/50 hover:bg-slate-700/70'
      }`}
    >
      {/* 체크박스 - 오늘만 체크 가능 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isToday) onToggle();
        }}
        disabled={!isToday}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          routine.isCompletedToday
            ? 'bg-cyan-500 border-cyan-500 text-white'
            : isToday
              ? 'border-slate-500 hover:border-cyan-400'
              : 'border-slate-600 cursor-not-allowed opacity-50'
        }`}
        title={!isToday ? '오늘의 루틴만 완료 처리할 수 있습니다' : undefined}
      >
        {routine.isCompletedToday && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 우선순위 */}
      <div className={`w-2 h-2 rounded-full ${priorityColors[routine.priority]}`} />

      {/* 제목 */}
      <span className={`flex-1 text-sm ${
        routine.isCompletedToday
          ? 'text-slate-400 line-through'
          : 'text-white'
      }`}>
        {routine.title}
      </span>

      {/* 반복 요일 */}
      <div className="flex gap-0.5">
        {routine.repeatType === 'daily' ? (
          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">매일</span>
        ) : (
          routine.repeatDays.map(day => (
            <span
              key={day}
              className={`w-5 h-5 text-xs flex items-center justify-center rounded ${
                day === today
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-slate-600/50 text-slate-300'
              }`}
            >
              {DAY_NAMES[day]}
            </span>
          ))
        )}
      </div>

      {/* 예상 시간 */}
      {routine.estimatedMinutes && (
        <span className="text-xs text-slate-400">
          {routine.estimatedMinutes}분
        </span>
      )}
    </motion.div>
  );
}
