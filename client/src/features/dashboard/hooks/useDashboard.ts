import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDashboardRepository } from '@/di';
import { useTaskStore } from '@/stores/taskStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMemberStore } from '@/stores/memberStore';
import { useAuthStore } from '@/stores/authStore';
import type { DashboardStats, Task, TeamProgress, ActivityLog, Project } from '@/types';

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  overdue: number;
}

// 멤버별 업무 정보
export interface MemberWithTasks {
  id: string;
  name: string;
  avatarUrl?: string;
  tasks: Task[];
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

interface DashboardData {
  stats: DashboardStats;
  projectStats: ProjectStats;
  projects: Project[];
  allTasks: Task[];
  myTasks: Task[];
  teamProgress: TeamProgress[];
  memberProgress: MemberWithTasks[];
  activities: ActivityLog[];
}

interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const dashboardRepository = useDashboardRepository();

  // Store 데이터를 Single Source of Truth로 사용
  const storeTasks = useTaskStore((state) => state.tasks);
  const storeProjects = useProjectStore((state) => state.projects);
  const storeMembers = useMemberStore((state) => state.members);
  const { user } = useAuthStore();

  const [additionalData, setAdditionalData] = useState<{
    teamProgress: TeamProgress[];
    activities: ActivityLog[];
  }>({
    teamProgress: [],
    activities: [],
  });
  const [additionalLoading, setAdditionalLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 대시보드 전용 추가 데이터만 Repository로 가져옴 (teamProgress, activities)
  // stats는 Store에서 계산하므로 API 호출 제거
  const fetchAdditionalData = useCallback(async () => {
    try {
      setAdditionalLoading(true);
      setError(null);

      const [teamProgress, activities] = await Promise.all([
        dashboardRepository.getTeamProgress(),
        dashboardRepository.getRecentActivities(),
      ]);

      setAdditionalData({ teamProgress, activities });
    } catch (err) {
      const isNetworkError = err instanceof Error && 'code' in err && (err as { code?: string }).code === 'NETWORK_ERROR';
      if (isNetworkError) {
        console.warn('Dashboard fetch error:', err);
      } else {
        console.error('Dashboard fetch error:', err);
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setAdditionalLoading(false);
    }
  }, [dashboardRepository]);

  // 최초 로드 시에만 추가 데이터 가져옴
  useEffect(() => {
    fetchAdditionalData();
  }, [fetchAdditionalData]);

  // 업무 통계: Store에서 직접 계산 (모든 페이지와 동기화)
  const stats = useMemo((): DashboardStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      total: storeTasks.length,
      todo: storeTasks.filter((t) => t.status === 'TODO').length,
      inProgress: storeTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: storeTasks.filter((t) => t.status === 'REVIEW').length,
      done: storeTasks.filter((t) => t.status === 'DONE').length,
      overdue: storeTasks.filter((t) => {
        if (!t.dueDate || t.status === 'DONE') return false;
        return new Date(t.dueDate) < today;
      }).length,
      projects: storeProjects.length,
      members: storeMembers.length,
    };
  }, [storeTasks, storeProjects.length, storeMembers.length]);

  // 프로젝트 통계: Store에서 직접 계산
  const projectStats = useMemo((): ProjectStats => {
    const now = new Date();
    return {
      total: storeProjects.length,
      active: storeProjects.filter((p) => p.status === 'ACTIVE').length,
      completed: storeProjects.filter((p) => p.status === 'COMPLETED').length,
      onHold: storeProjects.filter((p) => p.status === 'ON_HOLD').length,
      overdue: storeProjects.filter((p) => {
        if (!p.endDate || p.status === 'COMPLETED') return false;
        return new Date(p.endDate) < now;
      }).length,
    };
  }, [storeProjects]);

  // 내 업무: Store에서 직접 필터링
  const myTasks = useMemo((): Task[] => {
    if (!user?.id) return [];
    return storeTasks.filter((task) => {
      if (task.assignees?.some((a) => a.id === user.id)) return true;
      if (task.assignee?.id === user.id) return true;
      return false;
    });
  }, [storeTasks, user?.id]);

  // 멤버별 업무 현황: Store에서 계산
  const memberProgress = useMemo((): MemberWithTasks[] => {
    return storeMembers.map((member) => {
      // 해당 멤버가 담당하는 업무 찾기
      const memberTasks = storeTasks.filter((task) => {
        if (task.assignees?.some((a) => a.id === member.id)) return true;
        if (task.assignee?.id === member.id) return true;
        return false;
      });

      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        tasks: memberTasks,
        taskStats: {
          todo: memberTasks.filter((t) => t.status === 'TODO').length,
          inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
          review: memberTasks.filter((t) => t.status === 'REVIEW').length,
          done: memberTasks.filter((t) => t.status === 'DONE').length,
        },
      };
    }).sort((a, b) => {
      // 진행중인 업무가 많은 멤버 순으로 정렬
      const aActive = a.taskStats.inProgress + a.taskStats.review;
      const bActive = b.taskStats.inProgress + b.taskStats.review;
      return bActive - aActive;
    });
  }, [storeMembers, storeTasks]);

  // 최종 데이터
  const data = useMemo((): DashboardData => ({
    stats,
    projectStats,
    projects: storeProjects,
    allTasks: storeTasks,
    myTasks,
    teamProgress: additionalData.teamProgress,
    memberProgress,
    activities: additionalData.activities,
  }), [stats, projectStats, storeProjects, storeTasks, myTasks, memberProgress, additionalData]);

  return {
    data,
    loading: additionalLoading,
    error,
    refetch: fetchAdditionalData,
  };
}
