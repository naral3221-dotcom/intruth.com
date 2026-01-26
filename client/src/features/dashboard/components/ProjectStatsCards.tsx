import { FolderKanban, Play, CheckCircle2, PauseCircle, AlertTriangle } from "lucide-react";
import { AnimatedSection } from "@/presentation/components/effects/AnimatedSection";

export interface ProjectStats {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    overdue: number;
}

interface ProjectStatsCardsProps {
    stats: ProjectStats;
}

const getProjectStatCards = (stats: ProjectStats) => [
    {
        icon: Play,
        label: "진행",
        value: stats.active,
        description: "진행 중인 프로젝트",
        color: "blue-400",
        gradient: "from-blue-500/20 to-cyan-500/10",
    },
    {
        icon: CheckCircle2,
        label: "완료",
        value: stats.completed,
        description: "완료된 프로젝트",
        color: "neon-teal",
        gradient: "from-neon-teal/20 to-emerald-500/10",
    },
    {
        icon: PauseCircle,
        label: "보류",
        value: stats.onHold,
        description: "보류 중인 프로젝트",
        color: "yellow-400",
        gradient: "from-yellow-500/20 to-amber-500/10",
    },
    {
        icon: AlertTriangle,
        label: "지연",
        value: stats.overdue,
        description: "지연된 프로젝트",
        color: "red-400",
        gradient: "from-red-500/20 to-orange-500/10",
    },
];

export function ProjectStatsCards({ stats }: ProjectStatsCardsProps) {
    const statCards = getProjectStatCards(stats);

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <FolderKanban className="w-5 h-5 text-neon-violet" />
                <h3 className="text-lg font-semibold text-white">프로젝트 현황</h3>
                <span className="text-sm text-gray-400">전체 {stats.total}개</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((card, index) => (
                    <AnimatedSection
                        key={card.label}
                        animation="scaleIn"
                        delay={index * 0.08}
                    >
                        <div className={`h-[120px] p-4 rounded-xl bg-linear-to-br ${card.gradient} border border-white/10 backdrop-blur-sm`}>
                            <div className="w-full h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 bg-${card.color}/20 rounded-lg`}>
                                        <card.icon className={`w-5 h-5 text-${card.color}`} />
                                    </div>
                                    <span className={`text-xs font-mono text-${card.color} bg-${card.color}/10 px-2 py-0.5 rounded`}>
                                        {card.label}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-0.5">{card.value}개</h3>
                                    <p className="text-gray-400 text-xs">{card.description}</p>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                ))}
            </div>
        </div>
    );
}
