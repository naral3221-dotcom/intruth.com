import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { Task } from "@/domain/entities/Task";
import { cn } from "@/core/utils/cn";
import { Clock, Folder, Users, GripVertical } from "lucide-react";
import { useContextMenu } from "@/presentation/components/context-menu";
import { useMemo } from "react";

interface KanbanTaskCardProps {
    task: Task;
}

export function KanbanTaskCard({ task }: KanbanTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { type: "Task", task } });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    // 우클릭 컨텍스트 메뉴 - 드래그 중에는 비활성화
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { handleContextMenu } = useContextMenu({
        type: 'task',
        data: { task: task as any },
        disabled: isDragging,
    });

    const priorityStyles: Record<string, string> = {
        low: "aboard-badge bg-muted text-muted-foreground",
        medium: "aboard-badge aboard-badge-info",
        high: "aboard-badge aboard-badge-warning",
        urgent: "aboard-badge aboard-badge-danger",
    };

    const priorityLabels: Record<string, string> = {
        low: "낮음",
        medium: "보통",
        high: "높음",
        urgent: "긴급",
    };

    // D-day 계산
    const dDay = useMemo(() => {
        if (!task.dueDate) return null;
        const due = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: `D+${Math.abs(diffDays)}`, isOverdue: true };
        if (diffDays === 0) return { text: 'D-Day', isOverdue: false };
        return { text: `D-${diffDays}`, isOverdue: false };
    }, [task.dueDate]);

    // 팀 정보 추출
    const team = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskAny = task as any;
        if (taskAny.team) return taskAny.team;
        if (taskAny.project?.team) return taskAny.project.team;
        return null;
    }, [task]);

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-[140px] rounded-xl border-2 border-primary/50 bg-primary/5"
            />
        );
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="touch-none"
            onContextMenu={handleContextMenu}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <div
                className={cn(
                    "aboard-card p-4 group cursor-pointer",
                    "hover:shadow-md hover:border-primary/30 transition-all duration-200"
                )}
            >
                {/* Header: Project + Team + Drag Handle */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        {task.project?.name && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Folder className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[80px]">{task.project.name}</span>
                            </div>
                        )}
                        {team && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0"
                                style={{
                                    backgroundColor: `${team.color || '#00bcd4'}15`,
                                    color: team.color || '#00bcd4',
                                }}
                            >
                                <Users className="w-2.5 h-2.5" />
                                {team.name}
                            </span>
                        )}
                    </div>
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
                    >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>

                {/* Priority Badge */}
                <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[10px]", priorityStyles[task.priority])}>
                        {priorityLabels[task.priority]}
                    </span>
                    {task.priority === 'urgent' && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </div>

                {/* Title */}
                <h4 className="font-medium text-foreground mb-3 line-clamp-2 text-sm group-hover:text-primary transition-colors">
                    {task.title}
                </h4>

                {/* Footer: D-Day + Assignees */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {dDay ? (
                        <div
                            className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                dDay.isOverdue
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                    : dDay.text === 'D-Day'
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Clock className="w-3 h-3" />
                            <span>{dDay.text}</span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* 다중 담당자 이름 배지 */}
                    {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                            {task.assignees.slice(0, 2).map((assignee) => (
                                <span
                                    key={assignee.id}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary"
                                >
                                    {assignee.name}
                                </span>
                            ))}
                            {task.assignees.length > 2 && (
                                <span className="text-[9px] text-muted-foreground">
                                    +{task.assignees.length - 2}
                                </span>
                            )}
                        </div>
                    ) : task.assignee ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary">
                            {task.assignee.name}
                        </span>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
}
