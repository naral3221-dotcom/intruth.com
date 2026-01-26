import { motion } from "framer-motion";
import { FolderKanban, TrendingUp, CheckSquare } from "lucide-react";
import { AnimatedSection } from "@/presentation/components/effects/AnimatedSection";

interface ProjectStatsProps {
    total: number;
    active: number;
    totalTasks: number;
}

export function ProjectStats({ total, active, totalTasks }: ProjectStatsProps) {
    const stats = [
        {
            icon: FolderKanban,
            label: "전체 프로젝트",
            value: total,
            color: "neon-violet",
            gradient: "from-neon-violet/20 to-purple-600/10",
        },
        {
            icon: TrendingUp,
            label: "진행중",
            value: active,
            color: "neon-teal",
            gradient: "from-neon-teal/20 to-emerald-500/10",
        },
        {
            icon: CheckSquare,
            label: "전체 업무",
            value: totalTasks,
            color: "blue-400",
            gradient: "from-blue-500/20 to-cyan-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, index) => (
                <AnimatedSection key={stat.label} animation="scaleIn" delay={index * 0.1}>
                    <motion.div
                        className={`p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm`}
                        whileHover={{ scale: 1.02, y: -2 }}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-${stat.color}/20`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-sm text-gray-400">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatedSection>
            ))}
        </div>
    );
}
