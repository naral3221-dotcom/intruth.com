import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { useRoutineStore } from "@/stores/routineStore";
import { useUIStore } from "@/stores/uiStore";
import { useContextMenuWithLongPress } from "@/presentation/components/context-menu";
import { LongPressRipple } from "@/presentation/components/ui/LongPressRipple";
import type { Task, RoutineTask } from "@/types";

interface TaskCalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

// 캘린더에 표시할 아이템 타입 (일반 업무 + 루틴)
interface CalendarItem {
    id: string;
    title: string;
    priority: string;
    type: 'task' | 'routine';
    isStart?: boolean;    // 시작일인지 여부
    isEnd?: boolean;      // 마감일인지 여부
    isMiddle?: boolean;   // 중간 기간인지 여부
    isCompleted?: boolean; // 완료 여부
    originalTask?: Task;
    originalRoutine?: RoutineTask;
}

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-gray-500",
};

const ROUTINE_COLORS: Record<string, string> = {
    URGENT: "bg-red-400/60",
    HIGH: "bg-orange-400/60",
    MEDIUM: "bg-violet-400/60",
    LOW: "bg-gray-400/60",
};

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { allRoutines, fetchAllRoutines, loading: routineLoading } = useRoutineStore();

    // 루틴 데이터 로드 (캘린더 진입 시 본인 루틴만 가져오기)
    useEffect(() => {
        fetchAllRoutines(true); // personal: true - 본인 루틴만
    }, [fetchAllRoutines]);

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 해당 월의 첫 날과 마지막 날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 달력에 표시할 날짜 배열
        const days: { date: Date; items: CalendarItem[]; isCurrentMonth: boolean }[] = [];

        // 첫 주의 이전 달 날짜들
        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({
                date,
                items: getItemsForDate(date, tasks, allRoutines),
                isCurrentMonth: false,
            });
        }

        // 현재 달의 날짜들
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({
                date,
                items: getItemsForDate(date, tasks, allRoutines),
                isCurrentMonth: true,
            });
        }

        // 마지막 주의 다음 달 날짜들 (6주 완성)
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                date,
                items: getItemsForDate(date, tasks, allRoutines),
                isCurrentMonth: false,
            });
        }

        return days;
    }, [currentDate, tasks, allRoutines]);

    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h3>
                <div className="flex items-center gap-2">
                    <motion.button
                        className="p-2 rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        onClick={goToPrevMonth}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                        className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-all"
                        onClick={goToToday}
                        whileHover={{ scale: 1.02 }}
                    >
                        오늘
                    </motion.button>
                    <motion.button
                        className="p-2 rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        onClick={goToNextMonth}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day, i) => (
                    <div
                        key={day}
                        className={`text-center text-sm font-medium py-2 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-400" />
                    <span className="text-muted-foreground">일반 업무</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-emerald-400" />
                    <span className="text-muted-foreground">완료된 업무</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-violet-500 to-violet-400" />
                    <span className="text-muted-foreground">루틴 업무</span>
                </div>
                {routineLoading && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>로딩 중...</span>
                    </div>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, index) => (
                    <motion.div
                        key={index}
                        className={`min-h-24 p-2 rounded-lg transition-all ${day.isCurrentMonth ? "bg-foreground/5" : "bg-foreground/[0.02]"
                            } ${isToday(day.date) ? "ring-1 ring-primary" : ""}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.01 }}
                    >
                        <div
                            className={`text-sm mb-1 ${!day.isCurrentMonth
                                    ? "text-muted-foreground"
                                    : isToday(day.date)
                                        ? "text-primary font-bold"
                                        : day.date.getDay() === 0
                                            ? "text-red-400"
                                            : day.date.getDay() === 6
                                                ? "text-blue-400"
                                                : "text-muted-foreground"
                                }`}
                        >
                            {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                            {day.items.slice(0, 3).map((item) => (
                                <CalendarItemCard
                                    key={`${item.type}-${item.id}`}
                                    item={item}
                                    onTaskClick={onTaskClick}
                                />
                            ))}
                            {day.items.length > 3 && (
                                <span className="text-xs text-muted-foreground pl-1">
                                    +{day.items.length - 3}
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </Card>
    );
}

// 캘린더 아이템 카드 컴포넌트
function CalendarItemCard({
    item,
    onTaskClick
}: {
    item: CalendarItem;
    onTaskClick: (task: Task) => void;
}) {
    const { openEditRoutineModal } = useUIStore();

    // 우클릭 / Long Press 지원 - 타입에 따라 다른 컨텍스트 메뉴
    const { contextMenuProps, isLongPressing, ripplePosition } = useContextMenuWithLongPress({
        type: item.type === 'task' ? 'task' : 'routine',
        data: item.type === 'task' && item.originalTask
            ? { task: item.originalTask }
            : item.type === 'routine' && item.originalRoutine
                ? { routine: item.originalRoutine }
                : undefined,
    });

    const handleClick = () => {
        if (item.type === 'task' && item.originalTask) {
            onTaskClick(item.originalTask);
        } else if (item.type === 'routine' && item.originalRoutine) {
            openEditRoutineModal(item.originalRoutine);
        }
    };

    // 일반 업무의 기간 표시 스타일
    const getTaskRangeStyle = () => {
        if (item.type !== 'task') return '';

        if (item.isStart && item.isEnd) {
            return 'rounded'; // 시작과 끝이 같은 날
        } else if (item.isStart) {
            return 'rounded-l rounded-r-none mr-[-4px]'; // 시작일
        } else if (item.isEnd) {
            return 'rounded-r rounded-l-none ml-[-4px]'; // 마감일
        } else if (item.isMiddle) {
            return 'rounded-none mx-[-4px]'; // 중간 기간
        }
        return 'rounded';
    };

    const isRoutine = item.type === 'routine';
    const isCompleted = item.isCompleted || item.originalTask?.status === 'DONE';

    // 완료된 업무는 초록색, 루틴은 보라색, 일반은 우선순위 색상
    const colorClass = isCompleted
        ? 'bg-emerald-500'
        : isRoutine
            ? ROUTINE_COLORS[item.priority]
            : PRIORITY_COLORS[item.priority];

    // 배경색 클래스 결정
    const getBgClass = () => {
        if (isCompleted) {
            return 'bg-emerald-500/20 hover:bg-emerald-500/30 border-l-2 border-emerald-400';
        }
        if (isRoutine) {
            return 'bg-violet-500/10 hover:bg-violet-500/20 border-l-2 border-violet-400';
        }
        return 'bg-foreground/5 hover:bg-secondary';
    };

    // 텍스트 색상 결정
    const getTextClass = () => {
        if (isCompleted) {
            return 'text-emerald-300 line-through';
        }
        if (isRoutine) {
            return 'text-violet-300';
        }
        return 'text-muted-foreground';
    };

    return (
        <motion.div
            className={`relative flex items-center gap-1 p-1 cursor-pointer group select-none overflow-hidden ${getTaskRangeStyle()} ${getBgClass()}`}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            onClick={handleClick}
            whileHover={{ scale: 1.02 }}
            {...contextMenuProps}
        >
            <LongPressRipple isActive={isLongPressing} position={ripplePosition} />
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorClass}`} />
            <span className={`text-xs truncate group-hover:text-foreground ${getTextClass()}`}>
                {item.isMiddle && !item.isStart ? '' : item.title}
                {isRoutine && <RefreshCw className="w-2 h-2 inline ml-1 opacity-50" />}
            </span>
        </motion.div>
    );
}

// 특정 날짜에 해당하는 아이템들 (일반 업무 + 루틴) 가져오기
function getItemsForDate(date: Date, tasks: Task[], routines: RoutineTask[]): CalendarItem[] {
    const items: CalendarItem[] = [];
    const dayOfWeek = date.getDay(); // 0=일, 1=월, ..., 6=토

    // 1. 일반 업무: 시작일~마감일 전체 기간에 표시
    tasks.forEach((task) => {
        const startDate = task.startDate ? new Date(task.startDate) : null;
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;

        // 시작일과 마감일 모두 없으면 표시 안함
        if (!startDate && !dueDate) return;

        // 날짜만 비교를 위해 시간 제거
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const start = startDate
            ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
            : null;
        const end = dueDate
            ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
            : null;

        // 시작일만 있는 경우: 시작일에만 표시
        if (start && !end) {
            if (targetDate.getTime() === start.getTime()) {
                items.push({
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    type: 'task',
                    isStart: true,
                    isEnd: true,
                    isCompleted: task.status === 'DONE',
                    originalTask: task,
                });
            }
            return;
        }

        // 마감일만 있는 경우: 마감일에만 표시
        if (!start && end) {
            if (targetDate.getTime() === end.getTime()) {
                items.push({
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    type: 'task',
                    isStart: true,
                    isEnd: true,
                    isCompleted: task.status === 'DONE',
                    originalTask: task,
                });
            }
            return;
        }

        // 시작일과 마감일 모두 있는 경우: 전체 기간에 표시
        if (start && end) {
            const targetTime = targetDate.getTime();
            const startTime = start.getTime();
            const endTime = end.getTime();

            if (targetTime >= startTime && targetTime <= endTime) {
                items.push({
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    type: 'task',
                    isStart: targetTime === startTime,
                    isEnd: targetTime === endTime,
                    isMiddle: targetTime > startTime && targetTime < endTime,
                    isCompleted: task.status === 'DONE',
                    originalTask: task,
                });
            }
        }
    });

    // 2. 루틴 업무: 해당 요일에 반복되는 루틴 표시
    routines.forEach((routine) => {
        if (!routine.isActive) return;

        // 매일 반복 또는 해당 요일에 반복하는 루틴
        const isRoutineForThisDay =
            routine.repeatType === 'daily' ||
            routine.repeatDays.includes(dayOfWeek);

        if (isRoutineForThisDay) {
            items.push({
                id: routine.id,
                title: routine.title,
                priority: routine.priority,
                type: 'routine',
                originalRoutine: routine,
            });
        }
    });

    // 정렬: 일반 업무 먼저, 그 다음 루틴
    items.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'task' ? -1 : 1;
        }
        return 0;
    });

    return items;
}
