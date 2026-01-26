import { motion } from "framer-motion";
import { ClipboardList, RefreshCw, Plus, Calendar, List, Clock } from "lucide-react";
import {
    useMyTasks,
    MyTaskFilters,
    UrgentTasksSection,
    ProgressOverview,
    EnhancedTaskCard,
    TaskCalendarView,
    TaskTimelineView,
    TaskSearchBar,
    WeeklyChart,
    TodayRoutineSection,
} from "@/features/my-tasks";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/core/utils/cn";

export function MyTasksPage() {
    const { openEditTaskModal, openCreateRoutineModal, openCreateProjectModal } = useUIStore();
    const {
        tasks,
        filteredTasks,
        loading,
        stats,
        filter,
        sort,
        sortDirection,
        searchQuery,
        viewMode,
        todayTasks,
        thisWeekTasks,
        overdueTasks,
        setFilter,
        setSort,
        toggleSortDirection,
        setSearchQuery,
        setViewMode,
        updateTaskStatus,
        quickComplete,
        refetch,
    } = useMyTasks();

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">업무를 불러오는 중...</p>
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
                    <h1 className="text-2xl font-bold text-foreground">
                        내 할일
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        총 {stats.total}개 · {stats.done}개 완료
                        {stats.overdue > 0 && (
                            <span className="text-destructive ml-2">
                                · {stats.overdue}개 지연
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refetch}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        className="aboard-btn-primary inline-flex items-center gap-2"
                        onClick={() => openCreateProjectModal()}
                    >
                        <Plus className="w-4 h-4" /> 새 프로젝트
                    </button>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setFilter('all')}
                    className={cn(
                        "aboard-card p-4 text-left transition-all",
                        filter === 'all' && "ring-2 ring-primary"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">전체</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter('IN_PROGRESS')}
                    className={cn(
                        "aboard-card p-4 text-left transition-all",
                        filter === 'IN_PROGRESS' && "ring-2 ring-primary"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                            <p className="text-xs text-muted-foreground">진행 중</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter('DONE')}
                    className={cn(
                        "aboard-card p-4 text-left transition-all",
                        filter === 'DONE' && "ring-2 ring-primary"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl widget-icon-green flex items-center justify-center">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.done}</p>
                            <p className="text-xs text-muted-foreground">완료</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setFilter('TODO')}
                    className={cn(
                        "aboard-card p-4 text-left transition-all",
                        (stats.overdue > 0) && "border-destructive/50",
                        filter === 'TODO' && "ring-2 ring-primary"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            stats.overdue > 0 ? "widget-icon-orange" : "bg-muted text-muted-foreground"
                        )}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.todo}</p>
                            <p className="text-xs text-muted-foreground">
                                대기{stats.overdue > 0 && <span className="text-destructive"> ({stats.overdue} 지연)</span>}
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Today's Routine Section */}
            <TodayRoutineSection onCreateRoutine={() => openCreateRoutineModal()} />

            {/* Urgent Tasks Section */}
            <UrgentTasksSection
                todayTasks={todayTasks}
                thisWeekTasks={thisWeekTasks}
                overdueTasks={overdueTasks}
                onTaskClick={openEditTaskModal}
            />

            {/* Progress & Weekly Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProgressOverview stats={stats} />
                <WeeklyChart tasks={tasks} />
            </div>

            {/* Search & Filters & View Toggle */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                    <TaskSearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>
                <MyTaskFilters
                    filter={filter}
                    sort={sort}
                    sortDirection={sortDirection}
                    onFilterChange={setFilter}
                    onSortChange={setSort}
                    onToggleSortDirection={toggleSortDirection}
                />
                {/* View Mode Toggle */}
                <div className="flex items-center bg-card rounded-lg border border-border p-1">
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
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            viewMode === 'calendar' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="캘린더 뷰"
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            viewMode === 'timeline' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="타임라인 뷰"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Task Views */}
            {viewMode === "list" && (
                <div className="aboard-card overflow-hidden">
                    {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm mb-1">
                                {searchQuery
                                    ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
                                    : filter === "all"
                                        ? "할당된 업무가 없습니다"
                                        : `선택한 상태의 업무가 없습니다`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {searchQuery
                                    ? "다른 검색어를 입력해보세요"
                                    : "새 프로젝트를 추가해보세요"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredTasks.map((task, index) => (
                                <EnhancedTaskCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onClick={() => openEditTaskModal(task)}
                                    onStatusChange={updateTaskStatus}
                                    onQuickComplete={quickComplete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewMode === "calendar" && (
                <TaskCalendarView
                    tasks={filteredTasks}
                    onTaskClick={openEditTaskModal}
                />
            )}

            {viewMode === "timeline" && (
                <TaskTimelineView
                    tasks={filteredTasks}
                    onTaskClick={openEditTaskModal}
                />
            )}
        </motion.div>
    );
}
