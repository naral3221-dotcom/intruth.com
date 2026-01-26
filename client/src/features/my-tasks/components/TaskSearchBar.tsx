import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, Sparkles } from "lucide-react";

interface TaskSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    recentSearches?: string[];
    onRecentSearchClick?: (search: string) => void;
}

export function TaskSearchBar({
    value,
    onChange,
    placeholder = "업무 검색... (제목, 프로젝트명)",
    recentSearches = [],
    onRecentSearchClick,
}: TaskSearchBarProps) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        onChange("");
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onChange("");
            inputRef.current?.blur();
        }
    };

    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to focus search
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    return (
        <div className="relative">
            <motion.div
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isFocused
                        ? "bg-white/10 ring-2 ring-neon-violet/50"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                animate={{
                    boxShadow: isFocused
                        ? "0 0 20px rgba(139, 92, 246, 0.2)"
                        : "none",
                }}
            >
                <Search
                    className={`w-5 h-5 transition-colors ${isFocused ? "text-neon-violet" : "text-gray-500"
                        }`}
                />

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />

                <AnimatePresence>
                    {value && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            onClick={handleClear}
                        >
                            <X className="w-4 h-4" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Keyboard Shortcut Hint */}
                {!isFocused && !value && (
                    <div className="hidden md:flex items-center gap-1 text-xs text-gray-600">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            ⌘
                        </kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            K
                        </kbd>
                    </div>
                )}
            </motion.div>

            {/* Recent Searches Dropdown */}
            <AnimatePresence>
                {isFocused && !value && recentSearches.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800 rounded-xl shadow-xl border border-white/10 z-50"
                    >
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>최근 검색</span>
                        </div>
                        <div className="space-y-1">
                            {recentSearches.slice(0, 5).map((search, index) => (
                                <motion.button
                                    key={index}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all text-left"
                                    onClick={() => onRecentSearchClick?.(search)}
                                    whileHover={{ x: 4 }}
                                >
                                    <Search className="w-3 h-3" />
                                    {search}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Tips */}
            <AnimatePresence>
                {isFocused && !value && recentSearches.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 p-4 bg-slate-800 rounded-xl shadow-xl border border-white/10 z-50"
                    >
                        <div className="flex items-center gap-2 mb-3 text-sm text-neon-violet">
                            <Sparkles className="w-4 h-4" />
                            <span className="font-medium">검색 팁</span>
                        </div>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li>• 업무 제목으로 검색</li>
                            <li>• 프로젝트 이름으로 검색</li>
                            <li>• ESC로 검색 취소</li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
