import { motion } from "framer-motion";
import { List, Calendar, GitBranch } from "lucide-react";
import type { ViewMode } from "../types";

interface ViewModeToggleProps {
    viewMode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const VIEW_OPTIONS: { value: ViewMode; icon: typeof List; label: string }[] = [
    { value: "list", icon: List, label: "리스트" },
    { value: "calendar", icon: Calendar, label: "캘린더" },
    { value: "timeline", icon: GitBranch, label: "타임라인" },
];

export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
    return (
        <div className="flex items-center bg-white/5 rounded-xl p-1">
            {VIEW_OPTIONS.map((option) => (
                <motion.button
                    key={option.value}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === option.value
                            ? "text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                    onClick={() => onChange(option.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {viewMode === option.value && (
                        <motion.div
                            layoutId="viewModeIndicator"
                            className="absolute inset-0 bg-neon-violet/20 rounded-lg"
                            transition={{ type: "spring", duration: 0.3 }}
                        />
                    )}
                    <option.icon className="w-4 h-4 relative z-10" />
                    <span className="hidden md:inline relative z-10">{option.label}</span>
                </motion.button>
            ))}
        </div>
    );
}
