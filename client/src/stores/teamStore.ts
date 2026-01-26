import { create } from 'zustand';
import type { Team, TeamMember, TeamMemberRole, CreateTeamInput } from '@/types';
import {
  createTeamUseCase,
  updateTeamUseCase,
  deleteTeamUseCase,
  addTeamMemberUseCase,
  removeTeamMemberUseCase,
  TeamValidationError,
} from '@/di/storeUseCases';
import { teamRepository } from '@/di/storeRepositories';
import { useProjectStore } from '@/stores/projectStore';

interface TeamState {
  // State
  teams: Team[];
  teamMembers: Map<string, TeamMember[]>; // teamId -> members
  currentTeam: Team | null;
  loading: boolean;
  error: string | null;

  // Team CRUD Actions
  fetchTeams: () => Promise<void>;
  addTeam: (data: CreateTeamInput) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;

  // Team Member Actions
  fetchTeamMembers: (teamId: string) => Promise<void>;
  addMemberToTeam: (teamId: string, memberId: string, role?: TeamMemberRole) => Promise<void>;
  removeMemberFromTeam: (teamId: string, memberId: string) => Promise<void>;
  updateMemberRole: (teamId: string, memberId: string, role: TeamMemberRole) => Promise<void>;

  // Selectors
  getTeamById: (id: string) => Team | undefined;
  getTeamMembers: (teamId: string) => TeamMember[];
  getMemberTeams: (memberId: string) => Team[];
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  teamMembers: new Map(),
  currentTeam: null,
  loading: false,
  error: null,

  // Team CRUD
  fetchTeams: async () => {
    set({ loading: true, error: null });
    try {
      const teams = await teamRepository.findAll();
      set({ teams, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addTeam: async (data: CreateTeamInput) => {
    set({ loading: true, error: null });
    try {
      // Use Case를 통해 유효성 검증 후 생성
      const newTeam = await createTeamUseCase.execute(data);
      set((state) => ({
        teams: [...state.teams, newTeam],
        loading: false,
      }));
      return newTeam;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      if (error instanceof TeamValidationError) {
        console.warn('[TeamStore] Validation error:', message);
      }
      throw error;
    }
  },

  updateTeam: async (id: string, data: Partial<Team>) => {
    const previousTeams = get().teams;

    // Optimistic update
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === id ? { ...team, ...data, updatedAt: new Date().toISOString() } : team
      ),
    }));

    try {
      // Use Case를 통해 유효성 검증 후 업데이트
      await updateTeamUseCase.execute({ id, data });
    } catch (error) {
      // Rollback
      const message = (error as Error).message;
      set({ teams: previousTeams, error: message });
      if (error instanceof TeamValidationError) {
        console.warn('[TeamStore] Validation error:', message);
      }
      throw error;
    }
  },

  deleteTeam: async (id: string) => {
    const previousTeams = get().teams;
    const previousTeamMembers = new Map(get().teamMembers);

    // Optimistic update
    set((state) => {
      const newTeamMembers = new Map(state.teamMembers);
      newTeamMembers.delete(id);
      return {
        teams: state.teams.filter((team) => team.id !== id),
        teamMembers: newTeamMembers,
        currentTeam: state.currentTeam?.id === id ? null : state.currentTeam,
      };
    });

    try {
      // Use Case를 통해 삭제
      await deleteTeamUseCase.execute(id);

      // Cross-store sync: 프로젝트의 teamAssignments에서 해당 팀 제거
      const projectState = useProjectStore.getState();
      const updatedProjects = projectState.projects.map(project => {
        if (project.teamAssignments?.some(ta => ta.teamId === id)) {
          return {
            ...project,
            teamAssignments: project.teamAssignments.filter(ta => ta.teamId !== id),
          };
        }
        return project;
      });
      useProjectStore.setState({ projects: updatedProjects });

    } catch (error) {
      // Rollback
      set({ teams: previousTeams, teamMembers: previousTeamMembers, error: (error as Error).message });
      throw error;
    }
  },

  setCurrentTeam: (team: Team | null) => {
    set({ currentTeam: team });
  },

  // Team Member Actions
  fetchTeamMembers: async (teamId: string) => {
    set({ loading: true, error: null });
    try {
      const members = await teamRepository.getMembers(teamId);
      set((state) => {
        const newTeamMembers = new Map(state.teamMembers);
        newTeamMembers.set(teamId, members);
        return { teamMembers: newTeamMembers, loading: false };
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addMemberToTeam: async (teamId: string, memberId: string, role: TeamMemberRole = 'MEMBER') => {
    set({ loading: true, error: null });
    try {
      // Use Case를 통해 유효성 검증 후 멤버 추가
      const newMember = await addTeamMemberUseCase.execute({ teamId, memberId, role });
      set((state) => {
        const newTeamMembers = new Map(state.teamMembers);
        const currentMembers = newTeamMembers.get(teamId) || [];
        newTeamMembers.set(teamId, [...currentMembers, newMember]);
        return { teamMembers: newTeamMembers, loading: false };
      });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      if (error instanceof TeamValidationError) {
        console.warn('[TeamStore] Validation error:', message);
      }
      throw error;
    }
  },

  removeMemberFromTeam: async (teamId: string, memberId: string) => {
    const previousTeamMembers = new Map(get().teamMembers);

    // Optimistic update
    set((state) => {
      const newTeamMembers = new Map(state.teamMembers);
      const currentMembers = newTeamMembers.get(teamId) || [];
      newTeamMembers.set(
        teamId,
        currentMembers.filter((m) => m.memberId !== memberId)
      );
      return { teamMembers: newTeamMembers };
    });

    try {
      // Use Case를 통해 멤버 제거
      await removeTeamMemberUseCase.execute({ teamId, memberId });
    } catch (error) {
      // Rollback
      set({ teamMembers: previousTeamMembers, error: (error as Error).message });
      throw error;
    }
  },

  updateMemberRole: async (teamId: string, memberId: string, role: TeamMemberRole) => {
    const previousTeamMembers = new Map(get().teamMembers);

    // Optimistic update
    set((state) => {
      const newTeamMembers = new Map(state.teamMembers);
      const currentMembers = newTeamMembers.get(teamId) || [];
      newTeamMembers.set(
        teamId,
        currentMembers.map((m) => (m.memberId === memberId ? { ...m, role } : m))
      );
      return { teamMembers: newTeamMembers };
    });

    try {
      await teamRepository.updateMemberRole(teamId, memberId, role);
    } catch (error) {
      // Rollback
      set({ teamMembers: previousTeamMembers, error: (error as Error).message });
      throw error;
    }
  },

  // Selectors
  getTeamById: (id: string) => {
    return get().teams.find((team) => team.id === id);
  },

  getTeamMembers: (teamId: string) => {
    return get().teamMembers.get(teamId) || [];
  },

  getMemberTeams: (memberId: string) => {
    const { teams, teamMembers } = get();
    const memberTeamIds: string[] = [];

    teamMembers.forEach((members, teamId) => {
      if (members.some((m) => m.memberId === memberId)) {
        memberTeamIds.push(teamId);
      }
    });

    return teams.filter((team) => memberTeamIds.includes(team.id));
  },
}));
