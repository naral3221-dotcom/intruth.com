import { motion } from "framer-motion";
import { AlertTriangle, Clock, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { FloatingElement } from "@/presentation/components/effects/AnimatedSection";
import type { Task } from "@/types";

interface UrgentTasksSectionProps {
    todayTasks: Task[];
    thisWeekTasks: Task[];
    overdueTasks: Task[];
    onTaskClick: (task: Task) => void;
}

const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "내일";
    if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
    return `${diffDays}일 후`;
};

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-gray-500",
};

export function UrgentTasksSection({
    todayTasks,
    thisWeekTasks,
    overdueTasks,
    onTaskClick,
}: UrgentTasksSectionProps) {
    const hasUrgentItems = todayTasks.length > 0 || overdueTasks.length > 0;

    if (!hasUrgentItems && thisWeekTasks.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 지연된 업무 */}
            {overdueTasks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-4 border border-red-500/30 bg-red-500/5">
                        <div className="flex items-center gap-2 mb-3">
                            <FloatingElement floatIntensity={3} duration={2}>
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                            </FloatingElement>
                            <div>
                                <h3 className="text-sm font-semibold text-red-400">지연된 업무</h3>
                                <p className="text-xs text-muted-foreground">{overdueTasks.length}개</p>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {overdueTasks.slice(0, 3).map((task) => (
                                <motion.div
                                    key={task.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 hover:bg-secondary cursor-pointer group"
                                    onClick={() => onTaskClick(task)}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                                    <span className="text-sm text-muted-foreground truncate flex-1 group-hover:text-foreground">
                                        {task.title}
                                    </span>
                                    <span className="text-xs text-red-400">
                                        {task.dueDate && formatDueDate(task.dueDate)}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                                </motion.div>
                            ))}
                        </div>
                        {overdueTasks.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                +{overdueTasks.length - 3}개 더 보기
                            </p>
                        )}
                    </Card>
                </motion.div>
            )}

            {/* 오늘 마감 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <Card className={`p-4 ${todayTasks.length > 0 ? 'border border-orange-500/30 bg-orange-500/5' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <FloatingElement floatIntensity={3} duration={2.5}>
                            <div className={`p-2 rounded-lg ${todayTasks.length > 0 ? 'bg-orange-500/20' : 'bg-secondary'}`}>
                                <Clock className={`w-5 h-5 ${todayTasks.length > 0 ? 'text-orange-400' : 'text-muted-foreground'}`} />
                            </div>
                        </FloatingElement>
                        <div>
                            <h3 className={`text-sm font-semibold ${todayTasks.length > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                오늘 마감
                            </h3>
                            <p className="text-xs text-muted-foreground">{todayTasks.length}개</p>
                        </div>
                    </div>
                    {todayTasks.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {todayTasks.slice(0, 3).map((task) => (
                                <motion.div
                                    key={task.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 hover:bg-secondary cursor-pointer group"
                                    onClick={() => onTaskClick(task)}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                                    <span className="text-sm text-muted-foreground truncate flex-1 group-hover:text-foreground">
                                        {task.title}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            오늘 마감 업무가 없습니다
                        </p>
                    )}
                </Card>
            </motion.div>

            {/* 이번 주 마감 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className={`p-4 ${thisWeekTasks.length > 0 ? 'border border-blue-500/30 bg-blue-500/5' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <FloatingElement floatIntensity={3} duration={3}>
                            <div className={`p-2 rounded-lg ${thisWeekTasks.length > 0 ? 'bg-blue-500/20' : 'bg-secondary'}`}>
                                <Calendar className={`w-5 h-5 ${thisWeekTasks.length > 0 ? 'text-blue-400' : 'text-muted-foreground'}`} />
                            </div>
                        </FloatingElement>
                        <div>
                            <h3 className={`text-sm font-semibold ${thisWeekTasks.length > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}>
                                이번 주 마감
                            </h3>
                            <p className="text-xs text-muted-foreground">{thisWeekTasks.length}개</p>
                        </div>
                    </div>
                    {thisWeekTasks.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {thisWeekTasks.slice(0, 3).map((task) => (
                                <motion.div
                                    key={task.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 hover:bg-secondary cursor-pointer group"
                                    onClick={() => onTaskClick(task)}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                                    <span className="text-sm text-muted-foreground truncate flex-1 group-hover:text-foreground">
                                        {task.title}
                                    </span>
                                    <span className="text-xs text-blue-400">
                                        {task.dueDate && formatDueDate(task.dueDate)}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            이번 주 마감 업무가 없습니다
                        </p>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
