import { useState, useCallback, useMemo } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import type { ViewMode } from '../types';

export type TaskFilter = 'all' | TaskStatus | 'OVERDUE';
export type TaskSort = 'dueDate' | 'priority' | 'createdAt' | 'title';

interface ExtendedStats {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    completedThisWeek: number;
    dueTodayCount: number;
    dueThisWeekCount: number;
}

interface UseMyTasksReturn {
    tasks: Task[];
    filteredTasks: Task[];
    loading: boolean;
    error: Error | null;
    filter: TaskFilter;
    sort: TaskSort;
    sortDirection: 'asc' | 'desc';
    searchQuery: string;
    viewMode: ViewMode;
    stats: ExtendedStats;
    // 긴급 업무 분류
    todayTasks: Task[];
    thisWeekTasks: Task[];
    overdueTasks: Task[];
    // Actions
    setFilter: (filter: TaskFilter) => void;
    setSort: (sort: TaskSort) => void;
    toggleSortDirection: () => void;
    setSearchQuery: (query: string) => void;
    setViewMode: (mode: ViewMode) => void;
    updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
    quickComplete: (taskId: string) => Promise<void>;
    refetch: () => Promise<void>;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

export function useMyTasks(): UseMyTasksReturn {
    const { user: member } = useAuthStore();
    // Store 데이터를 Single Source of Truth로 사용
    const storeTasks = useTaskStore((state) => state.tasks);
    const storeLoading = useTaskStore((state) => state.loading);
    const storeError = useTaskStore((state) => state.error);
    const storeUpdateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
    const fetchTasks = useTaskStore((state) => state.fetchTasks);

    const [filter, setFilter] = useState<TaskFilter>('all');
    const [sort, setSort] = useState<TaskSort>('dueDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Store에서 내 업무만 필터링 (API 재호출 없이 자동 반영)
    const tasks = useMemo((): Task[] => {
        if (!member?.id) return [];
        return storeTasks.filter((task) => {
            if (task.assignees?.some((a) => a.id === member.id)) return true;
            if (task.assignee?.id === member.id) return true;
            return false;
        });
    }, [storeTasks, member?.id]);

    // 날짜 관련 상수
    const dateRanges = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);

        return { now, today, tomorrow, weekEnd, weekStart };
    }, []);

    // 긴급 업무 분류
    const { todayTasks, thisWeekTasks, overdueTasks } = useMemo(() => {
        const { today, tomorrow, weekEnd } = dateRanges;

        const overdue = tasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'DONE'
        );

        const todayDue = tasks.filter((t) => {
            if (!t.dueDate || t.status === 'DONE') return false;
            const dueDate = new Date(t.dueDate);
            return dueDate >= today && dueDate < tomorrow;
        });

        const thisWeek = tasks.filter((t) => {
            if (!t.dueDate || t.status === 'DONE') return false;
            const dueDate = new Date(t.dueDate);
            return dueDate >= tomorrow && dueDate < weekEnd;
        });

        return {
            todayTasks: todayDue,
            thisWeekTasks: thisWeek,
            overdueTasks: overdue,
        };
    }, [tasks, dateRanges]);

    // 확장된 통계 계산
    const stats = useMemo(() => {
        const { weekStart } = dateRanges;

        // 이번 주 완료된 업무 수
        const completedThisWeek = tasks.filter((t) => {
            if (t.status !== 'DONE' || !t.updatedAt) return false;
            const updateDate = new Date(t.updatedAt);
            return updateDate >= weekStart;
        }).length;

        return {
            total: tasks.length,
            todo: tasks.filter((t) => t.status === 'TODO').length,
            inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
            review: tasks.filter((t) => t.status === 'REVIEW').length,
            done: tasks.filter((t) => t.status === 'DONE').length,
            overdue: overdueTasks.length,
            completedThisWeek,
            dueTodayCount: todayTasks.length,
            dueThisWeekCount: thisWeekTasks.length,
        };
    }, [tasks, dateRanges, todayTasks, thisWeekTasks, overdueTasks]);

    // 필터링 및 정렬
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // 검색 필터 적용
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.title.toLowerCase().includes(query) ||
                    t.project?.name?.toLowerCase().includes(query) ||
                    t.description?.toLowerCase().includes(query)
            );
        }

        // 상태 필터 적용
        if (filter === 'OVERDUE') {
            // 지연된 업무 필터
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            result = result.filter(
                (t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'DONE'
            );
        } else if (filter !== 'all') {
            result = result.filter((t) => t.status === filter);
        }

        // 정렬 적용
        result.sort((a, b) => {
            let comparison = 0;

            switch (sort) {
                case 'dueDate':
                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    comparison = dateA - dateB;
                    break;
                case 'priority':
                    comparison = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
                    break;
                case 'createdAt':
                    comparison =
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title, 'ko');
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [tasks, filter, sort, sortDirection, searchQuery]);

    const toggleSortDirection = useCallback(() => {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }, []);

    // 빠른 상태 변경 - Store를 통해 변경 (모든 페이지에서 자동 반영)
    const updateTaskStatus = useCallback(
        async (taskId: string, newStatus: TaskStatus) => {
            try {
                await storeUpdateTaskStatus(taskId, newStatus);
            } catch (err) {
                console.error('Failed to update task status:', err);
                throw err;
            }
        },
        [storeUpdateTaskStatus]
    );

    // 빠른 완료
    const quickComplete = useCallback(
        async (taskId: string) => {
            await updateTaskStatus(taskId, 'DONE');
        },
        [updateTaskStatus]
    );

    return {
        tasks,
        filteredTasks,
        loading: storeLoading,
        error: storeError ? new Error(storeError) : null,
        filter,
        sort,
        sortDirection,
        searchQuery,
        viewMode,
        stats,
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
        refetch: fetchTasks,
    };
}
