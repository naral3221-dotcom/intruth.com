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

const columnColors: Record<string, { border: string; bg: string; dot: string }> = {
    TODO: { border: "border-gray-200", bg: "bg-gray-50", dot: "bg-gray-400" },
    IN_PROGRESS: { border: "border-blue-200", bg: "bg-blue-50", dot: "bg-blue-500" },
    REVIEW: { border: "border-amber-200", bg: "bg-amber-50", dot: "bg-amber-500" },
    DONE: { border: "border-green-200", bg: "bg-green-50", dot: "bg-green-500" },
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
                className={`h-[500px] w-[min(20rem,calc(100vw-2rem))] shrink-0 rounded-xl border-2 border-dashed bg-gray-100 lg:w-72 xl:w-[19rem] 2xl:w-80 ${colors.border}`}
                animate={{ scale: 1.02 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <Layers className="w-12 h-12 text-gray-300 animate-pulse" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="flex w-[min(20rem,calc(100vw-2rem))] shrink-0 flex-col gap-3 lg:w-72 xl:w-[19rem] 2xl:w-80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
            {/* Column Header */}
            <motion.div
                {...attributes}
                {...listeners}
                className={`flex items-center justify-between p-4 rounded-xl ${colors.bg} border ${colors.border} cursor-grab active:cursor-grabbing`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <h3 className="font-semibold text-gray-900">
                        {column.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-white text-xs font-medium text-gray-600 border border-gray-200">
                        {tasks.length}
                    </span>
                </div>
                <motion.button
                    className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Plus className="w-4 h-4" />
                </motion.button>
            </motion.div>

            {/* Task List */}
            <div className="flex-1 flex flex-col gap-2 min-h-[150px] p-1">
                <SortableContext items={tasksIds}>
                    {tasks.map((task, index) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                delay: index * 0.03,
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
                        className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl min-h-[120px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ borderColor: "#d1d5db", backgroundColor: "#f9fafb" }}
                    >
                        <p className="text-gray-400 text-sm">업무를 여기로 드래그하세요</p>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
