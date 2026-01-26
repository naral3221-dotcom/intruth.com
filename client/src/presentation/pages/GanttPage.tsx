import { useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, ChevronDown, GitBranch, Check, Circle, Loader2, Eye, Plus } from "lucide-react";
import type { Task as SpatialTask } from "@/domain/entities/Task";
import type { Task as ApiTask, TaskStatus } from "@/types";
// AnimatedSection and FloatingElement removed - not currently used
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore, type ContextMenuType, type ContextMenuData } from "@/stores/uiStore";
import { cn } from "@/core/utils/cn";
// @ts-ignore
import { addDays, format, differenceInDays } from "date-fns";

// Status 매핑 함수
const statusToSpatial = (status: TaskStatus): SpatialTask['status'] => {
    const map: Record<TaskStatus, SpatialTask['status']> = {
        'TODO': 'todo',
        'IN_PROGRESS': 'in-progress',
        'REVIEW': 'review',
        'DONE': 'done'
    };
    return map[status];
};

// API Task를 Spatial Task로 변환
const convertToSpatialTask = (task: ApiTask): SpatialTask => ({
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    content: task.description,
    status: statusToSpatial(task.status),
    priority: (task.priority?.toLowerCase() || 'medium') as SpatialTask['priority'],
    assigneeId: task.assignee?.id,
    assigneeIds: task.assignees?.map(a => a.id) || (task.assignee ? [task.assignee.id] : undefined),
    startDate: task.startDate ? new Date(task.startDate) : undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    tags: task.labels?.map(l => l.label.name) || [],
    createdAt: new Date(task.createdAt),
});

// 하위 업무 상태 변경 순환 (TODO -> IN_PROGRESS -> DONE -> TODO)
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

// 우선순위별 테두리/강조 색상
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

