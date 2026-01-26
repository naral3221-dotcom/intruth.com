import { Clock, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { AnimatedSection } from "@/presentation/components/effects/AnimatedSection";
import type { DashboardStats } from "../types";

interface StatsCardsProps {
    stats: DashboardStats;
}

const getStatCards = (stats: DashboardStats) => [
    {
        icon: Clock,
        label: "대기",
        value: stats?.todo || 0,
        description: "대기 중인 업무",
        color: "neon-violet",
        gradient: "from-neon-violet/20 to-purple-600/10",
        backInfo: "이번 주 새로 추가된 업무",
    },
    {
        icon: Zap,
        label: "진행",
        value: stats?.inProgress || 0,
        description: "진행 중인 업무",
        color: "blue-400",
        gradient: "from-blue-500/20 to-cyan-500/10",
        backInfo: "현재 활발히 진행 중",
    },
    {
        icon: CheckCircle,
        label: "완료",
        value: stats?.done || 0,
        description: "완료된 업무",
        color: "neon-teal",
        gradient: "from-neon-teal/20 to-emerald-500/10",
        backInfo: "이번 주 완료한 업무",
    },
    {
        icon: AlertTriangle,
        label: "지연",
        value: stats?.overdue || 0,
        description: "지연된 업무",
        color: "red-400",
        gradient: "from-red-500/20 to-orange-500/10",
        backInfo: "주의가 필요한 업무",
    },
];

export function StatsCards({ stats }: StatsCardsProps) {
    const statCards = getStatCards(stats);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => (
                <AnimatedSection
                    key={card.label}
                    animation="scaleIn"
                    delay={index * 0.1}
                >
                    <div className={`h-[160px] p-5 rounded-xl bg-linear-to-br ${card.gradient} border border-white/10 backdrop-blur-sm`}>
                        <div className="w-full h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 bg-${card.color}/20 rounded-xl`}>
                                    <card.icon className={`w-6 h-6 text-${card.color}`} />
                                </div>
                                <span className={`text-xs font-mono text-${card.color} bg-${card.color}/10 px-2 py-1 rounded`}>
                                    {card.label}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-1">{card.value}개</h3>
                                <p className="text-gray-400 text-sm">{card.description}</p>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>
            ))}
        </div>
    );
}
