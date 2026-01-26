import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Users, CheckSquare, MoreHorizontal, ArrowRight } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Card } from "@/presentation/components/ui/Card";
import type { Project } from "@/types";

interface ProjectCardProps {
    project: Project;
    index: number;
}

const statusConfig = {
    ACTIVE: { label: "진행중", color: "bg-blue-500/20 text-blue-400", border: "border-blue-500/30" },
    COMPLETED: { label: "완료", color: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/30" },
    ON_HOLD: { label: "보류", color: "bg-amber-500/20 text-amber-400", border: "border-amber-500/30" },
    ARCHIVED: { label: "보관됨", color: "bg-gray-500/20 text-gray-400", border: "border-gray-500/30" },
};

export function ProjectCard({ project, index }: ProjectCardProps) {
    const config = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.ACTIVE;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring" }}
        >
            <Link to={`/projects/${project.id}/board`}>
                <Card className="p-5 h-full group" hover>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <motion.div
                                className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                {project.name.charAt(0)}
                            </motion.div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                    {project.name}
                                </h3>
                                <span className={cn(
                                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                                    config.color
                                )}>
                                    {config.label}
                                </span>
                            </div>
                        </div>
                        <motion.button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                            whileHover={{ rotate: 90 }}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </motion.button>
                    </div>

                    {/* Description */}
                    {project.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {project.description}
                        </p>
                    )}

                    {/* Meta info */}
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                        {(project.startDate || project.endDate) && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {project.startDate && formatDate(project.startDate)}
                                    {project.startDate && project.endDate && " ~ "}
                                    {project.endDate && formatDate(project.endDate)}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            <span className="font-medium text-foreground">{project._count?.tasks || 0}</span>
                            <span>개의 업무</span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <div className="flex -space-x-2">
                                    {project.members?.slice(0, 4).map((pm) => (
                                        <motion.div
                                            key={pm.id}
                                            className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-500 to-indigo-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-foreground"
                                            whileHover={{ scale: 1.2, zIndex: 10 }}
                                        >
                                            {pm.member.name.charAt(0)}
                                        </motion.div>
                                    ))}
                                    {(project.members?.length || 0) > 4 && (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-medium border-2 border-background text-muted-foreground">
                                            +{(project.members?.length || 0) - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <motion.span
                                className="flex items-center gap-1 text-xs text-primary font-medium"
                                whileHover={{ x: 3 }}
                            >
                                보드 열기 <ArrowRight className="w-3 h-3" />
                            </motion.span>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}
