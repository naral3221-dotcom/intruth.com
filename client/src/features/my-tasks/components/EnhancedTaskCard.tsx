import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, AlertTriangle, Check, ChevronRight, MoreHorizontal } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { useContextMenuWithLongPress } from "@/presentation/components/context-menu";
import { LongPressRipple } from "@/presentation/components/ui/LongPressRipple";

interface EnhancedTaskCardProps {
    task: Task;
    index: number;
    onClick: () => void;
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
    onQuickComplete: (taskId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
    TODO: "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30",
    IN_PROGRESS: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
    REVIEW: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
    DONE: "bg-green-500/20 text-green-300 hover:bg-green-500/30",
};

const STATUS_LABELS: Record<string, string> = {
    TODO: "예정",
    IN_PROGRESS: "진행중",
    REVIEW: "검토",
    DONE: "완료",
};

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-gray-500",
};

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export function EnhancedTaskCard({
    task,
    index,
    onClick,
    onStatusChange,
    onQuickComplete,
}: EnhancedTaskCardProps) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    // 우클릭 / Long Press 지원
    const { contextMenuProps, isLongPressing, ripplePosition } = useContextMenuWithLongPress({
        type: 'task',
        data: { task },
    });

    const isOverdue =
        task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";
    const isCompleted = task.status === "DONE";

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 0) return "오늘";
        if (diffDays === 1) return "내일";
        if (diffDays === -1) return "어제";
        if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
        if (diffDays <= 7) return `${diffDays}일 후`;

        return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    const handleQuickComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isCompleted) return;

        setIsCompleting(true);
        setTimeout(() => {
            onQuickComplete(task.id);
            setIsCompleting(false);
        }, 300);
    };

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowStatusMenu(!showStatusMenu);
    };

    const handleStatusChange = (newStatus: TaskStatus) => {
        onStatusChange(task.id, newStatus);
        setShowStatusMenu(false);
    };

    return (
        <motion.div
            className={`relative flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-all cursor-pointer group overflow-hidden select-none ${isOverdue ? "ring-1 ring-red-500/30" : ""
                } ${isCompleted ? "opacity-60" : ""}`}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            onClick={onClick}
            {...contextMenuProps}
        >
            {/* Long Press Ripple 효과 */}
            <LongPressRipple isActive={isLongPressing} position={ripplePosition} />

            {/* 왼쪽 바 강조 효과 */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-violet to-neon-teal scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top"
            />
            {/* 완료 체크박스 */}
            <motion.button
                className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted
                        ? "bg-neon-teal border-neon-teal"
                        : "border-gray-500 hover:border-neon-teal"
                    }`}
                onClick={handleQuickComplete}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <AnimatePresence>
                    {(isCompleted || isCompleting) && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <Check className="w-4 h-4 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Priority Indicator */}
            <motion.div
                className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                animate={{ scale: isCompleted ? 1 : [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: isCompleted ? 0 : Infinity, delay: index * 0.2 }}
            />

            {/* Task Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`font-medium truncate transition-colors ${isCompleted
                            ? "text-gray-500 line-through"
                            : "text-white group-hover:text-neon-violet"
                        }`}>
                        {task.title}
                    </p>
                    {isOverdue && !isCompleted && (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500 truncate">
                        {task.project?.name || "프로젝트 없음"}
                    </p>
                    {task.dueDate && (
                        <div
                            className={`flex items-center gap-1 text-xs ${isOverdue && !isCompleted ? "text-red-400" : "text-gray-500"
                                }`}
                        >
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(task.dueDate)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Assignees (다중 담당자) */}
            {task.assignees && task.assignees.length > 1 && (
                <div className="flex -space-x-2">
                    {task.assignees.slice(0, 3).map((assignee) => (
                        <div
                            key={assignee.id}
                            className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-900"
                            title={assignee.name}
                        >
                            {assignee.name.charAt(0)}
                        </div>
                    ))}
                    {task.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs ring-2 ring-slate-900">
                            +{task.assignees.length - 3}
                        </div>
                    )}
                </div>
            )}

            {/* Status Badge with Quick Change */}
            <div className="relative">
                <motion.button
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${STATUS_STYLES[task.status]} flex items-center gap-1`}
                    onClick={handleStatusClick}
                    whileHover={{ scale: 1.05 }}
                >
                    {STATUS_LABELS[task.status]}
                    <MoreHorizontal className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>

                {/* Status Dropdown */}
                <AnimatePresence>
                    {showStatusMenu && (
                        <motion.div
                            className="absolute right-0 top-full mt-2 w-32 py-1 bg-slate-800 rounded-xl shadow-xl z-50 border border-white/10"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {STATUS_ORDER.map((status) => (
                                <button
                                    key={status}
                                    className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${task.status === status
                                            ? "text-neon-violet bg-white/5"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    onClick={() => handleStatusChange(status)}
                                >
                                    <div className={`w-2 h-2 rounded-full ${STATUS_STYLES[status].split(' ')[0].replace('bg-', 'bg-').replace('/20', '')}`} />
                                    {STATUS_LABELS[status]}
                                    {task.status === status && (
                                        <Check className="w-3 h-3 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Arrow indicator */}
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </motion.div>
    );
}
