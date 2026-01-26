import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { Column } from "@/domain/entities/Column";
import type { Task } from "@/domain/entities/Task";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { useMemo } from "react";
import { Plus, Layers } from "lucide-react";

interface KanbanColumnProps {
    column: Column;
    tasks: Task[];
}

const columnColors: Record<string, { border: string; glow: string; bg: string }> = {
    TODO: { border: "border-gray-500/30", glow: "rgba(156, 163, 175, 0.2)", bg: "from-gray-500/5" },
    IN_PROGRESS: { border: "border-blue-500/30", glow: "rgba(59, 130, 246, 0.2)", bg: "from-blue-500/5" },
    REVIEW: { border: "border-yellow-500/30", glow: "rgba(234, 179, 8, 0.2)", bg: "from-yellow-500/5" },
    DONE: { border: "border-green-500/30", glow: "rgba(34, 197, 94, 0.2)", bg: "from-green-500/5" },
};

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: { type: "Column", column },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
    const colors = columnColors[column.id] || columnColors.TODO;

    if (isDragging) {
        return (
            <motion.div
                ref={setNodeRef}
                style={style}
                className={`w-[350px] h-[500px] rounded-2xl bg-midnight-800/50 border-2 ${colors.border} shrink-0`}
                animate={{
                    scale: 1.02,
                    boxShadow: `0 0 40px ${colors.glow}`,
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <Layers className="w-12 h-12 text-white/20 animate-pulse" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="w-[350px] shrink-0 flex flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
            {/* Column Header */}
            <motion.div
                {...attributes}
                {...listeners}
                className={`flex items-center justify-between p-4 rounded-xl bg-midnight-700/30 backdrop-blur-md border ${colors.border} cursor-grab active:cursor-grabbing relative overflow-hidden`}
                whileHover={{
                    scale: 1.02,
                    boxShadow: `0 0 20px ${colors.glow}`,
                }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-linear-to-r ${colors.bg} to-transparent opacity-50`} />

                <div className="flex items-center gap-2 relative z-10">
                    <motion.h3
                        className="font-bold text-white"
                        whileHover={{ x: 3 }}
                    >
                        {column.title}
                    </motion.h3>
                    <motion.span
                        className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono text-gray-300"
                        animate={{ scale: tasks.length > 0 ? [1, 1.1, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {tasks.length}
                    </motion.span>
                </div>
                <motion.button
                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white relative z-10"
                    whileHover={{ rotate: 90, scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Plus className="w-4 h-4" />
                </motion.button>
            </motion.div>

            {/* Task List */}
            <motion.div
                className="flex-1 flex flex-col gap-3 min-h-[150px] p-2 rounded-xl"
                style={{
                    background: `linear-gradient(180deg, ${colors.glow} 0%, transparent 100%)`,
                }}
            >
                <SortableContext items={tasksIds}>
                    {tasks.map((task, index) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                delay: index * 0.05,
                                type: "spring",
                                stiffness: 100,
                            }}
                        >
                            <KanbanTaskCard task={task} />
                        </motion.div>
                    ))}
                </SortableContext>

                {/* Empty state */}
                {tasks.length === 0 && (
                    <motion.div
                        className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{
                            borderColor: "rgba(255,255,255,0.2)",
                            boxShadow: `inset 0 0 30px ${colors.glow}`,
                        }}
                    >
                        <p className="text-gray-500 text-sm">업무를 여기로 드래그하세요</p>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}
