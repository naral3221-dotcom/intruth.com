import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { AnimatedSection, FloatingElement } from "@/presentation/components/effects/AnimatedSection";
import type { Task } from "@/types";

interface TaskPreviewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

export function TaskPreview({ tasks, onTaskClick }: TaskPreviewProps) {
    return (
        <AnimatedSection animation="fadeInLeft" delay={0.2} className="lg:col-span-2">
            <Card className="p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FloatingElement floatIntensity={2} duration={3}>
                            <Clock className="w-5 h-5 text-primary" />
                        </FloatingElement>
                        내 할일
                        <span className="ml-2 text-sm font-normal text-muted-foreground">{tasks.length}개</span>
                    </h3>
                    <Link
                        to="/my-tasks"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        전체 보기 <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <FloatingElement floatIntensity={8}>
                            <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
                        </FloatingElement>
                        <p className="text-muted-foreground">할당된 업무가 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.slice(0, 5).map((task, i) => (
                            <motion.div
                                key={task.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-foreground/5 hover:bg-secondary transition-all cursor-pointer group"
                                initial={{ opacity: 0, x: -20, rotateY: -10 }}
                                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                                transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
                                whileHover={{
                                    scale: 1.02,
                                    x: 10,
                                    boxShadow: "0 0 20px rgba(0, 255, 255, 0.1)",
                                }}
                                style={{ transformStyle: "preserve-3d" }}
                                onClick={() => onTaskClick(task)}
                            >
                                <motion.div
                                    className={`w-3 h-3 rounded-full ${task.priority === 'URGENT' ? 'bg-red-500' :
                                            task.priority === 'HIGH' ? 'bg-orange-500' :
                                                task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-500'
                                        }`}
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
                                        {task.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{task.project?.name}</p>
                                </div>
                                <motion.span
                                    className={`px-3 py-1 rounded-lg text-xs font-medium ${task.status === 'TODO' ? 'bg-gray-500/20 text-gray-300' :
                                            task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                                                task.status === 'REVIEW' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    'bg-green-500/20 text-green-300'
                                        }`}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    {task.status === 'TODO' ? '예정' :
                                        task.status === 'IN_PROGRESS' ? '진행중' :
                                            task.status === 'REVIEW' ? '검토' : '완료'}
                                </motion.span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </Card>
        </AnimatedSection>
    );
}
