import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    ChevronRight,
    ChevronDown,
    GitBranch,
    Check,
    Circle,
    Loader2,
    Eye,
    Plus,
    RefreshCw
} from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { useUIStore, type ContextMenuType, type ContextMenuData } from "@/stores/uiStore";
import { useTaskStore } from "@/stores/taskStore";
import { useRoutineStore } from "@/stores/routineStore";
import { cn } from "@/core/utils/cn";
// @ts-ignore
import { addDays, format, differenceInDays } from "date-fns";
import type { Task, TaskStatus, RoutineTask } from "@/types";

interface TaskTimelineViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

// 상태별 바 색상
const getStatusBarColor = (status: TaskStatus) => {
    switch (status) {
        case 'DONE':
            return 'from-emerald-500/80 to-teal-500/80';
        case 'IN_PROGRESS':
            return 'from-blue-500/80 to-cyan-500/80';
        case 'REVIEW':
            return 'from-amber-500/80 to-orange-500/80';
        default: // TODO
            return 'from-gray-500/80 to-slate-500/80';
    }
};

// 우선순위별 스타일
const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
        case 'URGENT':
            return {
                border: 'border-2 border-red-500',
                indicator: 'bg-red-500',
                shadow: 'shadow-lg shadow-red-500/30'
            };
        case 'HIGH':
            return {
                border: 'border-2 border-orange-400',
                indicator: 'bg-orange-400',
                shadow: 'shadow-lg shadow-orange-400/30'
            };
        case 'MEDIUM':
            return {
                border: 'border border-yellow-400/50',
                indicator: 'bg-yellow-400',
                shadow: ''
            };
        default: // LOW
            return {
                border: 'border border-transparent',
                indicator: 'bg-green-400',
                shadow: ''
            };
    }
};

// 하위 업무 상태 변경 순환
const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
    const statusCycle: Record<TaskStatus, TaskStatus> = {
        'TODO': 'IN_PROGRESS',
        'IN_PROGRESS': 'DONE',
        'REVIEW': 'DONE',
        'DONE': 'TODO'
    };
    return statusCycle[currentStatus];
};

// 상태별 아이콘 컴포넌트
const StatusIcon = ({ status }: { status: TaskStatus }) => {
    switch (status) {
        case 'DONE':
            return <Check className="w-3 h-3" />;
        case 'IN_PROGRESS':
            return <Loader2 className="w-3 h-3 animate-spin" />;
        case 'REVIEW':
            return <Eye className="w-3 h-3" />;
        default:
            return <Circle className="w-3 h-3" />;
    }
};

