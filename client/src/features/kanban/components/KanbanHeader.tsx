import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Layers, FolderOpen, Check } from "lucide-react";
import type { Project } from "@/types";

interface KanbanHeaderProps {
    projects: Project[];
    selectedProjectId: string | null;
    showAllProjects: boolean;
    onProjectSelect: (projectId: string | null) => void;
    onShowAllToggle: (showAll: boolean) => void;
    onAddProject: () => void;
    taskCount: number;
}

export function KanbanHeader({
    projects,
    selectedProjectId,
    showAllProjects,
    onProjectSelect,
    onShowAllToggle,
    onAddProject,
    taskCount,
}: KanbanHeaderProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const displayName = showAllProjects
        ? "전체 프로젝트"
        : selectedProject?.name || "프로젝트 선택";

    const activeProjects = projects.filter(p => p.status === 'ACTIVE');

    return (
        <header className="shrink-0 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {/* 프로젝트 선택 드롭다운 */}
                    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                        <motion.button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3
                                       bg-white border border-gray-200
                                       hover:border-gray-300 hover:shadow-sm transition-all duration-200
                                       group sm:min-w-[240px]"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <div className="shrink-0 p-2 rounded-lg bg-gray-100 text-gray-600">
                                {showAllProjects ? (
                                    <Layers className="w-5 h-5" />
                                ) : (
                                    <FolderOpen className="w-5 h-5" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <span className="block truncate text-base font-semibold text-gray-900">
                                    {displayName}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {taskCount}개의 업무
                                </span>
                            </div>
                            <motion.div
                                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </motion.div>
                        </motion.button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-2 w-full min-w-[280px]
                                               bg-white border border-gray-200
                                               rounded-xl shadow-lg overflow-hidden z-50"
                                >
                                    {/* 전체 프로젝트 옵션 */}
                                    <motion.button
                                        onClick={() => {
                                            onShowAllToggle(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left
                                                   transition-all duration-150
                                                   ${showAllProjects
                                                       ? 'bg-gray-900 text-white'
                                                       : 'text-gray-700 hover:bg-gray-50'
                                                   }`}
                                        whileHover={{ x: showAllProjects ? 0 : 4 }}
                                    >
                                        <Layers className="w-5 h-5" />
                                        <span className="flex-1 font-medium">전체 프로젝트</span>
                                        {showAllProjects && <Check className="w-4 h-4" />}
                                    </motion.button>

                                    <div className="border-t border-gray-100" />

                                    {/* 프로젝트 목록 */}
                                    <div className="max-h-[300px] overflow-y-auto py-1">
                                        {activeProjects.length === 0 ? (
                                            <div className="px-4 py-6 text-center text-gray-400">
                                                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">활성 프로젝트가 없습니다</p>
                                            </div>
                                        ) : (
                                            activeProjects.map((project, index) => (
                                                <motion.button
                                                    key={project.id}
                                                    onClick={() => {
                                                        onShowAllToggle(false);
                                                        onProjectSelect(project.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left
                                                               transition-all duration-150
                                                               ${!showAllProjects && selectedProjectId === project.id
                                                                   ? 'bg-gray-100 text-gray-900'
                                                                   : 'text-gray-700 hover:bg-gray-50'
                                                               }`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    whileHover={{ x: 4 }}
                                                >
                                                    <FolderOpen className="w-5 h-5 text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium block truncate">
                                                            {project.name}
                                                        </span>
                                                        {project.description && (
                                                            <span className="text-xs text-gray-400 block truncate">
                                                                {project.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0">
                                                        {project._count?.tasks || 0}개
                                                    </span>
                                                    {!showAllProjects && selectedProjectId === project.id && (
                                                        <Check className="w-4 h-4 shrink-0" />
                                                    )}
                                                </motion.button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="text-gray-400 text-sm hidden md:block">
                        드래그하여 업무 상태를 변경하세요
                    </p>
                </div>

                <button
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
                    onClick={onAddProject}
                >
                    <Plus className="w-4 h-4" /> 새 프로젝트
                </button>
            </div>
        </header>
    );
}
