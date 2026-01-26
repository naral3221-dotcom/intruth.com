import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeamStore } from '@/stores/teamStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTaskRepository } from '@/di';
import type { Task, TeamMemberRole } from '@/types';
import type { TeamWithMembers, TeamMemberWithStats, TaskStats, UseTeamDetailReturn } from '../types';

export function useTeamDetail(teamId: string | null): UseTeamDetailReturn {
  const taskRepository = useTaskRepository();

  const {
    getTeamById,
    getTeamMembers,
    fetchTeamMembers,
    addMemberToTeam,
    removeMemberFromTeam,
    updateMemberRole,
    loading: storeLoading,
  } = useTeamStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [memberTasks, setMemberTasks] = useState<Map<string, Task[]>>(new Map());

  // 팀 상세 및 멤버 로드
  const loadTeamDetail = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // 팀 멤버 조회
      await fetchTeamMembers(teamId);

      // 전체 태스크 조회 (없으면)
      if (tasks.length === 0) {
        await fetchTasks();
      }

      // 멤버별 태스크 로드
      const teamMembers = getTeamMembers(teamId);
      const tasksMap = new Map<string, Task[]>();

      for (const member of teamMembers) {
        try {
          const memberTaskList = await taskRepository.findByAssigneeId(member.memberId);
          tasksMap.set(member.memberId, memberTaskList);
        } catch {
          // 개별 멤버의 태스크 조회 실패는 무시
          tasksMap.set(member.memberId, []);
        }
      }

      setMemberTasks(tasksMap);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('팀 정보를 불러오는데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchTeamMembers, fetchTasks, getTeamMembers, tasks.length, taskRepository]);

  useEffect(() => {
    loadTeamDetail();
  }, [loadTeamDetail]);

  // 팀 정보
  const team = useMemo((): TeamWithMembers | null => {
    if (!teamId) return null;

    const teamData = getTeamById(teamId);
    if (!teamData) return null;

    const teamMembers = getTeamMembers(teamId);
    const memberIds = teamMembers.map((tm) => tm.memberId);

    const activeTaskCount = tasks.filter(
      (t) => t.assignee?.id && memberIds.includes(t.assignee.id) && t.status !== 'DONE'
    ).length;

    // 멤버별 통계 계산
    const membersWithStats: TeamMemberWithStats[] = teamMembers.map((tm) => {
      const memberTaskList = memberTasks.get(tm.memberId) ||
        tasks.filter((t) => t.assignee?.id === tm.memberId);

      const taskStats: TaskStats = {
        todo: memberTaskList.filter((t) => t.status === 'TODO').length,
        inProgress: memberTaskList.filter((t) => t.status === 'IN_PROGRESS').length,
        review: memberTaskList.filter((t) => t.status === 'REVIEW').length,
        done: memberTaskList.filter((t) => t.status === 'DONE').length,
        total: memberTaskList.length,
      };

      return {
        ...tm,
        taskStats,
        tasks: memberTaskList,
        isOnline: Math.random() > 0.3, // Mock online status
      };
    });

    return {
      ...teamData,
      members: membersWithStats,
      memberCount: teamMembers.length,
      activeTaskCount,
    };
  }, [teamId, getTeamById, getTeamMembers, tasks, memberTasks]);

  // 멤버 목록
  const members = useMemo((): TeamMemberWithStats[] => {
    return team?.members || [];
  }, [team]);

  // 멤버 추가
  const addMember = useCallback(
    async (memberId: string, role: TeamMemberRole = 'MEMBER'): Promise<void> => {
      if (!teamId) throw new Error('팀이 선택되지 않았습니다.');
      await addMemberToTeam(teamId, memberId, role);
      await loadTeamDetail(); // 리로드
    },
    [teamId, addMemberToTeam, loadTeamDetail]
  );

  // 멤버 제거
  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!teamId) throw new Error('팀이 선택되지 않았습니다.');
      await removeMemberFromTeam(teamId, memberId);
    },
    [teamId, removeMemberFromTeam]
  );

  // 멤버 역할 변경
  const handleUpdateMemberRole = useCallback(
    async (memberId: string, role: TeamMemberRole): Promise<void> => {
      if (!teamId) throw new Error('팀이 선택되지 않았습니다.');
      await updateMemberRole(teamId, memberId, role);
    },
    [teamId, updateMemberRole]
  );

  // 특정 멤버의 태스크 조회
  const getMemberTasks = useCallback(
    (memberId: string): Task[] => {
      return memberTasks.get(memberId) || tasks.filter((t) => t.assignee?.id === memberId);
    },
    [memberTasks, tasks]
  );

  return {
    team,
    members,
    loading: loading || storeLoading,
    error,
    refetch: loadTeamDetail,
    addMember,
    removeMember,
    updateMemberRole: handleUpdateMemberRole,
    getMemberTasks,
  };
}
