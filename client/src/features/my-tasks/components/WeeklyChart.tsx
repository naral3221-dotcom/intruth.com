import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";
import { FloatingElement } from "@/presentation/components/effects/AnimatedSection";
import type { Task } from "@/types";

interface WeeklyChartProps {
    tasks: Task[];
}

interface DayData {
    day: string;
    date: Date;
    completed: number;
    created: number;
}

const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

export function WeeklyChart({ tasks }: WeeklyChartProps) {
    const weekData = useMemo(() => {
        const today = new Date();
        const result: DayData[] = [];

        // 지난 7일간의 데이터
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            const completed = tasks.filter((t) => {
                if (t.status !== "DONE" || !t.updatedAt) return false;
                const updateDate = new Date(t.updatedAt);
                return updateDate >= date && updateDate < nextDay;
            }).length;

            const created = tasks.filter((t) => {
                const createDate = new Date(t.createdAt);
                return createDate >= date && createDate < nextDay;
            }).length;

            result.push({
                day: DAYS_KR[date.getDay()],
                date,
                completed,
                created,
            });
        }

        return result;
    }, [tasks]);

    const maxValue = useMemo(() => {
        return Math.max(
            ...weekData.map((d) => Math.max(d.completed, d.created)),
            1
        );
    }, [weekData]);

    const totalCompleted = weekData.reduce((sum, d) => sum + d.completed, 0);
    const totalCreated = weekData.reduce((sum, d) => sum + d.created, 0);

    // 전주 대비 트렌드 (간단하게 후반 3일 vs 전반 3일 비교)
    const recentDays = weekData.slice(-3).reduce((sum, d) => sum + d.completed, 0);
    const earlierDays = weekData.slice(0, 3).reduce((sum, d) => sum + d.completed, 0);
    const trend = recentDays - earlierDays;

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FloatingElement floatIntensity={3} duration={3}>
                        <div className="p-2 bg-pink-500/20 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-pink-400" />
                        </div>
                    </FloatingElement>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">주간 활동</h3>
                        <p className="text-xs text-muted-foreground">최근 7일</p>
                    </div>
                </div>

                {/* Trend Indicator */}
                <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${trend > 0
                            ? "bg-green-500/20 text-green-400"
                            : trend < 0
                                ? "bg-red-500/20 text-red-400"
                                : "bg-secondary text-muted-foreground"
                        }`}
                >
                    {trend > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                    ) : trend < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                    ) : (
                        <Minus className="w-4 h-4" />
                    )}
                    <span>
                        {trend > 0 ? `+${trend}` : trend}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-40 flex items-end justify-between gap-2 mb-4">
                {weekData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        {/* Bar Container */}
                        <div className="w-full h-32 flex items-end justify-center gap-1">
                            {/* Completed Bar */}
                            <motion.div
                                className="w-3 bg-gradient-to-t from-primary to-emerald-400 rounded-t-sm"
                                initial={{ height: 0 }}
                                animate={{
                                    height: `${(day.completed / maxValue) * 100}%`,
                                }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                title={`완료: ${day.completed}`}
                            />
                            {/* Created Bar */}
                            <motion.div
                                className="w-3 bg-gradient-to-t from-primary to-purple-400 rounded-t-sm opacity-60"
                                initial={{ height: 0 }}
                                animate={{
                                    height: `${(day.created / maxValue) * 100}%`,
                                }}
                                transition={{ delay: index * 0.1 + 0.05, duration: 0.5 }}
                                title={`생성: ${day.created}`}
                            />
                        </div>

                        {/* Day Label */}
                        <span
                            className={`text-xs ${isToday(day.date)
                                    ? "text-primary font-bold"
                                    : "text-muted-foreground"
                                }`}
                        >
                            {day.day}
                        </span>
                    </div>
                ))}
            </div>

            {/* Legend & Stats */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-primary to-emerald-400" />
                        <span className="text-xs text-muted-foreground">완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-primary to-purple-400 opacity-60" />
                        <span className="text-xs text-muted-foreground">생성</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">완료 </span>
                        <span className="text-primary font-bold">{totalCompleted}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">생성 </span>
                        <span className="text-primary font-bold">{totalCreated}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
