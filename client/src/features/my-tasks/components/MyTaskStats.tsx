import { motion } from "framer-motion";
import { Clock, Zap, CheckCircle, AlertTriangle, Eye, LayoutGrid } from "lucide-react";

type FilterType = "all" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "OVERDUE";

interface MyTaskStatsProps {
    stats: {
        total: number;
        todo: number;
        inProgress: number;
        review: number;
        done: number;
        overdue: number;
    };
    currentFilter?: FilterType;
    onFilterChange?: (filter: FilterType) => void;
}

export function MyTaskStats({ stats, currentFilter = "all", onFilterChange }: MyTaskStatsProps) {
    const statItems: {
        icon: typeof Clock;
        label: string;
        value: number;
        color: string;
        bgColor: string;
        activeColor: string;
        filterKey: FilterType;
    }[] = [
        {
            icon: LayoutGrid,
            label: "전체",
            value: stats.total,
            color: "text-neon-violet",
            bgColor: "bg-neon-violet/20",
            activeColor: "bg-neon-violet text-white",
            filterKey: "all",
        },
        {
            icon: Clock,
            label: "대기",
            value: stats.todo,
            color: "text-gray-400",
            bgColor: "bg-gray-500/20",
            activeColor: "bg-gray-500 text-white",
            filterKey: "TODO",
        },
        {
            icon: Zap,
            label: "진행중",
            value: stats.inProgress,
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            activeColor: "bg-blue-500 text-white",
            filterKey: "IN_PROGRESS",
        },
        {
            icon: Eye,
            label: "검토",
            value: stats.review,
            color: "text-yellow-400",
            bgColor: "bg-yellow-500/20",
            activeColor: "bg-yellow-500 text-white",
            filterKey: "REVIEW",
        },
        {
            icon: CheckCircle,
            label: "완료",
            value: stats.done,
            color: "text-neon-teal",
            bgColor: "bg-neon-teal/20",
            activeColor: "bg-neon-teal text-white",
            filterKey: "DONE",
        },
        {
            icon: AlertTriangle,
            label: "지연",
            value: stats.overdue,
            color: "text-red-400",
            bgColor: "bg-red-500/20",
            activeColor: "bg-red-500 text-white",
            filterKey: "OVERDUE",
        },
    ];

    const isClickable = !!onFilterChange;

    return (
        <div className="flex flex-wrap gap-3">
            {statItems.map((item, index) => {
                const isActive = currentFilter === item.filterKey;

                return (
                    <motion.button
                        key={item.label}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                            isActive
                                ? item.activeColor
                                : item.bgColor
                        } ${isClickable ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "cursor-default"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={isClickable ? { scale: 1.05 } : undefined}
                        whileTap={isClickable ? { scale: 0.95 } : undefined}
                        onClick={() => onFilterChange?.(item.filterKey)}
                        type="button"
                    >
                        <item.icon className={`w-4 h-4 ${isActive ? "text-current" : item.color}`} />
                        <span className={`text-sm ${isActive ? "text-current" : "text-gray-400"}`}>
                            {item.label}
                        </span>
                        <span className={`text-sm font-bold ${isActive ? "text-current" : item.color}`}>
                            {item.value}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}
