import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    FolderKanban,
    Calendar,
    LayoutGrid,
    List,
    Search,
    MoreHorizontal,
    Clock,
    Users,
    CheckCircle2,
    ArrowUpRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import {
    useProjects,
    ProjectEmptyState,
    ProjectTimelineView,
} from "@/features/projects";
import { useContextMenuWithLongPress } from "@/presentation/components/context-menu";
import { LongPressRipple } from "@/presentation/components/ui/LongPressRipple";
import { cn } from "@/core/utils/cn";
import type { Project } from "@/types";

type ViewMode = 'grid' | 'list' | 'timeline';

// Project Card Component for Grid View
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
    // Use _count from the project or default to 0
    const taskCount = (project as any)._count?.tasks || 0;
    const completedCount = (project as any).completedTasksCount || 0;
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    // 우클릭 / Long Press 지원
    const { contextMenuProps, isLongPressing, ripplePosition } = useContextMenuWithLongPress({
        type: 'project',
        data: { project },
    });

    const statusColors: Record<string, string> = {
        ACTIVE: 'aboard-badge-success',
        COMPLETED: 'aboard-badge-info',
        ON_HOLD: 'aboard-badge-warning',
        ARCHIVED: 'bg-muted text-muted-foreground',
        CANCELLED: 'bg-muted text-muted-foreground',
    };

    const statusLabels: Record<string, string> = {
        ACTIVE: '진행 중',
        COMPLETED: '완료',
        ON_HOLD: '보류',
        ARCHIVED: '보관',
        CANCELLED: '취소',
    };

    return (
        <motion.div
            className="aboard-card p-5 cursor-pointer group relative overflow-hidden select-none"
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            onClick={onClick}
            whileHover={{ y: -2 }}
            {...contextMenuProps}
        >
            <LongPressRipple isActive={isLongPressing} position={ripplePosition} />
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: project.team?.color || '#00bcd4' }}
                    >
                        {project.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{project.team?.name || '팀 미지정'}</p>
                    </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {project.description || '프로젝트 설명이 없습니다'}
            </p>

            {/* Progress */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">진행률</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {completedCount}/{taskCount}
                    </span>
                    {project.endDate && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(project.endDate).toLocaleDateString()}
                        </span>
                    )}
                </div>
                <span className={cn("aboard-badge text-[10px]", statusColors[project.status] || 'bg-muted text-muted-foreground')}>
                    {statusLabels[project.status] || project.status}
                </span>
            </div>
        </motion.div>
    );
}

// Project Row Component for List View
function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
    // Use _count from the project or default to 0
    const taskCount = (project as any)._count?.tasks || 0;
    const completedCount = (project as any).completedTasksCount || 0;
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    // 우클릭 / Long Press 지원 (테이블 행에서는 Ripple 효과 미사용)
    const { contextMenuProps } = useContextMenuWithLongPress({
        type: 'project',
        data: { project },
    });

    return (
        <motion.tr
            className="group cursor-pointer relative select-none"
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            onClick={onClick}
            whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
            {...contextMenuProps}
        >
            <td>
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: project.team?.color || '#00bcd4' }}
                    >
                        {project.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{project.team?.name || '팀 미지정'}</p>
                    </div>
                </div>
            </td>
            <td>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm text-muted-foreground w-10">{progress}%</span>
                </div>
            </td>
            <td>
                <div className="flex items-center gap-1 text-xs">
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {taskCount - completedCount}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        {completedCount}
                    </span>
                </div>
            </td>
            <td>
                {project.endDate ? (
                    <span className="text-sm text-muted-foreground">
                        {new Date(project.endDate).toLocaleDateString()}
                    </span>
                ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                )}
            </td>
            <td>
                <span className={cn(
                    "aboard-badge text-[10px]",
                    project.status === 'ACTIVE' && 'aboard-badge-success',
                    project.status === 'COMPLETED' && 'aboard-badge-info',
                    project.status === 'ON_HOLD' && 'aboard-badge-warning',
                    (project.status === 'ARCHIVED' || (project.status as string) === 'CANCELLED') && 'bg-muted text-muted-foreground',
                )}>
                    {project.status === 'ACTIVE' ? '진행 중' :
                     project.status === 'COMPLETED' ? '완료' :
                     project.status === 'ON_HOLD' ? '보류' :
                     project.status === 'ARCHIVED' ? '보관' : '취소'}
                </span>
            </td>
            <td>
                <button
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
            </td>
        </motion.tr>
    );
}

export function ProjectsPage() {
    const { openCreateProjectModal, openProjectProgressModal } = useUIStore();
    const { projects, loading, stats } = useProjects();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter projects
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">프로젝트</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {stats.total}개 프로젝트 · {stats.active}개 진행 중
                    </p>
                </div>
                <button
                    className="aboard-btn-primary inline-flex items-center gap-2"
                    onClick={openCreateProjectModal}
                >
                    <Plus className="w-4 h-4" /> 새 프로젝트
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="aboard-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
                            <FolderKanban className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">전체 프로젝트</p>
                        </div>
                    </div>
                </div>
                <div className="aboard-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-green flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                            <p className="text-xs text-muted-foreground">진행 중</p>
                        </div>
                    </div>
                </div>
                <div className="aboard-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-purple flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.totalTasks}</p>
                            <p className="text-xs text-muted-foreground">전체 업무</p>
                        </div>
                    </div>
                </div>
                <div className="aboard-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-orange flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {projects.reduce((acc, p) => acc + (p.teamAssignments?.flatMap(ta => ta.assignees || []).length || 0), 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">참여 멤버</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="프로젝트 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="aboard-input pl-10"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="aboard-input w-auto"
                >
                    <option value="all">전체 상태</option>
                    <option value="ACTIVE">진행 중</option>
                    <option value="COMPLETED">완료</option>
                    <option value="ON_HOLD">보류</option>
                </select>
                <div className="flex items-center bg-card rounded-lg border border-border p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="그리드 뷰"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="리스트 뷰"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            viewMode === 'timeline' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="타임라인 뷰"
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {filteredProjects.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <ProjectEmptyState onCreateProject={openCreateProjectModal} />
                    </motion.div>
                ) : viewMode === 'grid' ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {filteredProjects.map((project, idx) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <ProjectCard
                                    project={project}
                                    onClick={() => openProjectProgressModal(project)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : viewMode === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="aboard-card overflow-hidden"
                    >
                        <table className="aboard-table">
                            <thead>
                                <tr>
                                    <th>프로젝트</th>
                                    <th>진행률</th>
                                    <th>업무</th>
                                    <th>마감일</th>
                                    <th>상태</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project) => (
                                    <ProjectRow
                                        key={project.id}
                                        project={project}
                                        onClick={() => openProjectProgressModal(project)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                ) : (
                    <motion.div
                        key="timeline"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ProjectTimelineView
                            projects={filteredProjects}
                            onProjectClick={(project) => openProjectProgressModal(project)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