export function TaskTimelineView({ tasks, onTaskClick }: TaskTimelineViewProps) {
    const { openEditTaskModal, openCreateSubtaskModal, openEditRoutineModal, openContextMenu } = useUIStore();
    const { updateTaskStatus } = useTaskStore();
    const { allRoutines, fetchAllRoutines, loading: routineLoading } = useRoutineStore();
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // 우클릭 핸들러
    const handleContextMenu = useCallback((
        e: React.MouseEvent,
        type: ContextMenuType,
        data?: ContextMenuData
    ) => {
        e.preventDefault();
        e.stopPropagation();

        // 화면 경계 체크
        const menuWidth = 200;
        const menuHeight = 250;
        const padding = 10;

        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth + padding > window.innerWidth) {
            x = window.innerWidth - menuWidth - padding;
        }
        if (y + menuHeight + padding > window.innerHeight) {
            y = window.innerHeight - menuHeight - padding;
        }
        x = Math.max(padding, x);
        y = Math.max(padding, y);

        openContextMenu(type, { x, y }, data);
    }, [openContextMenu]);

    // 루틴 데이터 로드 (본인 루틴만 가져오기)
    useEffect(() => {
        fetchAllRoutines(true); // personal: true - 본인 루틴만
    }, [fetchAllRoutines]);

    // 드래그 스크롤 상태
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const bodyScrollRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 가로 스크롤 동기화
    const syncHorizontalScroll = useCallback((source: 'header' | 'body', scrollValue: number) => {
        if (source === 'header' && bodyScrollRef.current) {
            bodyScrollRef.current.scrollLeft = scrollValue;
        } else if (source === 'body' && headerScrollRef.current) {
            headerScrollRef.current.scrollLeft = scrollValue;
        }
    }, []);

    // 세로 스크롤 동기화
    const syncVerticalScroll = useCallback((source: 'left' | 'right', scrollValue: number) => {
        if (source === 'left' && bodyScrollRef.current) {
            bodyScrollRef.current.scrollTop = scrollValue;
        } else if (source === 'right' && leftPanelRef.current) {
            leftPanelRef.current.scrollTop = scrollValue;
        }
    }, []);

    // 드래그 시작
    const handleMouseDown = useCallback((e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
        ref.current.style.cursor = 'grabbing';
    }, []);

    // 드래그 중
    const handleMouseMove = useCallback((e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>, source: 'header' | 'body') => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        const newScrollLeft = scrollLeft - walk;
        ref.current.scrollLeft = newScrollLeft;
        syncHorizontalScroll(source, newScrollLeft);
    }, [isDragging, startX, scrollLeft, syncHorizontalScroll]);

    // 드래그 종료
    const handleMouseUp = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
        setIsDragging(false);
        if (ref.current) {
            ref.current.style.cursor = 'grab';
        }
    }, []);

    // 마우스가 영역을 벗어났을 때
    const handleMouseLeave = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
        if (isDragging) {
            setIsDragging(false);
            if (ref.current) {
                ref.current.style.cursor = 'grab';
            }
        }
    }, [isDragging]);

    const toggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // 날짜가 있는 업무만 필터링
    const tasksWithDates = useMemo(() => {
        return tasks.filter(t => t.startDate || t.dueDate);
    }, [tasks]);

    // Timeline calculations
    const today = new Date();
    const timelineStart = addDays(today, -5);
    const timelineEnd = addDays(today, 30);
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    const DAY_WIDTH = 60;

    const getBarPosition = (start?: string | Date, end?: string | Date) => {
        if (!start && !end) return { left: 0, width: 0 };

        const startDate = start ? (typeof start === 'string' ? new Date(start) : start) : null;
        const endDate = end ? (typeof end === 'string' ? new Date(end) : end) : null;

        // 시작일만 있는 경우
        if (startDate && !endDate) {
            const effectiveStart = startDate < timelineStart ? timelineStart : startDate;
            const offsetDays = differenceInDays(effectiveStart, timelineStart);
            return {
                left: offsetDays * DAY_WIDTH,
                width: DAY_WIDTH // 하루짜리
            };
        }

        // 마감일만 있는 경우
        if (!startDate && endDate) {
            const effectiveEnd = endDate < timelineStart ? timelineStart : endDate;
            const offsetDays = differenceInDays(effectiveEnd, timelineStart);
            return {
                left: offsetDays * DAY_WIDTH,
                width: DAY_WIDTH // 하루짜리
            };
        }

        // 둘 다 있는 경우
        if (startDate && endDate) {
            const effectiveStart = startDate < timelineStart ? timelineStart : startDate;
            const offsetDays = differenceInDays(effectiveStart, timelineStart);
            const durationDays = differenceInDays(endDate, effectiveStart) + 1;
            return {
                left: offsetDays * DAY_WIDTH,
                width: Math.max(durationDays * DAY_WIDTH, DAY_WIDTH)
            };
        }

        return { left: 0, width: 0 };
    };

    // 루틴이 해당 날짜에 표시되어야 하는지 확인
    const isRoutineOnDay = (routine: RoutineTask, day: Date): boolean => {
        if (!routine.isActive) return false;
        const dayOfWeek = day.getDay();
        return routine.repeatType === 'daily' || routine.repeatDays.includes(dayOfWeek);
    };

    // 오늘로 스크롤
    const scrollToToday = useCallback(() => {
        const todayOffset = differenceInDays(today, timelineStart) * DAY_WIDTH;
        if (headerScrollRef.current) {
            headerScrollRef.current.scrollLeft = todayOffset - 200;
        }
        if (bodyScrollRef.current) {
            bodyScrollRef.current.scrollLeft = todayOffset - 200;
        }
    }, [today, timelineStart]);

    if (tasksWithDates.length === 0 && allRoutines.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">일정이 등록된 업무가 없습니다</p>
                <p className="text-muted-foreground text-sm mt-2">
                    업무에 시작일과 마감일을 설정해주세요
                </p>
            </Card>
        );
    }

    return (
        <Card className="p-0 overflow-hidden">
            {/* Header with Legend */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">타임라인</h3>
                    {/* 범례 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <span className="font-medium text-muted-foreground">상태:</span>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                <span>대기</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                <span>진행중</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>검토</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>완료</span>
                            </div>
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                            <span>루틴</span>
                        </div>
                        {routineLoading && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>로딩 중...</span>
                            </div>
                        )}
                    </div>
                </div>
                <button
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground"
                    onClick={scrollToToday}
                >
                    <Calendar className="w-4 h-4" /> 오늘
                </button>
            </div>

            {/* Gantt Chart */}
            <div className="flex flex-col h-[500px] overflow-hidden">
                {/* Timeline Header */}
                <div className="flex border-b border-border overflow-hidden shrink-0">
                    <div className="w-80 shrink-0 p-3 border-r border-border bg-background/50 backdrop-blur font-bold text-foreground text-sm">
                        업무
                    </div>
                    <div
                        ref={headerScrollRef}
                        className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar cursor-grab select-none"
                        onMouseDown={(e) => handleMouseDown(e, headerScrollRef)}
                        onMouseMove={(e) => handleMouseMove(e, headerScrollRef, 'header')}
                        onMouseUp={() => handleMouseUp(headerScrollRef)}
                        onMouseLeave={() => handleMouseLeave(headerScrollRef)}
                        onScroll={(e) => syncHorizontalScroll('header', e.currentTarget.scrollLeft)}
                    >
                        <div className="flex" style={{ width: totalDays * DAY_WIDTH }}>
                            {days.map((day) => (
                                <div key={day.toISOString()} className="w-[60px] shrink-0 border-r border-foreground/5 p-2 text-center">
                                    <div className="text-xs text-muted-foreground">{format(day, 'E')}</div>
                                    <div className={cn("text-sm font-bold",
                                        format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Gantt Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* 왼쪽 고정 영역 - 업무명 */}
                    <div
                        ref={leftPanelRef}
                        className="w-80 shrink-0 overflow-y-auto border-r border-border bg-background/30"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onScroll={(e) => syncVerticalScroll('left', e.currentTarget.scrollTop)}
                    >
                        {/* 일반 업무 */}
                        {tasksWithDates.map((task) => {
                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                            const isExpanded = expandedTasks.has(task.id);
                            const completedSubtasks = task.subtasks?.filter(st => st.status === 'DONE').length || 0;
                            const totalSubtasks = task.subtasks?.length || 0;

                            return (
                                <div key={task.id}>
                                    <div className="h-12 px-2 py-2 border-b border-foreground/5 flex items-center gap-1.5 group hover:bg-foreground/5 transition-colors">
                                        {hasSubtasks ? (
                                            <button
                                                onClick={() => toggleExpand(task.id)}
                                                className="p-0.5 rounded hover:bg-secondary transition-colors shrink-0"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-5 shrink-0" />
                                        )}
                                        {/* 상태 배지 */}
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                                            task.status === 'DONE' && "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                                            task.status === 'IN_PROGRESS' && "text-blue-400 bg-blue-500/10 border-blue-500/30",
                                            task.status === 'REVIEW' && "text-amber-400 bg-amber-500/10 border-amber-500/30",
                                            task.status === 'TODO' && "text-gray-400 bg-gray-500/10 border-gray-500/30"
                                        )}>
                                            {task.status === 'DONE' ? '완료' : task.status === 'IN_PROGRESS' ? '진행중' : task.status === 'REVIEW' ? '검토' : '할일'}
                                        </span>
                                        {/* 우선순위 배지 */}
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                                            task.priority === 'URGENT' && "text-red-400 bg-red-500/10 border-red-500/30",
                                            task.priority === 'HIGH' && "text-orange-400 bg-orange-500/10 border-orange-500/30",
                                            task.priority === 'MEDIUM' && "text-blue-400 bg-blue-500/10 border-blue-500/30",
                                            task.priority === 'LOW' && "text-gray-400 bg-gray-500/10 border-gray-500/30"
                                        )}>
                                            {task.priority === 'URGENT' ? '긴급' : task.priority === 'HIGH' ? '높음' : task.priority === 'MEDIUM' ? '보통' : '낮음'}
                                        </span>
                                        {/* 업무명 */}
                                        <span
                                            className="text-xs text-muted-foreground truncate flex-1 min-w-0 cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => onTaskClick(task)}
                                            onContextMenu={(e) => handleContextMenu(e, 'task', { task })}
                                        >
                                            {task.title}
                                        </span>
                                        {/* 하위 업무 카운터 */}
                                        {hasSubtasks && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300 shrink-0">
                                                <GitBranch className="w-3 h-3" />
                                                {completedSubtasks}/{totalSubtasks}
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openCreateSubtaskModal(task);
                                            }}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-violet-500/20 transition-all shrink-0"
                                            title="하위 업무 추가"
                                        >
                                            <Plus className="w-3.5 h-3.5 text-violet-400" />
                                        </button>
                                    </div>

                                    {/* Subtask Labels */}
                                    <AnimatePresence>
                                        {isExpanded && task.subtasks?.map((subtask, idx) => (
                                            <motion.div
                                                key={subtask.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 40 }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                className="px-3 py-2 border-b border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/5 transition-colors flex items-center gap-2"
                                            >
                                                <div className="w-6" />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateTaskStatus(subtask.id, getNextStatus(subtask.status));
                                                    }}
                                                    className={cn(
                                                        "w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110",
                                                        subtask.status === 'DONE' && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
                                                        subtask.status === 'IN_PROGRESS' && "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
                                                        subtask.status === 'REVIEW' && "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                                                        subtask.status === 'TODO' && "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30",
                                                    )}
                                                    title={`상태 변경: ${subtask.status} → ${getNextStatus(subtask.status)}`}
                                                >
                                                    <StatusIcon status={subtask.status} />
                                                </button>
                                                <span
                                                    className={cn(
                                                        "text-xs truncate flex-1 cursor-pointer hover:text-foreground transition-colors",
                                                        subtask.status === 'DONE' ? "text-muted-foreground line-through hover:text-muted-foreground" : "text-muted-foreground"
                                                    )}
                                                    onClick={() => openEditTaskModal(subtask as Task)}
                                                    onContextMenu={(e) => handleContextMenu(e, 'task', { task: subtask as Task })}
                                                    title="클릭하여 수정"
                                                >
                                                    {subtask.title}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* 루틴 업무 섹션 */}
                        {allRoutines.filter(r => r.isActive).length > 0 && (
                            <>
                                <div className="h-8 px-3 py-1.5 border-b border-border bg-violet-500/10 flex items-center gap-2">
                                    <RefreshCw className="w-3 h-3 text-violet-400" />
                                    <span className="text-xs font-medium text-violet-300">루틴 업무</span>
                                </div>
                                {allRoutines.filter(r => r.isActive).map((routine) => (
                                    <div
                                        key={routine.id}
                                        className="h-10 px-3 py-2 border-b border-foreground/5 flex items-center gap-2 hover:bg-violet-500/5 cursor-pointer transition-colors"
                                        onClick={() => openEditRoutineModal(routine)}
                                        onContextMenu={(e) => handleContextMenu(e, 'routine', { routine })}
                                    >
                                        <RefreshCw className="w-3 h-3 text-violet-400 shrink-0" />
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                                            routine.priority === 'URGENT' && "text-red-400 bg-red-500/10 border-red-500/30",
                                            routine.priority === 'HIGH' && "text-orange-400 bg-orange-500/10 border-orange-500/30",
                                            routine.priority === 'MEDIUM' && "text-violet-400 bg-violet-500/10 border-violet-500/30",
                                            routine.priority === 'LOW' && "text-gray-400 bg-gray-500/10 border-gray-500/30"
                                        )}>
                                            {routine.repeatType === 'daily' ? '매일' : routine.repeatType === 'weekly' ? '평일' : '주간'}
                                        </span>
                                        <span className="text-xs text-violet-300 truncate flex-1">{routine.title}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* 오른쪽 스크롤 영역 - 타임라인 바 */}
                    <div
                        ref={bodyScrollRef}
                        className="flex-1 overflow-x-auto overflow-y-auto cursor-grab select-none"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onMouseDown={(e) => handleMouseDown(e, bodyScrollRef)}
                        onMouseMove={(e) => handleMouseMove(e, bodyScrollRef, 'body')}
                        onMouseUp={() => handleMouseUp(bodyScrollRef)}
                        onMouseLeave={() => handleMouseLeave(bodyScrollRef)}
                        onScroll={(e) => {
                            syncHorizontalScroll('body', e.currentTarget.scrollLeft);
                            syncVerticalScroll('right', e.currentTarget.scrollTop);
                        }}
                    >
                        <div className="relative" style={{ width: totalDays * DAY_WIDTH, minHeight: '100%' }}>
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex">
                                {days.map((day) => (
                                    <div key={`grid-${day.toISOString()}`} className="w-[60px] shrink-0 border-r border-foreground/5 h-full" />
                                ))}
                            </div>

                            {/* Current Time Indicator */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                                style={{ left: differenceInDays(today, timelineStart) * DAY_WIDTH + (DAY_WIDTH / 2) }}
                            />

                            {/* Task Bars */}
                            {tasksWithDates.map((task) => {
                                const { left, width } = getBarPosition(task.startDate, task.dueDate);
                                const isExpanded = expandedTasks.has(task.id);
                                const statusColor = getStatusBarColor(task.status);
                                const priorityStyle = getPriorityStyle(task.priority);

                                return (
                                    <div key={task.id}>
                                        {/* Main Task Bar */}
                                        <div className="h-12 relative border-b border-foreground/5">
                                            {width > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, scaleX: 0 }}
                                                    animate={{ opacity: 1, scaleX: 1 }}
                                                    transition={{ delay: 0.2, type: "spring" }}
                                                    className={cn(
                                                        "absolute top-1.5 h-9 rounded-lg cursor-pointer group/bar flex items-center px-2 bg-gradient-to-r hover:brightness-110 transition-all",
                                                        statusColor,
                                                        priorityStyle.border,
                                                        priorityStyle.shadow
                                                    )}
                                                    style={{ left: left + 4, width: width - 8 }}
                                                    onClick={() => onTaskClick(task)}
                                                    onContextMenu={(e) => handleContextMenu(e, 'task', { task })}
                                                >
                                                    <span className={cn(
                                                        "w-2 h-2 rounded-full mr-2 shrink-0",
                                                        priorityStyle.indicator
                                                    )} />
                                                    <span className="text-xs font-bold text-foreground drop-shadow-md truncate">
                                                        {task.title}
                                                    </span>
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded bg-popover text-xs text-popover-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn("w-2 h-2 rounded-full", priorityStyle.indicator)} />
                                                            <span className="font-medium">{task.priority}</span>
                                                            <span className="text-muted-foreground">·</span>
                                                            <span>{task.status}</span>
                                                        </div>
                                                        <div className="text-muted-foreground">
                                                            {task.startDate && format(new Date(task.startDate), 'MM/dd')}
                                                            {task.startDate && task.dueDate && ' - '}
                                                            {task.dueDate && format(new Date(task.dueDate), 'MM/dd')}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Subtask Bars */}
                                        <AnimatePresence>
                                            {isExpanded && task.subtasks?.map((subtask, idx) => {
                                                const subtaskPos = getBarPosition(subtask.startDate, subtask.dueDate);
                                                const subtaskStatusColor = getStatusBarColor(subtask.status);
                                                const subtaskPriorityStyle = getPriorityStyle(subtask.priority);
                                                return (
                                                    <motion.div
                                                        key={subtask.id}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 40 }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                        className="relative border-b border-foreground/5 bg-foreground/[0.02]"
                                                    >
                                                        {subtaskPos.width > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scaleX: 0 }}
                                                                animate={{ opacity: 1, scaleX: 1 }}
                                                                className={cn(
                                                                    "absolute top-1.5 h-6 rounded cursor-pointer group/subbar hover:scale-105 transition-transform",
                                                                    subtaskPriorityStyle.border,
                                                                    subtaskPriorityStyle.shadow
                                                                )}
                                                                style={{ left: subtaskPos.left + 4, width: subtaskPos.width - 8 }}
                                                                onClick={() => openEditTaskModal(subtask as Task)}
                                                                onContextMenu={(e) => handleContextMenu(e, 'task', { task: subtask as Task })}
                                                            >
                                                                <div className={cn(
                                                                    "w-full h-full rounded flex items-center px-2 transition-all bg-gradient-to-r",
                                                                    subtaskStatusColor
                                                                )}>
                                                                    <span className={cn(
                                                                        "w-1.5 h-1.5 rounded-full mr-1.5 shrink-0",
                                                                        subtaskPriorityStyle.indicator
                                                                    )} />
                                                                    <span className="text-[10px] text-white/90 truncate font-medium">
                                                                        {subtask.title}
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}

                            {/* Routine Bars */}
                            {allRoutines.filter(r => r.isActive).length > 0 && (
                                <>
                                    {/* 루틴 섹션 헤더 바 공간 */}
                                    <div className="h-8 border-b border-border bg-violet-500/5" />

                                    {allRoutines.filter(r => r.isActive).map((routine) => (
                                        <div key={routine.id} className="h-10 relative border-b border-foreground/5">
                                            {/* 루틴은 해당하는 요일마다 작은 마커로 표시 */}
                                            {days.map((day) => {
                                                if (!isRoutineOnDay(routine, day)) return null;
                                                const dayOffset = differenceInDays(day, timelineStart) * DAY_WIDTH;
                                                return (
                                                    <motion.div
                                                        key={`${routine.id}-${day.toISOString()}`}
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="absolute top-1.5 h-7 w-[52px] rounded bg-gradient-to-r from-violet-500/60 to-purple-500/60 border border-violet-400/50 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center"
                                                        style={{ left: dayOffset + 4 }}
                                                        onClick={() => openEditRoutineModal(routine)}
                                                        onContextMenu={(e) => handleContextMenu(e, 'routine', { routine })}
                                                    >
                                                        <RefreshCw className="w-3 h-3 text-foreground/80" />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
