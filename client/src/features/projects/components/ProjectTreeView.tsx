import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    Folder,
    FolderOpen,
    CheckCircle,
    Clock,
    AlertCircle,
    Pause,
    FileText,
    Users,
    Calendar
} from "lucide-react";
import { cn } from "@/core/utils/cn";
import type { Project, Task } from "@/types";
import { useUIStore } from "@/stores/uiStore";

// 프로젝트에 tasks를 포함한 확장 타입
interface ProjectWithTasks extends Project {
    tasks?: Task[];
}

// 상태 설정
const STATUS_CONFIG = {
    COMPLETED: {
        label: "완료",
        icon: CheckCircle,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
    },
    REVIEW: {
        label: "검토",
        icon: AlertCircle,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
    },
    ACTIVE: {
        label: "진행중",
        icon: Clock,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
    },
    ON_HOLD: {
        label: "대기",
        icon: Pause,
        color: "text-gray-400",
        bgColor: "bg-gray-500/10",
        borderColor: "border-gray-500/30",
    },
};

// 상태 표시 순서
const STATUS_ORDER = ["COMPLETED", "REVIEW", "ACTIVE", "ON_HOLD"] as const;

interface ProjectTreeViewProps {
    projects: Project[];
    onProjectClick?: (project: Project) => void;
    onTaskClick?: (task: Task) => void;
}

export function ProjectTreeView({ projects, onProjectClick, onTaskClick }: ProjectTreeViewProps) {
    const { openContextMenu } = useUIStore();

    // 프로젝트 우클릭 핸들러
    const handleProjectContextMenu = useCallback((e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu('project', { x: e.clientX, y: e.clientY }, { project });
    }, [openContextMenu]);

    // 태스크 우클릭 핸들러
    const handleTaskContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu('task', { x: e.clientX, y: e.clientY }, { task });
    }, [openContextMenu]);

    // 상태별로 프로젝트 그룹핑
    const groupedProjects = useMemo(() => {
        const groups: Record<string, Project[]> = {};

        STATUS_ORDER.forEach(status => {
            groups[status] = projects.filter(p => p.status === status);
        });

        return groups;
    }, [projects]);

    return (
        <div className="space-y-4">
            {STATUS_ORDER.map((status) => {
                const config = STATUS_CONFIG[status];
                const statusProjects = groupedProjects[status];

                if (statusProjects.length === 0) return null;

                return (
                    <StatusGroup
                        key={status}
                        status={status}
                        config={config}
                        projects={statusProjects}
                        onProjectClick={onProjectClick}
                        onTaskClick={onTaskClick}
                        onProjectContextMenu={handleProjectContextMenu}
                        onTaskContextMenu={handleTaskContextMenu}
                    />
                );
            })}
        </div>
    );
}

interface StatusGroupProps {
    status: string;
    config: typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG];
    projects: Project[];
    onProjectClick?: (project: Project) => void;
    onTaskClick?: (task: Task) => void;
    onProjectContextMenu?: (e: React.MouseEvent, project: Project) => void;
    onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

