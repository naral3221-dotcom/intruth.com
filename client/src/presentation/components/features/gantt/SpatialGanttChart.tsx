import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { Task } from "@/domain/entities/Task";
import { Card } from "../../ui/Card";
import { cn } from "@/core/utils/cn";
// @ts-ignore
import { addDays, format, differenceInDays } from "date-fns";

// 상태 설정
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    todo: { label: "할일", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
    in_progress: { label: "진행중", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    review: { label: "검토", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    done: { label: "완료", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

// 우선순위 설정
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    low: { label: "낮음", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
    medium: { label: "보통", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    high: { label: "높음", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    urgent: { label: "긴급", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

interface SpatialGanttChartProps {
    tasks: Task[];
}

// 열 너비 최소/최대값
const MIN_COLUMN_WIDTH = 200;
const MAX_COLUMN_WIDTH = 600;
const DEFAULT_COLUMN_WIDTH = 320;

export function SpatialGanttChart({ tasks }: SpatialGanttChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [columnWidth, setColumnWidth] = useState(DEFAULT_COLUMN_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    // 열 너비 조절 핸들러
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = columnWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + delta));
            setColumnWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidth]);

    // Generate Timeline Data (Next 30 Days)
    const today = new Date();
    const timelineStart = addDays(today, -5);
    const timelineEnd = addDays(today, 30);
    const totalDays = differenceInDays(timelineEnd, timelineStart);

    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    const DAY_WIDTH = 60; // px per day

    // Calculate Bar Position
    const getBarPosition = (start?: Date, end?: Date) => {
        if (!start || !end) return { left: 0, width: 0 };

        // Simple clamp for demo
        const effectiveStart = start < timelineStart ? timelineStart : start;
        const offsetDays = differenceInDays(effectiveStart, timelineStart);
        const durationDays = differenceInDays(end, effectiveStart) + 1; // Include end day

        return {
            left: offsetDays * DAY_WIDTH,
            width: durationDays * DAY_WIDTH
        };
    };

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden bg-midnight-800/30 rounded-3xl border border-white/5 backdrop-blur-sm",
            isResizing && "select-none cursor-col-resize"
        )}>
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
                            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group/resizer",
                            "hover:bg-neon-violet/50 transition-colors",
                            isResizing && "bg-neon-violet"
                        )}
                        onMouseDown={handleMouseDown}
                    >
                        <div className={cn(
                            "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
                            "bg-gray-500/50 group-hover/resizer:bg-neon-violet transition-colors",
                            isResizing && "bg-neon-violet"
                        )} />
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar" ref={containerRef}>
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

            {/* Gantt Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                <div className="flex flex-col relative">
                    {/* Grid Lines Background */}
                    <div className="absolute inset-0 flex" style={{ left: columnWidth, width: totalDays * DAY_WIDTH, height: '100%' }}>
                        {days.map((day) => (
                            <div key={`grid-${day.toISOString()}`} className="w-[60px] shrink-0 border-r border-white/5 h-full" />
                        ))}
                        {/* Current Time Indicator */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-neon-violet z-0 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                            style={{ left: differenceInDays(today, timelineStart) * DAY_WIDTH + (DAY_WIDTH / 2) }}
                        />
                    </div>

                    {/* Task Rows */}
                    {tasks.map((task) => {
                        const { left, width } = getBarPosition(task.startDate, task.dueDate);
                        const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                        const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        // 담당자 목록
                        const assignees = task.assignees?.length ? task.assignees : (task.assignee ? [task.assignee] : []);

                        return (
                            <div key={task.id} className="flex h-16 border-b border-white/5 group hover:bg-white/5 transition-colors relative">
                                {/* Task Label: [상태] [우선순위] [업무명] [담당자] */}
                                <div
                                    className="shrink-0 px-3 py-2 border-r border-white/10 flex items-center gap-1.5 z-20 bg-inherit relative"
                                    style={{ width: columnWidth }}
                                >
                                    {/* 상태 배지 */}
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                                        status.color,
                                        status.bg,
                                        status.border
                                    )}>
                                        {status.label}
                                    </span>
                                    {/* 우선순위 배지 */}
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                                        priority.color,
                                        priority.bg,
                                        priority.border
                                    )}>
                                        {priority.label}
                                    </span>
                                    {/* 업무명 */}
                                    <span className="text-sm text-gray-300 truncate flex-1 min-w-0">{task.title}</span>
                                    {/* 담당자 배지 */}
                                    {assignees.length > 0 && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            {assignees.slice(0, 2).map((assignee) => (
                                                <span
                                                    key={assignee.id}
                                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                                >
                                                    {assignee.name}
                                                </span>
                                            ))}
                                            {assignees.length > 2 && (
                                                <span className="text-[9px] text-gray-500">+{assignees.length - 2}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Task Bar Area */}
                                <div className="flex-1 relative overflow-visible">
                                    {width > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, scaleX: 0 }}
                                            animate={{ opacity: 1, scaleX: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="absolute top-3 h-10 rounded-lg cursor-pointer group/bar"
                                            style={{ left: left + 20, width: width - 10 }} // Adjusting padding
                                        >
                                            <Card
                                                className={cn(
                                                    "w-full h-full flex items-center px-3 border-0 hover:scale-105 transition-transform",
                                                    task.status === 'done'
                                                        ? "bg-linear-to-r from-teal-500/80 to-emerald-500/80 shadow-teal-500/20"
                                                        : "bg-linear-to-r from-violet-600/80 to-indigo-600/80 shadow-violet-500/20"
                                                )}
                                            >
                                                <span className="text-xs font-bold text-white drop-shadow-md truncate">
                                                    {task.title}
                                                </span>
                                            </Card>

                                            {/* Tooltip on Hover */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/80 text-xs text-white opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                {format(task.startDate!, 'MM/dd')} - {format(task.dueDate!, 'MM/dd')}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