export function GanttPage() {
    const { tasks: storeTasks, loading, updateTaskStatus } = useTaskStore();
    const { projects } = useProjectStore();
    const { openEditTaskModal, openCreateSubtaskModal, openContextMenu } = useUIStore();
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    // 우클릭 핸들러
    const handleContextMenu = useCallback((
        e: React.MouseEvent,
        type: ContextMenuType,
        data?: ContextMenuData
    ) => {
        e.preventDefault();
        e.stopPropagation();

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

    // 드래그 스크롤 상태
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const bodyScrollRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 가로 스크롤 동기화 (헤더 <-> 바디)
    const syncHorizontalScroll = useCallback((source: 'header' | 'body', scrollValue: number) => {
        if (source === 'header' && bodyScrollRef.current) {
            bodyScrollRef.current.scrollLeft = scrollValue;
        } else if (source === 'body' && headerScrollRef.current) {
            headerScrollRef.current.scrollLeft = scrollValue;
        }
    }, []);

    // 세로 스크롤 동기화 (왼쪽 패널 <-> 오른쪽 바디)
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
        const walk = (x - startX) * 1.5; // 스크롤 속도 조절
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

    // Store의 tasks를 SpatialTask로 변환하고 날짜가 있는 것만 필터링
    const tasks = useMemo(() => {
        return storeTasks
            .map(convertToSpatialTask)
            .filter(t => t.startDate && t.dueDate);
    }, [storeTasks]);

    // 원본 tasks (subtasks 포함)
    const tasksWithSubtasks = storeTasks.filter(t => t.startDate && t.dueDate);

    const projectName = projects[0] ? `${projects[0].name} 일정` : "프로젝트 일정";

    // Timeline calculations
    const today = new Date();
    const timelineStart = addDays(today, -5);
    const timelineEnd = addDays(today, 30);
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    const DAY_WIDTH = 60;

    const getBarPosition = (start?: string | Date, end?: string | Date) => {
        if (!start || !end) return { left: 0, width: 0 };
        const startDate = typeof start === 'string' ? new Date(start) : start;
        const endDate = typeof end === 'string' ? new Date(end) : end;
        const effectiveStart = startDate < timelineStart ? timelineStart : startDate;
        const offsetDays = differenceInDays(effectiveStart, timelineStart);
        const durationDays = differenceInDays(endDate, effectiveStart) + 1;
        return {
            left: offsetDays * DAY_WIDTH,
            width: durationDays * DAY_WIDTH
        };
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">타임라인을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="h-full flex flex-col overflow-hidden space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{projectName}</h1>
                    <p className="text-muted-foreground text-sm mt-1">타임라인에서 전체 흐름을 파악하세요</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="aboard-btn-secondary inline-flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" /> 오늘
                    </button>
                </div>
            </header>

            {/* Legend */}
            <div className="aboard-card p-4 shrink-0">
                <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">상태:</span>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                            <span className="text-muted-foreground">대기</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-muted-foreground">진행중</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">검토</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">완료</span>
                        </div>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">우선순위:</span>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-muted-foreground">낮음</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-muted-foreground">보통</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-muted-foreground">높음</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-muted-foreground">긴급</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {tasks.length === 0 ? (
                    <div className="aboard-card flex flex-col items-center justify-center h-full">
                        <Calendar className="w-16 h-16 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground text-lg font-medium">일정이 등록된 업무가 없습니다</p>
                        <p className="text-muted-foreground/70 text-sm mt-2">업무에 시작일과 마감일을 설정해주세요</p>
                    </div>
                ) : (
                    <div className="h-full">
                        {/* Custom Gantt with Subtasks */}
                        <div className="flex flex-col h-full overflow-hidden aboard-card p-0">
                            {/* Timeline Header */}
                            <div className="flex border-b border-border overflow-hidden shrink-0">
                                <div className="w-96 shrink-0 p-4 border-r border-border bg-muted/50 font-semibold text-foreground">
                                    업무
                                </div>
                                <div
                                    ref={headerScrollRef}
                                    className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar cursor-grab select-none bg-muted/30"
                                    onMouseDown={(e) => handleMouseDown(e, headerScrollRef)}
                                    onMouseMove={(e) => handleMouseMove(e, headerScrollRef, 'header')}
                                    onMouseUp={() => handleMouseUp(headerScrollRef)}
                                    onMouseLeave={() => handleMouseLeave(headerScrollRef)}
                                    onScroll={(e) => syncHorizontalScroll('header', e.currentTarget.scrollLeft)}
                                >
                                    <div className="flex" style={{ width: totalDays * DAY_WIDTH }}>
                                        {days.map((day) => (
                                            <div key={day.toISOString()} className="w-[60px] shrink-0 border-r border-border/50 p-2 text-center">
                                                <div className="text-xs text-muted-foreground">{format(day, 'E')}</div>
                                                <div className={cn("text-sm font-bold",
                                                    format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? "text-primary" : "text-foreground"
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
                                    className="w-96 shrink-0 overflow-y-auto border-r border-border bg-card"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    onScroll={(e) => syncVerticalScroll('left', e.currentTarget.scrollTop)}
                                >
                                    {tasksWithSubtasks.map((task) => {
                                        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                        const isExpanded = expandedTasks.has(task.id);
                                        const completedSubtasks = task.subtasks?.filter(st => st.status === 'DONE').length || 0;
                                        const totalSubtasks = task.subtasks?.length || 0;

                                        return (
                                            <div key={task.id}>
                                                {/* Main Task Label: [상태] [우선순위] [업무명] [담당자] */}
                                                <div className="h-14 px-2 py-2 border-b border-border flex items-center gap-1.5 group hover:bg-muted/50 transition-colors">
                                                    {hasSubtasks ? (
                                                        <button
                                                            onClick={() => toggleExpand(task.id)}
                                                            className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
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
                                                        "aboard-badge text-[9px] shrink-0",
                                                        task.status === 'DONE' && "aboard-badge-success",
                                                        task.status === 'IN_PROGRESS' && "aboard-badge-info",
                                                        task.status === 'REVIEW' && "aboard-badge-warning",
                                                        task.status === 'TODO' && "bg-muted text-muted-foreground"
                                                    )}>
                                                        {task.status === 'DONE' ? '완료' : task.status === 'IN_PROGRESS' ? '진행중' : task.status === 'REVIEW' ? '검토' : '할일'}
                                                    </span>
                                                    {/* 우선순위 배지 */}
                                                    <span className={cn(
                                                        "aboard-badge text-[9px] shrink-0",
                                                        task.priority === 'URGENT' && "aboard-badge-danger",
                                                        task.priority === 'HIGH' && "aboard-badge-warning",
                                                        task.priority === 'MEDIUM' && "aboard-badge-info",
                                                        task.priority === 'LOW' && "bg-muted text-muted-foreground"
                                                    )}>
                                                        {task.priority === 'URGENT' ? '긴급' : task.priority === 'HIGH' ? '높음' : task.priority === 'MEDIUM' ? '보통' : '낮음'}
                                                    </span>
                                                    {/* 업무명 */}
                                                    <span
                                                        className="text-sm text-foreground truncate flex-1 min-w-0 cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => openEditTaskModal(task)}
                                                        onContextMenu={(e) => handleContextMenu(e, 'task', { task })}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {/* 담당자 배지 */}
                                                    {task.assignees && task.assignees.length > 0 ? (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {task.assignees.slice(0, 2).map((assignee) => (
                                                                <span
                                                                    key={assignee.id}
                                                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary"
                                                                >
                                                                    {assignee.name}
                                                                </span>
                                                            ))}
                                                            {task.assignees.length > 2 && (
                                                                <span className="text-[9px] text-muted-foreground">+{task.assignees.length - 2}</span>
                                                            )}
                                                        </div>
                                                    ) : task.assignee ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary shrink-0">
                                                            {task.assignee.name}
                                                        </span>
                                                    ) : null}
                                                    {/* 하위 업무 카운터 */}
                                                    {hasSubtasks && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary shrink-0">
                                                            <GitBranch className="w-3 h-3" />
                                                            {completedSubtasks}/{totalSubtasks}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openCreateSubtaskModal(task);
                                                        }}
                                                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 transition-all shrink-0"
                                                        title="하위 업무 추가"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 text-primary" />
                                                    </button>
                                                </div>

                                                {/* Subtask Labels */}
                                                <AnimatePresence>
                                                    {isExpanded && task.subtasks?.map((subtask, idx) => (
                                                        <motion.div
                                                            key={subtask.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 48 }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                            className="px-3 py-2 border-b border-border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-2"
                                                        >
                                                            <div className="w-6" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateTaskStatus(subtask.id, getNextStatus(subtask.status));
                                                                }}
                                                                className={cn(
                                                                    "w-5 h-5 rounded flex items-center justify-center transition-all hover:scale-110",
                                                                    subtask.status === 'DONE' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                                                                    subtask.status === 'IN_PROGRESS' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                                                    subtask.status === 'REVIEW' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                                                                    subtask.status === 'TODO' && "bg-muted text-muted-foreground",
                                                                )}
                                                                title={`상태 변경: ${subtask.status} → ${getNextStatus(subtask.status)}`}
                                                            >
                                                                <StatusIcon status={subtask.status} />
                                                            </button>
                                                            <span
                                                                className={cn(
                                                                    "text-xs truncate flex-1 cursor-pointer hover:text-primary transition-colors",
                                                                    subtask.status === 'DONE' ? "text-muted-foreground line-through" : "text-foreground"
                                                                )}
                                                                onClick={() => openEditTaskModal(subtask as ApiTask)}
                                                                onContextMenu={(e) => handleContextMenu(e, 'task', { task: subtask as ApiTask })}
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
                                </div>

                                {/* 오른쪽 스크롤 영역 - 타임라인 바 */}
                                <div
                                    ref={bodyScrollRef}
                                    className="flex-1 overflow-x-auto overflow-y-auto cursor-grab select-none bg-card"
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
                                                <div key={`grid-${day.toISOString()}`} className="w-[60px] shrink-0 border-r border-border/30 h-full" />
                                            ))}
                                        </div>

                                        {/* Current Time Indicator */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-primary z-0 shadow-[0_0_10px_rgba(0,188,212,0.5)]"
                                            style={{ left: differenceInDays(today, timelineStart) * DAY_WIDTH + (DAY_WIDTH / 2) }}
                                        />

                                        {/* Task Bars */}
                                        {tasksWithSubtasks.map((task) => {
                                            const { left, width } = getBarPosition(task.startDate, task.dueDate);
                                            const isExpanded = expandedTasks.has(task.id);
                                            const statusColor = getStatusBarColor(task.status);
                                            const priorityStyle = getPriorityStyle(task.priority);

                                            return (
                                                <div key={task.id}>
                                                    {/* Main Task Bar */}
                                                    <div className="h-14 relative border-b border-border">
                                                        {width > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scaleX: 0 }}
                                                                animate={{ opacity: 1, scaleX: 1 }}
                                                                transition={{ delay: 0.2, type: "spring" }}
                                                                className={cn(
                                                                    "absolute top-2 h-10 rounded-lg cursor-pointer group/bar flex items-center px-3 bg-linear-to-r hover:brightness-110 transition-all shadow-sm",
                                                                    statusColor,
                                                                    priorityStyle.border
                                                                )}
                                                                style={{ left: left + 4, width: width - 8 }}
                                                                onClick={() => openEditTaskModal(task)}
                                                                onContextMenu={(e) => handleContextMenu(e, 'task', { task })}
                                                            >
                                                                {/* 우선순위 인디케이터 */}
                                                                <span className={cn(
                                                                    "w-2 h-2 rounded-full mr-2 shrink-0",
                                                                    priorityStyle.indicator
                                                                )} />
                                                                <span className="text-xs font-bold text-white drop-shadow-sm truncate">
                                                                    {task.title}
                                                                </span>
                                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-xs text-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={cn("w-2 h-2 rounded-full", priorityStyle.indicator)} />
                                                                        <span className="font-medium">{task.priority}</span>
                                                                        <span className="text-muted-foreground">·</span>
                                                                        <span>{task.status}</span>
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        {task.startDate && format(new Date(task.startDate), 'MM/dd')} - {task.dueDate && format(new Date(task.dueDate), 'MM/dd')}
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
                                                                    animate={{ opacity: 1, height: 48 }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                                    className="relative border-b border-border bg-muted/30"
                                                                >
                                                                    {subtaskPos.width > 0 && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scaleX: 0 }}
                                                                            animate={{ opacity: 1, scaleX: 1 }}
                                                                            className={cn(
                                                                                "absolute top-2 h-7 rounded cursor-pointer group/subbar hover:scale-105 transition-transform",
                                                                                subtaskPriorityStyle.border
                                                                            )}
                                                                            style={{ left: subtaskPos.left + 4, width: subtaskPos.width - 8 }}
                                                                            onClick={() => openEditTaskModal(subtask as ApiTask)}
                                                                            onContextMenu={(e) => handleContextMenu(e, 'task', { task: subtask as ApiTask })}
                                                                        >
                                                                            <div className={cn(
                                                                                "w-full h-full rounded flex items-center px-2 transition-all bg-linear-to-r shadow-sm",
                                                                                subtaskStatusColor
                                                                            )}>
                                                                                {/* 우선순위 인디케이터 */}
                                                                                <span className={cn(
                                                                                    "w-1.5 h-1.5 rounded-full mr-1.5 shrink-0",
                                                                                    subtaskPriorityStyle.indicator
                                                                                )} />
                                                                                <span className="text-[10px] text-white/90 truncate font-medium">
                                                                                    {subtask.title}
                                                                                </span>
                                                                            </div>
                                                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-lg bg-popover border border-border shadow-lg text-[10px] text-foreground opacity-0 group-hover/subbar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                                    <span className={cn("w-1.5 h-1.5 rounded-full", subtaskPriorityStyle.indicator)} />
                                                                                    <span>{subtask.priority}</span>
                                                                                    <span className="text-muted-foreground">·</span>
                                                                                    <span>{subtask.status}</span>
                                                                                </div>
                                                                                <div className="text-muted-foreground">
                                                                                    {subtask.startDate && format(new Date(subtask.startDate), 'MM/dd')} - {subtask.dueDate && format(new Date(subtask.dueDate), 'MM/dd')}
                                                                                </div>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
