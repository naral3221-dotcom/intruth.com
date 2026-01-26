import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Briefcase, FileText, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Task } from "@/types";
import { cn } from "@/core/utils/cn";

interface MemberWithTasks {
    id: string;
    name: string;
    avatarUrl?: string;
    tasks: Task[];
    taskStats: {
        todo: number;
        inProgress: number;
        review: number;
        done: number;
    };
}

interface TeamProgressProps {
    members: MemberWithTasks[];
    onTaskClick?: (task: Task) => void;
}

const statusConfig = {
    TODO: { label: "대기", color: "bg-gray-400", textColor: "text-muted-foreground" },
    IN_PROGRESS: { label: "진행", color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
    REVIEW: { label: "검토", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
    DONE: { label: "완료", color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
};

export function TeamProgress({ members, onTaskClick }: TeamProgressProps) {
    const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

    const toggleMember = (memberId: string) => {
        setExpandedMembers((prev) => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    return (
        <div className="aboard-card p-5">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg widget-icon-green flex items-center justify-center">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">팀 현황</h3>
                        <p className="text-xs text-muted-foreground">{members.length}명</p>
                    </div>
                </div>
                <Link
                    to="/team"
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                    전체 보기 <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">팀원이 없습니다</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((member, i) => {
                        const isExpanded = expandedMembers.has(member.id);
                        const total = member.taskStats.todo + member.taskStats.inProgress + member.taskStats.review + member.taskStats.done;
                        const activeTaskCount = member.taskStats.inProgress + member.taskStats.review;
                        const activeTasks = member.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW');
                        const uniqueProjects = [...new Set(member.tasks.map(t => t.projectId))].length;
                        const completionRate = total > 0 ? Math.round((member.taskStats.done / total) * 100) : 0;

                        return (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-xl bg-muted/50 overflow-hidden border border-transparent hover:border-border transition-colors"
                            >
                                {/* Member Header */}
                                <motion.div
                                    className={cn(
                                        "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors",
                                        isExpanded && "bg-muted"
                                    )}
                                    onClick={() => toggleMember(member.id)}
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-sm">
                                        {member.avatarUrl ? (
                                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            member.name.charAt(0)
                                        )}
                                    </div>

                                    {/* Name & Stats */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground font-medium truncate">{member.name}</span>
                                            {activeTaskCount > 0 && (
                                                <span className="aboard-badge aboard-badge-info">
                                                    {activeTaskCount}개 진행중
                                                </span>
                                            )}
                                        </div>
                                        {/* Quick Stats */}
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                {uniqueProjects}개 프로젝트
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {member.taskStats.done}/{total}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expand Icon */}
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    </motion.div>
                                </motion.div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 space-y-3">
                                                {/* Active Tasks */}
                                                {activeTasks.length > 0 ? (
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            진행중인 업무
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {activeTasks.slice(0, 5).map((task) => {
                                                                const status = statusConfig[task.status];
                                                                return (
                                                                    <motion.div
                                                                        key={task.id}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card hover:bg-muted cursor-pointer transition-colors group border border-transparent hover:border-border"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onTaskClick?.(task);
                                                                        }}
                                                                        whileHover={{ x: 2 }}
                                                                    >
                                                                        <div className={cn("w-2 h-2 rounded-full shrink-0", status.color)} />
                                                                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                        <span className="flex-1 text-sm text-foreground truncate">
                                                                            {task.title}
                                                                        </span>
                                                                        {task.project && (
                                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                                                                {task.project.name}
                                                                            </span>
                                                                        )}
                                                                        <span className={cn(
                                                                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                                            status.textColor,
                                                                            status.color === "bg-blue-500" && "bg-blue-100 dark:bg-blue-900/30",
                                                                            status.color === "bg-amber-500" && "bg-amber-100 dark:bg-amber-900/30",
                                                                            status.color === "bg-green-500" && "bg-green-100 dark:bg-green-900/30",
                                                                            status.color === "bg-gray-400" && "bg-muted"
                                                                        )}>
                                                                            {status.label}
                                                                        </span>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                            {activeTasks.length > 5 && (
                                                                <div className="text-center text-xs text-muted-foreground py-1">
                                                                    +{activeTasks.length - 5}개 더
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                                        진행중인 업무가 없습니다
                                                    </div>
                                                )}

                                                {/* Progress Bar */}
                                                <div className="pt-2">
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                                        <span>업무 진행률</span>
                                                        <span className="font-medium text-primary">
                                                            {completionRate}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full rounded-full bg-card overflow-hidden flex">
                                                        {total > 0 && (
                                                            <>
                                                                <motion.div
                                                                    className="h-full bg-green-500"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(member.taskStats.done / total) * 100}%` }}
                                                                    transition={{ duration: 0.5 }}
                                                                />
                                                                <motion.div
                                                                    className="h-full bg-amber-500"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(member.taskStats.review / total) * 100}%` }}
                                                                    transition={{ duration: 0.5, delay: 0.1 }}
                                                                />
                                                                <motion.div
                                                                    className="h-full bg-blue-500"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(member.taskStats.inProgress / total) * 100}%` }}
                                                                    transition={{ duration: 0.5, delay: 0.2 }}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Legend */}
                                                    <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            완료 {member.taskStats.done}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                            검토 {member.taskStats.review}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                            진행 {member.taskStats.inProgress}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
