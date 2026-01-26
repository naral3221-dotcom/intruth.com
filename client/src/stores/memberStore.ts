import { create } from 'zustand';
import type { Member, Task } from '@/types';
import {
  inviteMemberUseCase,
  updateMemberUseCase,
  MemberValidationError,
} from '@/di/storeUseCases';
import { memberRepository } from '@/di/storeRepositories';
import { useTaskStore } from '@/stores/taskStore';
import { useTeamStore } from '@/stores/teamStore';

export interface MemberWithStats extends Member {
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    total: number;
  };
}

interface MemberState {
  members: Member[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMembers: () => Promise<void>;
  inviteMember: (email: string, role?: string) => Promise<Member>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;

  // Selectors
  getMemberById: (id: string) => Member | undefined;
  getMembersWithTaskStats: (tasks: Task[]) => MemberWithStats[];
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  fetchMembers: async () => {
    set({ loading: true, error: null });
    try {
      // wf_users 테이블에서 사용자 목록 조회 (members Repository)
      const members = await memberRepository.findAll();
      set({ members, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  inviteMember: async (email: string, role?: string) => {
    set({ loading: true, error: null });
    try {
      // Use Case를 통해 유효성 검증 후 초대
      const newMember = await inviteMemberUseCase.execute({ email, name: email, roleId: role });
      set((state) => ({
        members: [...state.members, newMember],
        loading: false,
      }));
      return newMember;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      // ValidationError 발생 시 더 명확한 에러 메시지 제공
      if (error instanceof MemberValidationError) {
        console.warn('[MemberStore] Validation error:', message);
      }
      throw error;
    }
  },

  updateMember: async (id: string, data: Partial<Member>) => {
    const previousMembers = get().members;

    // Optimistic update
    set((state) => ({
      members: state.members.map((member) =>
        member.id === id ? { ...member, ...data } : member
      ),
    }));

    try {
      // Use Case를 통해 유효성 검증 후 업데이트
      await updateMemberUseCase.execute({ memberId: id, data });
    } catch (error) {
      // Rollback on error
      const message = (error as Error).message;
      set({ members: previousMembers, error: message });
      if (error instanceof MemberValidationError) {
        console.warn('[MemberStore] Validation error:', message);
      }
      throw error;
    }
  },

  removeMember: async (id: string) => {
    const previousMembers = get().members;

    // Optimistic update
    set((state) => ({
      members: state.members.filter((member) => member.id !== id),
    }));

    try {
      await memberRepository.remove(id);

      // Cross-store sync: 멤버 삭제 후 연관 데이터 정리
      // 1. taskStore에서 해당 멤버가 assignee인 태스크들의 assignee를 null로 변경
      const taskState = useTaskStore.getState();
      const updatedTasks = taskState.tasks.map(task => {
        if (task.assignee?.id === id) {
          return { ...task, assignee: undefined, assigneeId: undefined };
        }
        // assignees 배열에서도 제거
        if (task.assignees?.some(a => a.id === id)) {
          return {
            ...task,
            assignees: task.assignees.filter(a => a.id !== id),
          };
        }
        return task;
      });
      useTaskStore.setState({ tasks: updatedTasks });

      // 2. teamStore에서 모든 팀의 멤버 목록에서 해당 멤버 제거
      const teamState = useTeamStore.getState();
      const newTeamMembers = new Map(teamState.teamMembers);
      newTeamMembers.forEach((members, teamId) => {
        const filteredMembers = members.filter(m => m.memberId !== id);
        if (filteredMembers.length !== members.length) {
          newTeamMembers.set(teamId, filteredMembers);
        }
      });
      useTeamStore.setState({ teamMembers: newTeamMembers });

    } catch (error) {
      // Rollback on error
      set({ members: previousMembers, error: (error as Error).message });
      throw error;
    }
  },

  getMemberById: (id: string) => {
    return get().members.find((member) => member.id === id);
  },

  getMembersWithTaskStats: (tasks: Task[]) => {
    const members = get().members;
    return members.map((member) => {
      const memberTasks = tasks.filter((task) => task.assignee?.id === member.id);
      return {
        ...member,
        taskStats: {
          todo: memberTasks.filter((t) => t.status === 'TODO').length,
          inProgress: memberTasks.filter((t) => t.status === 'IN_PROGRESS').length,
          review: memberTasks.filter((t) => t.status === 'REVIEW').length,
          done: memberTasks.filter((t) => t.status === 'DONE').length,
          total: memberTasks.length,
        },
      };
    });
  },
}));
