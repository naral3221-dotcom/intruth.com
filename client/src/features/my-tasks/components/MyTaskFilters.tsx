import { motion } from "framer-motion";
import { Filter, ArrowUpDown, ChevronDown } from "lucide-react";
import type { TaskFilter, TaskSort } from "../hooks/useMyTasks";

interface MyTaskFiltersProps {
    filter: TaskFilter;
    sort: TaskSort;
    sortDirection: "asc" | "desc";
    onFilterChange: (filter: TaskFilter) => void;
    onSortChange: (sort: TaskSort) => void;
    onToggleSortDirection: () => void;
}

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "TODO", label: "예정" },
    { value: "IN_PROGRESS", label: "진행중" },
    { value: "REVIEW", label: "검토" },
    { value: "DONE", label: "완료" },
];

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
    { value: "dueDate", label: "마감일" },
    { value: "priority", label: "우선순위" },
    { value: "createdAt", label: "생성일" },
    { value: "title", label: "제목" },
];

export function MyTaskFilters({
    filter,
    sort,
    sortDirection,
    onFilterChange,
    onSortChange,
    onToggleSortDirection,
}: MyTaskFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                {FILTER_OPTIONS.map((option) => (
                    <motion.button
                        key={option.value}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            filter === option.value
                                ? "bg-neon-violet text-white"
                                : "text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => onFilterChange(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {option.label}
                    </motion.button>
                ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
                <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">
                            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                        </span>
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 mt-2 w-40 py-2 bg-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-white/10">
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                    sort === option.value
                                        ? "text-neon-violet bg-white/5"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                                onClick={() => onSortChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sort Direction Toggle */}
                <motion.button
                    className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    onClick={onToggleSortDirection}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={sortDirection === "asc" ? "오름차순" : "내림차순"}
                >
                    <ArrowUpDown
                        className={`w-4 h-4 transition-transform ${
                            sortDirection === "desc" ? "rotate-180" : ""
                        }`}
                    />
                </motion.button>
            </div>
        </div>
    );
}
