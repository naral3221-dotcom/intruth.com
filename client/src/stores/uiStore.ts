import { create } from 'zustand';
import type { Task, Project, Team, RoutineTask, Meeting, Comment, MeetingComment, Member } from '@/types';

// Context Menu 타입 정의
export type ContextMenuType =
  | 'empty'
  | 'task'
  | 'project'
  | 'team'
  | 'routine'
  | 'meeting'
  | 'comment'
  | 'meetingComment'
  | 'member'
  | null;

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuData {
  task?: Task;
  project?: Project;
  team?: Team;
  routine?: RoutineTask;
  meeting?: Meeting;
  comment?: Comment;
  meetingComment?: MeetingComment;
  member?: { member: Member; context: 'team' | 'project'; teamId?: string; projectId?: string };
  projectId?: string;
}

export interface ContextMenuState {
  isOpen: boolean;
  type: ContextMenuType;
  position: ContextMenuPosition;
  data: ContextMenuData | null;
}

interface UIState {
  // Kanban Board - Selected Project
  selectedProjectId: string | null;
  showAllProjects: boolean;  // 전체 프로젝트 보기 옵션

  // Task Modal
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  taskModalProjectId: string | null;
  taskModalParentId: string | null;  // 하위 업무 생성 시 상위 업무 ID

  // Project Modal
  isProjectModalOpen: boolean;
  editingProject: Project | null;

  // Invite Member Modal
  isInviteMemberModalOpen: boolean;

  // Team Modal
  isTeamModalOpen: boolean;
  editingTeam: Team | null;

  // Team Member Modal (멤버 추가/관리)
  isTeamMemberModalOpen: boolean;
  teamMemberModalTeamId: string | null;

  // Project Progress Modal (프로젝트 진행상황 관리)
  isProjectProgressModalOpen: boolean;
  progressProject: Project | null;

  // Routine Modal (루틴 업무)
  isRoutineModalOpen: boolean;
  editingRoutine: RoutineTask | null;
  routineModalProjectId: string | null;

  // Meeting Modal (회의자료)
  isMeetingModalOpen: boolean;
  editingMeeting: Meeting | null;
  isMeetingDetailModalOpen: boolean;
  viewingMeeting: Meeting | null;

  // Confirm Modal
  isConfirmModalOpen: boolean;
  confirmModalConfig: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null;

  // Context Menu
  contextMenu: ContextMenuState;

  // Actions
  setSelectedProjectId: (projectId: string | null) => void;
  setShowAllProjects: (showAll: boolean) => void;

  openCreateTaskModal: (projectId?: string) => void;
  openCreateSubtaskModal: (parentTask: Task) => void;  // 하위 업무 생성
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;

  openCreateProjectModal: () => void;
  openEditProjectModal: (project: Project) => void;
  closeProjectModal: () => void;

  openInviteMemberModal: () => void;
  closeInviteMemberModal: () => void;

  openCreateTeamModal: () => void;
  openEditTeamModal: (team: Team) => void;
  closeTeamModal: () => void;

  openTeamMemberModal: (teamId: string) => void;
  closeTeamMemberModal: () => void;

  openProjectProgressModal: (project: Project) => void;
  closeProjectProgressModal: () => void;

  openCreateRoutineModal: (projectId?: string) => void;
  openEditRoutineModal: (routine: RoutineTask) => void;
  closeRoutineModal: () => void;

  openCreateMeetingModal: () => void;
  openEditMeetingModal: (meeting: Meeting) => void;
  closeMeetingModal: () => void;
  openMeetingDetailModal: (meeting: Meeting) => void;
  closeMeetingDetailModal: () => void;

