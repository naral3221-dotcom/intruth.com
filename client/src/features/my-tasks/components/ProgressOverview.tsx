import { motion } from "framer-motion";
import { TrendingUp, Target, Award } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { FloatingElement } from "@/presentation/components/effects/AnimatedSection";

interface ProgressOverviewProps {
    stats: {
        total: number;
        done: number;
        inProgress: number;
        completedThisWeek: number;
    };
}

export function ProgressOverview({ stats }: ProgressOverviewProps) {
    const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const activeRate = stats.total > 0 ? Math.round(((stats.inProgress + stats.done) / stats.total) * 100) : 0;

    // 원형 프로그레스 계산
    const circumference = 2 * Math.PI * 45; // radius = 45
    const completionOffset = circumference - (completionRate / 100) * circumference;

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <FloatingElement floatIntensity={3} duration={3}>
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                </FloatingElement>
                <h3 className="text-lg font-semibold text-foreground">진행 현황</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 원형 프로그레스 */}
                <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                            {/* 배경 원 */}
                            <circle
                                cx="64"
                                cy="64"
                                r="45"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="8"
                                fill="none"
                            />
                            {/* 진행 원 */}
                            <motion.circle
                                cx="64"
                                cy="64"
                                r="45"
                                stroke="url(#progressGradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: completionOffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#06B6D4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span
                                className="text-3xl font-bold text-foreground"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                {completionRate}%
                            </motion.span>
                            <span className="text-xs text-muted-foreground">완료율</span>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        {stats.done} / {stats.total} 완료
                    </p>
                </div>

                {/* 선형 프로그레스들 */}
                <div className="flex flex-col justify-center space-y-4">
                    {/* 전체 진행률 */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Target className="w-3 h-3" /> 활성 업무
                            </span>
                            <span className="text-sm font-medium text-foreground">{activeRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${activeRate}%` }}
                                transition={{ duration: 1, delay: 0.3 }}
                            />
                        </div>
                    </div>

                    {/* 완료율 */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Award className="w-3 h-3" /> 완료 업무
                            </span>
                            <span className="text-sm font-medium text-primary">{completionRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${completionRate}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                            />
                        </div>
                    </div>
                </div>

                {/* 이번 주 성과 */}
                <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-emerald-500/10 rounded-xl">
                    <FloatingElement floatIntensity={5} duration={4}>
                        <Award className="w-10 h-10 text-primary mb-2" />
                    </FloatingElement>
                    <motion.span
                        className="text-4xl font-bold text-foreground"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.7 }}
                    >
                        {stats.completedThisWeek}
                    </motion.span>
                    <span className="text-sm text-muted-foreground mt-1">이번 주 완료</span>
                </div>
            </div>
        </Card>
    );
}
