import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Plus,
    Settings,
    Gift,
    Calendar,
    Users,
    ArrowUpRight,
    Sparkles,
    Clock,
    Star
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useMeetingStore } from "@/stores/meetingStore";
import {
    useDashboard,
    ProjectTreeView,
    TeamProgress,
    ActivityFeed,
    MobileDashboardHome,
    ScheduleCalendar,
} from "@/features/dashboard";

// Quick Action Button Component
function QuickActionButton({
    icon: Icon,
    label,
    onClick,
    color = "default"
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    color?: "default" | "primary";
}) {
    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200 border
                ${color === "primary"
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                    : "bg-card text-foreground border-border hover:bg-muted hover:border-muted-foreground/20"
                }
            `}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

// Widget Card Component
function WidgetCard({
    icon: Icon,
    iconBg,
    title,
    subtitle,
    children,
    className = "",
    onClick
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <motion.div
            className={`aboard-card p-5 cursor-pointer ${className}`}
            whileHover={{ y: -2 }}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                    </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>
            {children}
        </motion.div>
    );
}

// Sticky Note Component
function StickyNote() {
    const [note, setNote] = useState("");

    return (
        <motion.div
            className="sticky-note p-5 h-full min-h-[200px] flex flex-col"
            whileHover={{ rotate: 0.5, scale: 1.01 }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">개인 노트</span>
                <button className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-700/30 rounded transition-colors">
                    <Settings className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                </button>
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모를 작성하세요..."
                className="flex-1 w-full bg-transparent resize-none outline-none text-amber-900 dark:text-amber-100 placeholder:text-amber-600/50 dark:placeholder:text-amber-400/50 text-sm"
            />
        </motion.div>
    );
}

// Task Widget Content
function TaskWidgetContent({ tasks }: { tasks: { todo: number; inProgress: number; done: number } }) {
    const total = tasks.todo + tasks.inProgress + tasks.done;

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">할당된 업무가 없습니다</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-foreground">대기 중</span>
                </div>
                <span className="text-sm font-semibold">{tasks.todo}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-foreground">진행 중</span>
                </div>
                <span className="text-sm font-semibold">{tasks.inProgress}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-foreground">완료</span>
                </div>
                <span className="text-sm font-semibold">{tasks.done}</span>
            </div>
        </div>
    );
}

export function Dashboard() {
    const { user: member } = useAuthStore();
    const {
        openCreateProjectModal,
        openEditTaskModal,
        openCreateTaskModal,
        openCreateMeetingModal,
    } = useUIStore();
    const { data, loading } = useDashboard();
    const { stats, projectStats, projects, allTasks, memberProgress, activities } = data;
    const meetings = useMeetingStore((state) => state.meetings);
    const fetchMeetings = useMeetingStore((state) => state.fetchMeetings);

    useEffect(() => {
        if (meetings.length === 0) {
            void fetchMeetings();
        }
    }, [fetchMeetings, meetings.length]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">대시보드를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="lg:hidden">
                <MobileDashboardHome
                    memberName={member?.name}
                    stats={stats}
                    projectStats={projectStats}
                    myTasks={data.myTasks}
                    meetings={meetings}
                    activities={activities}
                    onCreateTask={() => openCreateTaskModal()}
                    onCreateMeeting={openCreateMeetingModal}
                    onCreateProject={openCreateProjectModal}
                />
            </div>

            <div className="hidden space-y-8 lg:block">
            {/* Header Section */}
            <header className="space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h1 className="text-3xl font-bold text-foreground">
                        안녕하세요, {member?.name || "사용자"}님
                        <motion.span
                            className="inline-block ml-2"
                            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                        >
                            👋
                        </motion.span>
                    </h1>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    className="flex flex-wrap gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <QuickActionButton
                        icon={Plus}
                        label="새 프로젝트"
                        color="primary"
                        onClick={openCreateProjectModal}
                    />
                    <QuickActionButton icon={Users} label="팀 현황" />
                    <QuickActionButton icon={Calendar} label="일정 확인" />
                </motion.div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <ScheduleCalendar tasks={allTasks} meetings={meetings} />
            </motion.div>

            {/* Main Grid - Widget Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tasks Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <WidgetCard
                        icon={CheckCircle2}
                        iconBg="widget-icon-green"
                        title="업무"
                        subtitle={`총 ${(stats?.todo || 0) + (stats?.inProgress || 0) + (stats?.done || 0)}개`}
                    >
                        <TaskWidgetContent
                            tasks={{
                                todo: stats?.todo || 0,
                                inProgress: stats?.inProgress || 0,
                                done: stats?.done || 0
                            }}
                        />
                    </WidgetCard>
                </motion.div>

                {/* Sticky Note */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="row-span-1"
                >
                    <StickyNote />
                </motion.div>

                {/* Project Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <WidgetCard
                        icon={Sparkles}
                        iconBg="widget-icon-purple"
                        title="프로젝트"
                        subtitle={`${projectStats?.total || 0}개 진행 중`}
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">완료율</span>
                                <span className="text-sm font-semibold text-foreground">
                                    {projectStats?.total ? Math.round((projectStats?.completed / projectStats?.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${projectStats?.total ? (projectStats?.completed / projectStats?.total) * 100 : 0}%`
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-foreground">{projectStats?.active || 0}</p>
                                    <p className="text-xs text-muted-foreground">진행 중</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-foreground">{projectStats?.completed || 0}</p>
                                    <p className="text-xs text-muted-foreground">완료</p>
                                </div>
                            </div>
                        </div>
                    </WidgetCard>
                </motion.div>

                {/* Birthdays / Anniversaries Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <WidgetCard
                        icon={Gift}
                        iconBg="widget-icon-pink"
                        title="생일/기념일"
                        subtitle="이번 주"
                    >
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Gift className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm">이번 주 생일이 없습니다</p>
                        </div>
                    </WidgetCard>
                </motion.div>

                {/* Time-off Requests Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <WidgetCard
                        icon={Calendar}
                        iconBg="widget-icon-blue"
                        title="휴가/휴무"
                        subtitle="처리 대기"
                    >
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm">처리할 휴가 요청이 없습니다</p>
                        </div>
                    </WidgetCard>
                </motion.div>

                {/* Overdue Tasks Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                >
                    <WidgetCard
                        icon={Clock}
                        iconBg="widget-icon-orange"
                        title="지연 업무"
                        subtitle={`${stats?.overdue || 0}개`}
                    >
                        {(stats?.overdue || 0) === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <Star className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground text-sm">지연된 업무가 없습니다</p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">잘하고 계세요!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="p-3 bg-destructive/10 rounded-lg">
                                    <p className="text-2xl font-bold text-destructive">{stats?.overdue}</p>
                                    <p className="text-xs text-destructive/80">즉시 확인이 필요합니다</p>
                                </div>
                            </div>
                        )}
                    </WidgetCard>
                </motion.div>
            </div>

            {/* Project Tree & Activity Feed Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project Tree View */}
                <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <ProjectTreeView
                        projects={projects}
                        tasks={allTasks}
                        onTaskClick={openEditTaskModal}
                    />
                </motion.div>

                {/* Activity Feed */}
                <motion.div
                    className="lg:col-span-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                >
                    <ActivityFeed activities={activities} />
                </motion.div>
            </div>

            {/* Team Progress Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <TeamProgress members={memberProgress} onTaskClick={openEditTaskModal} />
            </motion.div>
            </div>
        </motion.div>
    );
}
