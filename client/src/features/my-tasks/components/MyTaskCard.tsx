import { motion } from "framer-motion";
import { Calendar, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";

interface MyTaskCardProps {
    task: Task;
    index: number;
    onClick: () => void;
}

const STATUS_STYLES: Record<string, string> = {
    TODO: "bg-gray-500/20 text-gray-300",
    IN_PROGRESS: "bg-blue-500/20 text-blue-300",
    REVIEW: "bg-yellow-500/20 text-yellow-300",
    DONE: "bg-green-500/20 text-green-300",
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

export function MyTaskCard({ task, index, onClick }: MyTaskCardProps) {
    const isOverdue =
        task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

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

    return (
        <motion.div
            className={`relative flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-all cursor-pointer group overflow-hidden ${
                isOverdue ? "ring-1 ring-red-500/30" : ""
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            onClick={onClick}
        >
            {/* 왼쪽 바 강조 효과 */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-violet to-neon-teal scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top"
            />
            {/* Priority Indicator */}
            <motion.div
                className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
            />

            {/* Task Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate group-hover:text-neon-violet transition-colors">
                        {task.title}
                    </p>
                    {isOverdue && (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500 truncate">
                        {task.project?.name || "프로젝트 없음"}
                    </p>
                    {task.dueDate && (
                        <div
                            className={`flex items-center gap-1 text-xs ${
                                isOverdue ? "text-red-400" : "text-gray-500"
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

            {/* Status Badge */}
            <motion.span
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    STATUS_STYLES[task.status]
                }`}
                whileHover={{ scale: 1.1 }}
            >
                {STATUS_LABELS[task.status]}
            </motion.span>
        </motion.div>
    );
}
