import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeamStore } from '@/stores/teamStore';
import { useTaskStore } from '@/stores/taskStore';
import type { Team, CreateTeamInput } from '@/types';
import type { TeamWithMembers, TeamListStats, TaskStats, UseTeamsReturn } from '../types';

export function useTeams(): UseTeamsReturn {
  const { teams, teamMembers: teamMembersMap, fetchTeams, fetchTeamMembers, addTeam, updateTeam, deleteTeam, loading: storeLoading } = useTeamStore();
  const { tasks } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 팀 목록 조회
  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchTeams();

      // 각 팀의 멤버 정보도 로드 (store의 fetchTeamMembers 사용)
      const teamsData = useTeamStore.getState().teams;
      await Promise.all(teamsData.map((team) => fetchTeamMembers(team.id)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('팀 목록을 불러오는데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [fetchTeams, fetchTeamMembers]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 팀 목록에 멤버 수와 활성 태스크 수 추가
  const teamsWithMembers: TeamWithMembers[] = useMemo(() => {
    return teams.map((team) => {
      const teamMembersList = teamMembersMap.get(team.id) || [];
      const memberIds = teamMembersList.map((tm) => tm.memberId);

      // 팀원들의 활성 태스크 수 계산
      const activeTaskCount = tasks.filter(
        (t) => t.assignee?.id && memberIds.includes(t.assignee.id) && t.status !== 'DONE'
      ).length;

      // 멤버별 통계 계산
      const membersWithStats = teamMembersList.map((tm) => {
        const memberTasks = tasks.filter((t) => t.assignee?.id === tm.memberId);
        const taskStats: TaskStats = {
          todo: memberTasks.filter((t) => t.status === 'TODO').length,
          inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
          review: memberTasks.filter((t) => t.status === 'REVIEW').length,
          done: memberTasks.filter((t) => t.status === 'DONE').length,
          total: memberTasks.length,
        };

        return {
          ...tm,
          taskStats,
          tasks: memberTasks,
          isOnline: Math.random() > 0.3, // Mock online status
        };
      });

      return {
        ...team,
        members: membersWithStats,
        memberCount: teamMembersList.length,
        activeTaskCount,
      };
    });
  }, [teams, tasks, teamMembersMap]);

  // 전체 통계 계산
  const stats: TeamListStats = useMemo(() => {
    const allMemberIds = new Set<string>();
    let totalTasks = 0;
    let completedTasks = 0;

    teamsWithMembers.forEach((team) => {
      team.members.forEach((member) => {
        allMemberIds.add(member.memberId);
        totalTasks += member.taskStats.total;
        completedTasks += member.taskStats.done;
      });
    });

    const activeMembers = teamsWithMembers.reduce((count, team) => {
      return (
        count +
        team.members.filter(
          (m) => m.taskStats.todo > 0 || m.taskStats.inProgress > 0 || m.taskStats.review > 0
        ).length
      );
    }, 0);

    return {
      totalTeams: teams.length,
      totalMembers: allMemberIds.size,
      activeMembers,
      totalTasks,
      completedTasks,
    };
  }, [teams, teamsWithMembers]);

  // 팀 생성
  const createTeam = useCallback(
    async (data: CreateTeamInput): Promise<Team> => {
      return addTeam(data);
    },
    [addTeam]
  );

  // 팀 수정
  const handleUpdateTeam = useCallback(
    async (id: string, data: Partial<Team>): Promise<void> => {
      await updateTeam(id, data);
    },
    [updateTeam]
  );

  // 팀 삭제
  const handleDeleteTeam = useCallback(
    async (id: string): Promise<void> => {
      await deleteTeam(id);
    },
    [deleteTeam]
  );

  return {
    teams: teamsWithMembers,
    stats,
    loading: loading || storeLoading,
    error,
    refetch: loadTeams,
    createTeam,
    updateTeam: handleUpdateTeam,
    deleteTeam: handleDeleteTeam,
  };
}
