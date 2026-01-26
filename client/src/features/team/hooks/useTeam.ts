import { useState, useEffect, useCallback } from 'react';
import { useMemberRepository, useTaskRepository } from '@/di';
import type { Task } from '@/types';
import type { MemberWithStats, TeamData, UseTeamReturn } from '../types';

export function useTeam(): UseTeamReturn {
  const memberRepository = useMemberRepository();
  const taskRepository = useTaskRepository();

  const [data, setData] = useState<TeamData>({
    members: [],
    totalMembers: 0,
    activeMembers: 0,
    roleDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch members and all tasks in parallel
      const [members, allTasks] = await Promise.all([
        memberRepository.findAll(),
        taskRepository.findAll(),
      ]);

      // Calculate task stats for each member
      const membersWithStats: MemberWithStats[] = members.map((member) => {
        const memberTasks = allTasks.filter((task) => task.assignee?.id === member.id);
        const taskStats = {
          todo: memberTasks.filter((t) => t.status === 'TODO').length,
          inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
          review: memberTasks.filter((t) => t.status === 'REVIEW').length,
          done: memberTasks.filter((t) => t.status === 'DONE').length,
          total: memberTasks.length,
        };

        return {
          ...member,
          taskStats,
          // Mock online status - in real app, this would come from WebSocket/presence
          isOnline: Math.random() > 0.3,
        };
      });

      // Calculate role distribution
      const roleMap = new Map<string, number>();
      members.forEach((member) => {
        const roleName = member.role?.name || member.position || '팀원';
        roleMap.set(roleName, (roleMap.get(roleName) || 0) + 1);
      });
      const roleDistribution = Array.from(roleMap.entries()).map(([role, count]) => ({
        role,
        count,
      }));

      // Count active members (those with incomplete tasks)
      const activeMembers = membersWithStats.filter(
        (m) => m.taskStats.todo > 0 || m.taskStats.inProgress > 0 || m.taskStats.review > 0
      ).length;

      setData({
        members: membersWithStats,
        totalMembers: members.length,
        activeMembers,
        roleDistribution,
      });
    } catch (err) {
      console.error('Team fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch team data'));
    } finally {
      setLoading(false);
    }
  }, [memberRepository, taskRepository]);

  const getMemberTasks = useCallback(async (memberId: string): Promise<Task[]> => {
    try {
      return await taskRepository.findByAssigneeId(memberId);
    } catch (err) {
      console.error('Failed to fetch member tasks:', err);
      return [];
    }
  }, [taskRepository]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return {
    data,
    loading,
    error,
    refetch: fetchTeam,
    getMemberTasks,
  };
}
