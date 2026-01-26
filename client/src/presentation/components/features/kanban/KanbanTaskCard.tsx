import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { Task } from "@/domain/entities/Task";
import { cn } from "@/core/utils/cn";
import { Calendar, GripVertical } from "lucide-react";

interface KanbanTaskCardProps {
    task: Task;
    onClick?: () => void;
}

export function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
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

    const priorityStyles = {
        low: "aboard-badge bg-muted text-muted-foreground",
        medium: "aboard-badge aboard-badge-info",
        high: "aboard-badge aboard-badge-warning",
        urgent: "aboard-badge aboard-badge-danger",
    };

    const priorityLabels = {
        low: "낮음",
        medium: "보통",
        high: "높음",
        urgent: "긴급",
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-[120px] rounded-xl border-2 border-primary/50 bg-primary/5"
            />
        );
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="touch-none"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <div
                className={cn(
                    "aboard-card p-4 group cursor-pointer",
                    "hover:shadow-md hover:border-primary/30 transition-all duration-200"
                )}
                onClick={onClick}
            >
                {/* Header: Priority + Drag Handle */}
                <div className="flex justify-between items-start mb-3">
                    <span className={cn("text-[10px]", priorityStyles[task.priority])}>
                        {priorityLabels[task.priority]}
                    </span>
                    <div className="flex items-center gap-1">
                        {task.priority === 'urgent' && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        >
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h4 className="font-medium text-foreground mb-3 line-clamp-2 text-sm group-hover:text-primary transition-colors">
                    {task.title}
                </h4>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.slice(0, 2).map((tag, index) => (
                            <span
                                key={index}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                        {task.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
                        )}
                    </div>
                )}

                {/* Footer: Due Date + Assignees */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {task.dueDate ? (
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                                {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* 다중 담당자 아바타 */}
                    {(task.assigneeIds && task.assigneeIds.length > 0) || task.assigneeId ? (
                        <div className="flex -space-x-1.5">
                            {(task.assigneeIds || [task.assigneeId]).slice(0, 3).map((id, index) => (
                                <div
                                    key={id || index}
                                    className="w-6 h-6 rounded-full bg-linear-to-br from-primary to-primary/70 ring-2 ring-card flex items-center justify-center text-[8px] font-bold text-white"
                                    style={{ zIndex: 10 - index }}
                                />
                            ))}
                            {(task.assigneeIds?.length || 0) > 3 && (
                                <div className="w-6 h-6 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                                    +{(task.assigneeIds?.length || 0) - 3}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
}