function StatusGroup({ config, projects, onProjectClick, onTaskClick, onProjectContextMenu, onTaskContextMenu }: StatusGroupProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-xl border backdrop-blur-sm overflow-hidden",
                config.bgColor,
                config.borderColor
            )}
        >
            {/* Status Header */}
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                whileHover={{ x: 2 }}
            >
                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.div>
                <Icon className={cn("w-5 h-5", config.color)} />
                <span className={cn("font-semibold", config.color)}>
                    {config.label}
                </span>
                <span className="text-sm text-gray-500">
                    ({projects.length}개 프로젝트)
                </span>
            </motion.button>

            {/* Projects List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-1">
                            {projects.map((project) => (
                                <ProjectItem
                                    key={project.id}
                                    project={project}
                                    onProjectClick={onProjectClick}
                                    onTaskClick={onTaskClick}
                                    onProjectContextMenu={onProjectContextMenu}
                                    onTaskContextMenu={onTaskContextMenu}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

interface ProjectItemProps {
    project: ProjectWithTasks;
    onProjectClick?: (project: Project) => void;
    onTaskClick?: (task: Task) => void;
    onProjectContextMenu?: (e: React.MouseEvent, project: Project) => void;
    onTaskContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

function ProjectItem({ project, onProjectClick, onTaskClick, onProjectContextMenu, onTaskContextMenu }: ProjectItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasTasks = project.tasks && project.tasks.length > 0;

    // 팀 정보 수집 (teams 또는 team)
    const teams = project.teams?.length ? project.teams : (project.team ? [project.team] : []);

    // 담당자 정보 수집 (teamAssignments에서 모든 담당자 추출)
    const allAssignees = useMemo(() => {
        if (project.teamAssignments?.length) {
            const assigneeMap = new Map<string, { id: string; name: string; avatarUrl?: string }>();
            project.teamAssignments.forEach(ta => {
                ta.assignees?.forEach(a => {
                    if (!assigneeMap.has(a.id)) {
                        assigneeMap.set(a.id, { id: a.id, name: a.name, avatarUrl: a.avatarUrl });
                    }
                });
            });
            return Array.from(assigneeMap.values());
        }
        // members에서 가져오기
        if (project.members?.length) {
            return project.members.map(pm => ({
                id: pm.member.id,
                name: pm.member.name,
                avatarUrl: pm.member.avatarUrl
            }));
        }
        return [];
    }, [project.teamAssignments, project.members]);

    return (
        <div className="ml-4">
            {/* Project Row */}
            <motion.div
                className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                whileHover={{ x: 3 }}
                onContextMenu={(e) => onProjectContextMenu?.(e, project)}
            >
                {hasTasks ? (
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded"
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </motion.div>
                    </motion.button>
                ) : (
                    <div className="w-5" />
                )}

                {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-neon-violet shrink-0" />
                ) : (
                    <Folder className="w-4 h-4 text-neon-violet shrink-0" />
                )}

                <span
                    onClick={() => onProjectClick?.(project)}
                    className="text-white hover:text-neon-violet transition-colors truncate min-w-[120px]"
                >
                    {project.name}
                </span>

                {/* 팀 배지 + 담당자 이름 배지 */}
                {(teams.length > 0 || allAssignees.length > 0) && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* 팀 배지 */}
                        {teams.slice(0, 1).map((team) => (
                            <span
                                key={team.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{
                                    backgroundColor: `${team.color}20`,
                                    color: team.color,
                                    border: `1px solid ${team.color}40`
                                }}
                            >
                                <Users className="w-3 h-3" />
                                {team.name}
                            </span>
                        ))}
                        {/* 담당자 이름 배지 */}
                        {allAssignees.slice(0, 3).map((assignee) => (
                            <span
                                key={assignee.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                            >
                                {assignee.name}
                            </span>
                        ))}
                        {allAssignees.length > 3 && (
                            <span className="text-[10px] text-gray-500">
                                +{allAssignees.length - 3}명
                            </span>
                        )}
                    </div>
                )}

                {/* 기간 표시 */}
                {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0 ml-auto">
                        <Calendar className="w-3 h-3" />
                        <span>
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                            {project.startDate && project.endDate && ' ~ '}
                            {project.endDate ? new Date(project.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                    </div>
                )}

                {/* 업무 개수 */}
                {hasTasks && (
                    <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {project.tasks?.length}개 업무
                    </span>
                )}
            </motion.div>

            {/* Tasks List */}
            <AnimatePresence>
                {isExpanded && hasTasks && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden ml-6"
                    >
                        <div className="space-y-0.5 py-1">
                            {project.tasks?.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onClick={() => onTaskClick?.(task)}
                                    onContextMenu={(e) => onTaskContextMenu?.(e, task)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface TaskItemProps {
    task: Task;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

function TaskItem({ task, onClick, onContextMenu }: TaskItemProps) {
    const priorityConfig = {
        LOW: { label: "낮음", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
        MEDIUM: { label: "보통", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
        HIGH: { label: "높음", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
        URGENT: { label: "긴급", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    };

    const statusConfig = {
        TODO: { label: "할일", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
        IN_PROGRESS: { label: "진행중", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
        REVIEW: { label: "검토", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
        DONE: { label: "완료", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    };

    const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
    const status = statusConfig[task.status] || statusConfig.TODO;

    // 담당자 목록 (assignees 우선, 없으면 assignee)
    const assignees = task.assignees?.length ? task.assignees : (task.assignee ? [task.assignee] : []);

    return (
        <motion.div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="flex items-start gap-2 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ml-2"
            whileHover={{ x: 3 }}
        >
            <div className="mt-0.5 shrink-0">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* 1행: 우선순위 + 제목 */}
                <div className="flex items-start gap-2">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 mt-0.5",
                        priority.color,
                        priority.bg,
                        priority.border
                    )}>
                        {priority.label}
                    </span>
                    <span
                        className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 break-all"
                        title={task.title}
                    >
                        {task.title}
                    </span>
                </div>

                {/* 2행: 메타데이터 (상태, 담당자) */}
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0",
                        status.color,
                        status.bg,
                        status.border
                    )}>
                        {status.label}
                    </span>

                    {/* 담당자 이름 배지 */}
                    {assignees.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                            {assignees.slice(0, 2).map((assignee) => (
                                <span
                                    key={assignee.id}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                >
                                    {assignee.name}
                                </span>
                            ))}
                            {assignees.length > 2 && (
                                <span className="text-[9px] text-gray-500">+{assignees.length - 2}</span>
                            )}
                        </div>
                    )}

                    {/* 업무 기간 표시 */}
                    {(task.startDate || task.dueDate) && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 shrink-0 ml-auto">
                            <Calendar className="w-3 h-3" />
                            <span>
                                {task.startDate ? new Date(task.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                                {task.startDate && task.dueDate && ' ~ '}
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
