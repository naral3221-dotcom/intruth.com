import { useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, GitBranch, Check, Circle, Loader2, Eye, Plus, Calendar } from "lucide-react";
import type { Project, Task, TaskStatus } from "@/types";
import { useUIStore } from "@/stores/uiStore";
import { useTaskStore } from "@/stores/taskStore";
import { cn } from "@/core/utils/cn";
// @ts-ignore
import { addDays, format, differenceInDays } from "date-fns";

interface ProjectTimelineViewProps {
    projects: Project[];
    onProjectClick?: (project: Project) => void;
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
        default:
            return 'from-gray-500/80 to-slate-500/80';
    }
};

// 우선순위별 스타일
const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
        case 'URGENT':
            return { border: 'border-2 border-red-500', indicator: 'bg-red-500', shadow: 'shadow-lg shadow-red-500/30' };
        case 'HIGH':
            return { border: 'border-2 border-orange-400', indicator: 'bg-orange-400', shadow: 'shadow-lg shadow-orange-400/30' };
        case 'MEDIUM':
            return { border: 'border border-yellow-400/50', indicator: 'bg-yellow-400', shadow: '' };
        default:
            return { border: 'border border-transparent', indicator: 'bg-green-400', shadow: '' };
    }
};

// 상태별 아이콘
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

// 하위 업무 상태 변경
const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
    const statusCycle: Record<TaskStatus, TaskStatus> = {
        'TODO': 'IN_PROGRESS',
        'IN_PROGRESS': 'DONE',
        'REVIEW': 'DONE',
        'DONE': 'TODO'
    };
    return statusCycle[currentStatus];
};

// 열 너비 최소/최대값
const MIN_COLUMN_WIDTH = 200;
const MAX_COLUMN_WIDTH = 600;
const DEFAULT_COLUMN_WIDTH = 320;