  openConfirmModal: (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  closeConfirmModal: () => void;

  // Context Menu Actions
  openContextMenu: (type: ContextMenuType, position: ContextMenuPosition, data?: ContextMenuData) => void;
  closeContextMenu: () => void;

  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  selectedProjectId: null,
  showAllProjects: false,

  isTaskModalOpen: false,
  editingTask: null,
  taskModalProjectId: null,
  taskModalParentId: null,

  isProjectModalOpen: false,
  editingProject: null,

  isInviteMemberModalOpen: false,

  isTeamModalOpen: false,
  editingTeam: null,

  isTeamMemberModalOpen: false,
  teamMemberModalTeamId: null,

  isProjectProgressModalOpen: false,
  progressProject: null,

  isRoutineModalOpen: false,
  editingRoutine: null,
  routineModalProjectId: null,

  isMeetingModalOpen: false,
  editingMeeting: null,
  isMeetingDetailModalOpen: false,
  viewingMeeting: null,

  isConfirmModalOpen: false,
  confirmModalConfig: null,

  // Context Menu Initial State
  contextMenu: {
    isOpen: false,
    type: null,
    position: { x: 0, y: 0 },
    data: null,
  },

  // Project Selection Actions
  setSelectedProjectId: (projectId: string | null) =>
    set({ selectedProjectId: projectId }),

  setShowAllProjects: (showAll: boolean) =>
    set({ showAllProjects: showAll, selectedProjectId: showAll ? null : null }),

  // Task Modal Actions
  openCreateTaskModal: (projectId?: string) =>
    set({
      isTaskModalOpen: true,
      editingTask: null,
      taskModalProjectId: projectId || null,
      taskModalParentId: null,
    }),

  openCreateSubtaskModal: (parentTask: Task) =>
    set({
      isTaskModalOpen: true,
      editingTask: null,
      taskModalProjectId: parentTask.projectId,
      taskModalParentId: parentTask.id,
    }),

  openEditTaskModal: (task: Task) =>
    set({
      isTaskModalOpen: true,
      editingTask: task,
      taskModalProjectId: task.projectId,
      taskModalParentId: null,
    }),

  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      editingTask: null,
      taskModalProjectId: null,
      taskModalParentId: null,
    }),

  // Project Modal Actions
  openCreateProjectModal: () =>
    set({
      isProjectModalOpen: true,
      editingProject: null,
    }),

  openEditProjectModal: (project: Project) =>
    set({
      isProjectModalOpen: true,
      editingProject: project,
    }),

  closeProjectModal: () =>
    set({
      isProjectModalOpen: false,
      editingProject: null,
    }),

  // Invite Member Modal Actions
  openInviteMemberModal: () =>
    set({
      isInviteMemberModalOpen: true,
    }),

  closeInviteMemberModal: () =>
    set({
      isInviteMemberModalOpen: false,
    }),

  // Team Modal Actions
  openCreateTeamModal: () =>
    set({
      isTeamModalOpen: true,
      editingTeam: null,
    }),

  openEditTeamModal: (team: Team) =>
    set({
      isTeamModalOpen: true,
      editingTeam: team,
    }),

  closeTeamModal: () =>
    set({
      isTeamModalOpen: false,
      editingTeam: null,
    }),

  // Team Member Modal Actions
  openTeamMemberModal: (teamId: string) =>
    set({
      isTeamMemberModalOpen: true,
      teamMemberModalTeamId: teamId,
    }),

  closeTeamMemberModal: () =>
    set({
      isTeamMemberModalOpen: false,
      teamMemberModalTeamId: null,
    }),

  // Project Progress Modal Actions
  openProjectProgressModal: (project: Project) =>
    set({
      isProjectProgressModalOpen: true,
      progressProject: project,
    }),

  closeProjectProgressModal: () =>
    set({
      isProjectProgressModalOpen: false,
      progressProject: null,
    }),

  // Routine Modal Actions
  openCreateRoutineModal: (projectId?: string) =>
    set({
      isRoutineModalOpen: true,
      editingRoutine: null,
      routineModalProjectId: projectId || null,
    }),

  openEditRoutineModal: (routine: RoutineTask) =>
    set({
      isRoutineModalOpen: true,
      editingRoutine: routine,
      routineModalProjectId: routine.projectId || null,
    }),

  closeRoutineModal: () =>
    set({
      isRoutineModalOpen: false,
      editingRoutine: null,
      routineModalProjectId: null,
    }),

  // Meeting Modal Actions
  openCreateMeetingModal: () =>
    set({
      isMeetingModalOpen: true,
      editingMeeting: null,
    }),

  openEditMeetingModal: (meeting: Meeting) =>
    set({
      isMeetingModalOpen: true,
      editingMeeting: meeting,
    }),

  closeMeetingModal: () =>
    set({
      isMeetingModalOpen: false,
      editingMeeting: null,
    }),

  openMeetingDetailModal: (meeting: Meeting) =>
    set({
      isMeetingDetailModalOpen: true,
      viewingMeeting: meeting,
    }),

  closeMeetingDetailModal: () =>
    set({
      isMeetingDetailModalOpen: false,
      viewingMeeting: null,
    }),

  // Confirm Modal Actions
  openConfirmModal: (config) =>
    set({
      isConfirmModalOpen: true,
      confirmModalConfig: config,
    }),

  closeConfirmModal: () =>
    set({
      isConfirmModalOpen: false,
      confirmModalConfig: null,
    }),

  // Context Menu Actions
  openContextMenu: (type, position, data) =>
    set({
      contextMenu: {
        isOpen: true,
        type,
        position,
        data: data || null,
      },
    }),

  closeContextMenu: () =>
    set({
      contextMenu: {
        isOpen: false,
        type: null,
        position: { x: 0, y: 0 },
        data: null,
      },
    }),

  // Close All Modals
  closeAllModals: () =>
    set({
      isTaskModalOpen: false,
      editingTask: null,
      taskModalProjectId: null,
      taskModalParentId: null,
      isProjectModalOpen: false,
      editingProject: null,
      isInviteMemberModalOpen: false,
      isTeamModalOpen: false,
      editingTeam: null,
      isTeamMemberModalOpen: false,
      teamMemberModalTeamId: null,
      isProjectProgressModalOpen: false,
      progressProject: null,
      isRoutineModalOpen: false,
      editingRoutine: null,
      routineModalProjectId: null,
      isMeetingModalOpen: false,
      editingMeeting: null,
      isMeetingDetailModalOpen: false,
      viewingMeeting: null,
      isConfirmModalOpen: false,
      confirmModalConfig: null,
    }),
}));