export function ProjectTimelineView({ projects, onProjectClick }: ProjectTimelineViewProps) {
    const { tasks: storeTasks, updateTaskStatus } = useTaskStore();
    const { openEditTaskModal, openCreateSubtaskModal } = useUIStore();
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));

    // 열 너비 조절 상태
    const [columnWidth, setColumnWidth] = useState(DEFAULT_COLUMN_WIDTH);
    const [isResizingColumn, setIsResizingColumn] = useState(false);

    // 열 너비 조절 핸들러
    const handleColumnResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizingColumn(true);

        const startX = e.clientX;
        const startWidth = columnWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + delta));
            setColumnWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizingColumn(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidth]);

    // 드래그 스크롤
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

    const handleMouseDown = useCallback((e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
        ref.current.style.cursor = 'grabbing';
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>, source: 'header' | 'body') => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        const newScrollLeft = scrollLeft - walk;
        ref.current.scrollLeft = newScrollLeft;
        syncHorizontalScroll(source, newScrollLeft);
    }, [isDragging, startX, scrollLeft, syncHorizontalScroll]);

    const handleMouseUp = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
        setIsDragging(false);
        if (ref.current) ref.current.style.cursor = 'grab';
    }, []);

    const handleMouseLeave = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
        if (isDragging) {
            setIsDragging(false);
            if (ref.current) ref.current.style.cursor = 'grab';
        }
    }, [isDragging]);

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    };

    const toggleTask = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    // 프로젝트별 업무 그룹화 (날짜 없는 업무도 포함)
    const projectsWithTasks = useMemo(() => {
        return projects.map(project => ({
            ...project,
            tasks: storeTasks.filter(t => t.projectId === project.id)
        }));
    }, [projects, storeTasks]);

    // Timeline 계산
    const today = new Date();
    const timelineStart = addDays(today, -5);
    const timelineEnd = addDays(today, 30);
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    const DAY_WIDTH = 60;

    // 날짜 문자열을 로컬 날짜로 파싱 (시간대 오프셋 무시)
    const parseLocalDate = (dateStr: string | Date): Date => {
        if (dateStr instanceof Date) {
            // Date 객체인 경우 로컬 날짜 부분만 추출
            return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
        }
        // 문자열인 경우 YYYY-MM-DD 형식으로 파싱
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const getBarPosition = (start?: string | Date, end?: string | Date) => {
        // 날짜가 없으면 오늘 기준으로 표시 (1일 기간)
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const timelineStartLocal = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), timelineStart.getDate());

        const startDate = start ? parseLocalDate(start) : todayLocal;
        const endDate = end ? parseLocalDate(end) : (start ? parseLocalDate(start) : todayLocal);

        const effectiveStart = startDate < timelineStartLocal ? timelineStartLocal : startDate;
        const offsetDays = differenceInDays(effectiveStart, timelineStartLocal);
        const durationDays = Math.max(1, differenceInDays(endDate, effectiveStart) + 1);
        return { left: offsetDays * DAY_WIDTH, width: durationDays * DAY_WIDTH };
    };

    const allTasks = projectsWithTasks.flatMap(p => p.tasks);
    if (allTasks.length === 0) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <Calendar className="w-20 h-20 text-gray-600 mb-4" />
                <p className="text-gray-500 text-lg">일정이 등록된 업무가 없습니다</p>
                <p className="text-gray-600 text-sm mt-2">업무에 시작일과 마감일을 설정해주세요</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={cn(
                "flex flex-col h-[calc(100vh-380px)] min-h-[400px] overflow-hidden bg-midnight-800/30 rounded-3xl border border-white/5 backdrop-blur-sm",
                isResizingColumn && "select-none cursor-col-resize"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Timeline Header */}
            <div className="flex border-b border-white/10 overflow-hidden shrink-0">
                <div
                    className="shrink-0 p-4 border-r border-white/10 bg-midnight-900/50 backdrop-blur font-bold text-white relative"
                    style={{ width: columnWidth }}
                >
                    프로젝트 / 업무
                    {/* 열 너비 조절 핸들 */}
                    <div
                        className={cn(
                            "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group/resizer z-10",
                            "hover:bg-neon-violet/30 transition-colors",
                            isResizingColumn && "bg-neon-violet/50"
                        )}
                        onMouseDown={handleColumnResizeStart}
                    >
                        <div className={cn(
                            "absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
                            "bg-gray-500/50 group-hover/resizer:bg-neon-violet transition-colors",
                            isResizingColumn && "bg-neon-violet"
                        )} />
                    </div>
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
                            <div key={day.toISOString()} className="w-[60px] shrink-0 border-r border-white/5 p-2 text-center">
                                <div className="text-xs text-gray-500">{format(day, 'E')}</div>
                                <div className={cn("text-sm font-bold",
                                    format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? "text-neon-violet" : "text-gray-300"
                                )}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left - Labels */}
                <div
                    ref={leftPanelRef}
                    className="shrink-0 overflow-y-auto border-r border-white/10 bg-midnight-900/30 relative"
                    style={{ width: columnWidth, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={(e) => syncVerticalScroll('left', e.currentTarget.scrollTop)}
                >
                    {/* 열 너비 조절 핸들 (바디 영역) */}
                    <div
                        className={cn(
                            "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group/resizer z-10",
                            "hover:bg-neon-violet/30 transition-colors",
                            isResizingColumn && "bg-neon-violet/50"
                        )}
                        onMouseDown={handleColumnResizeStart}
                    />
                    {projectsWithTasks.map((project) => {
                        const isProjectExpanded = expandedProjects.has(project.id);
                        const projectTasks = project.tasks;

                        return (
                            <div key={project.id}>
                                {/* Project Row */}
                                <div
                                    className="h-12 p-3 border-b border-white/10 flex items-center gap-2 bg-midnight-800/50 hover:bg-white/5"
                                >
                                    <button
                                        onClick={() => toggleProject(project.id)}
                                        className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
                                    >
                                        {isProjectExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-neon-violet" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    <div
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                        onClick={() => onProjectClick?.(project)}
                                    >
                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-neon-violet to-neon-teal flex items-center justify-center text-white text-xs font-bold">
                                            {project.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-white truncate flex-1 hover:text-neon-violet transition-colors">{project.name}</span>
                                    </div>
                                    {/* 프로젝트 담당자 배지 */}
                                    {project.teamAssignments && project.teamAssignments.length > 0 && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {project.teamAssignments
                                                .flatMap(ta => ta.assignees || [])
                                                .slice(0, 2)
                                                .map((member) => (
                                                    <span
                                                        key={member.id}
                                                        className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                                    >
                                                        {member.name}
                                                    </span>
                                                ))}
                                            {project.teamAssignments.flatMap(ta => ta.assignees || []).length > 2 && (
                                                <span className="text-[9px] text-gray-500">
                                                    +{project.teamAssignments.flatMap(ta => ta.assignees || []).length - 2}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-500">{projectTasks.length}개</span>
                                </div>

                                {/* Task Rows */}
                                <AnimatePresence>
                                    {isProjectExpanded && projectTasks.map((task) => {
                                        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                        const isTaskExpanded = expandedTasks.has(task.id);
                                        const completedSubtasks = task.subtasks?.filter(st => st.status === 'DONE').length || 0;
                                        const totalSubtasks = task.subtasks?.length || 0;

                                        return (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                {/* Task Label: [상태] [우선순위] [업무명] [담당자] */}
                                                <div className="h-14 px-2 py-2 pl-6 border-b border-white/5 flex items-center gap-1.5 group hover:bg-white/5">
                                                    {hasSubtasks ? (
                                                        <button onClick={() => toggleTask(task.id)} className="p-0.5 rounded hover:bg-white/10 shrink-0">
                                                            {isTaskExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                        </button>
                                                    ) : <div className="w-5 shrink-0" />}
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
                                                        className="text-sm text-gray-300 truncate flex-1 min-w-0 cursor-pointer hover:text-white transition-colors"
                                                        onClick={() => openEditTaskModal(task)}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {/* 담당자 배지 */}
                                                    {task.assignees && task.assignees.length > 0 ? (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {task.assignees.slice(0, 2).map((assignee) => (
                                                                <span
                                                                    key={assignee.id}
                                                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                                                >
                                                                    {assignee.name}
                                                                </span>
                                                            ))}
                                                            {task.assignees.length > 2 && (
                                                                <span className="text-[9px] text-gray-500">+{task.assignees.length - 2}</span>
                                                            )}
                                                        </div>
                                                    ) : task.assignee ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                                                            {task.assignee.name}
                                                        </span>
                                                    ) : null}
                                                    {/* 하위 업무 카운터 */}
                                                    {hasSubtasks && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300 shrink-0">
                                                            <GitBranch className="w-3 h-3" />
                                                            {completedSubtasks}/{totalSubtasks}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openCreateSubtaskModal(task); }}
                                                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-violet-500/20 transition-all shrink-0"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 text-violet-400" />
                                                    </button>
                                                </div>

                                                {/* Subtask Labels */}
                                                <AnimatePresence>
                                                    {isTaskExpanded && task.subtasks?.map((subtask, idx) => (
                                                        <motion.div
                                                            key={subtask.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 48 }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="px-3 py-2 pl-14 border-b border-white/5 bg-white/[0.02] hover:bg-white/5 flex items-center gap-2"
                                                        >
                                                            <button
                                                                onClick={() => updateTaskStatus(subtask.id, getNextStatus(subtask.status))}
                                                                className={cn("w-5 h-5 rounded flex items-center justify-center",
                                                                    subtask.status === 'DONE' && "bg-emerald-500/20 text-emerald-400",
                                                                    subtask.status === 'IN_PROGRESS' && "bg-blue-500/20 text-blue-400",
                                                                    subtask.status === 'REVIEW' && "bg-amber-500/20 text-amber-400",
                                                                    subtask.status === 'TODO' && "bg-gray-500/20 text-gray-400"
                                                                )}
                                                            >
                                                                <StatusIcon status={subtask.status} />
                                                            </button>
                                                            <span
                                                                className={cn("text-xs truncate flex-1 cursor-pointer",
                                                                    subtask.status === 'DONE' ? "text-gray-500 line-through" : "text-gray-400"
                                                                )}
                                                                onClick={() => openEditTaskModal(subtask as Task)}
                                                            >
                                                                {subtask.title}
                                                            </span>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Right - Timeline Bars */}
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
                                <div key={`grid-${day.toISOString()}`} className="w-[60px] shrink-0 border-r border-white/5 h-full" />
                            ))}
                        </div>

                        {/* Today Indicator */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-neon-violet z-10 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                            style={{ left: differenceInDays(today, timelineStart) * DAY_WIDTH + (DAY_WIDTH / 2) }}
                        />

                        {/* Bars */}
                        {projectsWithTasks.map((project) => {
                            const isProjectExpanded = expandedProjects.has(project.id);

                            return (
                                <div key={project.id}>
                                    {/* Project Row (empty) */}
                                    <div className="h-12 border-b border-white/10" />

                                    {/* Task Bars */}
                                    <AnimatePresence>
                                        {isProjectExpanded && project.tasks.map((task) => {
                                            const { left, width } = getBarPosition(task.startDate, task.dueDate);
                                            const isTaskExpanded = expandedTasks.has(task.id);
                                            const statusColor = getStatusBarColor(task.status);
                                            const priorityStyle = getPriorityStyle(task.priority);

                                            return (
                                                <motion.div
                                                    key={task.id}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    {/* Task Bar */}
                                                    <div className="h-14 relative border-b border-white/5">
                                                        {width > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scaleX: 0 }}
                                                                animate={{ opacity: 1, scaleX: 1 }}
                                                                className={cn(
                                                                    "absolute top-2 h-10 rounded-lg cursor-pointer group/bar flex items-center px-3 bg-gradient-to-r hover:brightness-110",
                                                                    statusColor, priorityStyle.border, priorityStyle.shadow
                                                                )}
                                                                style={{ left: left + 4, width: width - 8 }}
                                                                onClick={() => openEditTaskModal(task)}
                                                            >
                                                                <span className={cn("w-2 h-2 rounded-full mr-2 shrink-0", priorityStyle.indicator)} />
                                                                <span className="text-xs font-bold text-white drop-shadow-md truncate">{task.title}</span>
                                                            </motion.div>
                                                        )}
                                                    </div>

                                                    {/* Subtask Bars */}
                                                    <AnimatePresence>
                                                        {isTaskExpanded && task.subtasks?.map((subtask, idx) => {
                                                            const subtaskPos = getBarPosition(subtask.startDate, subtask.dueDate);
                                                            const subtaskStatusColor = getStatusBarColor(subtask.status);
                                                            const subtaskPriorityStyle = getPriorityStyle(subtask.priority);

                                                            return (
                                                                <motion.div
                                                                    key={subtask.id}
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 48 }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ delay: idx * 0.05 }}
                                                                    className="relative border-b border-white/5 bg-white/[0.02]"
                                                                >
                                                                    {subtaskPos.width > 0 && (
                                                                        <motion.div
                                                                            className={cn(
                                                                                "absolute top-2 h-7 rounded cursor-pointer hover:scale-105 transition-transform",
                                                                                subtaskPriorityStyle.border
                                                                            )}
                                                                            style={{ left: subtaskPos.left + 4, width: subtaskPos.width - 8 }}
                                                                            onClick={() => openEditTaskModal(subtask as Task)}
                                                                        >
                                                                            <div className={cn("w-full h-full rounded flex items-center px-2 bg-gradient-to-r", subtaskStatusColor)}>
                                                                                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", subtaskPriorityStyle.indicator)} />
                                                                                <span className="text-[10px] text-white/90 truncate font-medium">{subtask.title}</span>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </AnimatePresence>
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

            {/* Legend */}
            <div className="shrink-0 p-3 border-t border-white/10 bg-midnight-900/30">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-medium text-gray-400">상태:</span>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /><span>대기</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /><span>진행중</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /><span>검토</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span>완료</span></div>
                    <div className="w-px h-4 bg-gray-600" />
                    <span className="font-medium text-gray-400">우선순위:</span>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /><span>낮음</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span>보통</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /><span>높음</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span>긴급</span></div>
                </div>
            </div>
        </motion.div>
    );
}
