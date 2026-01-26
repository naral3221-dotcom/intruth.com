import { useMemo } from 'react';
import {
  Edit3,
  Trash2,
  FolderPlus,
  Plus,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  ClipboardList,
  UserMinus,
  Mail,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useTaskStore } from '@/stores/taskStore';
import { useProjectStore } from '@/stores/projectStore';
import { useTeamStore } from '@/stores/teamStore';
import { useRoutineStore } from '@/stores/routineStore';
import { useMeetingStore } from '@/stores/meetingStore';
import type { ContextMenuItemProps } from './ContextMenuItem';

type MenuItemConfig = Omit<ContextMenuItemProps, 'onClick'> & {
  action: () => void;
};

export function useMenuItems() {
  const {
    contextMenu,
    closeContextMenu,
    openCreateTaskModal,
    openEditTaskModal,
    openCreateProjectModal,
    openEditProjectModal,
    openProjectProgressModal,
    openEditTeamModal,
    openTeamMemberModal,
    openEditRoutineModal,
    openEditMeetingModal,
    openMeetingDetailModal,
    openConfirmModal,
  } = useUIStore();

  const deleteTask = useTaskStore((state) => state.deleteTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const deleteTeam = useTeamStore((state) => state.deleteTeam);
  const { toggleComplete: toggleRoutineComplete, deleteRoutine } = useRoutineStore();
  const { deleteMeeting, deleteComment: deleteMeetingComment } = useMeetingStore();

  const menuItems = useMemo((): MenuItemConfig[] => {
    const { type, data } = contextMenu;

    const withClose = (action: () => void) => () => {
      closeContextMenu();
      action();
    };

    // 빈 공간 우클릭
    if (type === 'empty') {
      const items: MenuItemConfig[] = [
        {
          label: '새 업무',
          icon: Plus,
          action: withClose(() => openCreateTaskModal()),
        },
        {
          label: '새 프로젝트',
          icon: FolderPlus,
          action: withClose(() => openCreateProjectModal()),
        },
      ];
      return items;
    }

    // Task 우클릭
    if (type === 'task' && data?.task) {
      const task = data.task;
      const isDone = task.status === 'DONE';
      return [
        {
          label: isDone ? '완료 취소' : '완료 처리',
          icon: isDone ? XCircle : CheckCircle,
          action: withClose(() => updateTaskStatus(task.id, isDone ? 'TODO' : 'DONE')),
        },
        {
          label: '업무 상세보기/수정',
          icon: Edit3,
          action: withClose(() => openEditTaskModal(task)),
        },
        {
          label: '업무 삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '업무 삭제',
              message: `"${task.title}" 업무를 삭제하시겠습니까? 하위 업무도 함께 삭제됩니다.`,
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteTask(task.id),
            });
          }),
        },
      ];
    }

    // Project 우클릭
    if (type === 'project' && data?.project) {
      const project = data.project;
      return [
        {
          label: '업무 추가',
          icon: Plus,
          action: withClose(() => openCreateTaskModal(project.id)),
        },
        {
          label: '진행상황 보기',
          icon: Eye,
          action: withClose(() => openProjectProgressModal(project)),
        },
        {
          label: '프로젝트 수정',
          icon: Edit3,
          action: withClose(() => openEditProjectModal(project)),
        },
        {
          label: '프로젝트 삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '프로젝트 삭제',
              message: `"${project.name}" 프로젝트를 삭제하시겠습니까? 관련된 모든 업무도 함께 삭제됩니다.`,
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteProject(project.id),
            });
          }),
        },
      ];
    }

    // Team 우클릭
    if (type === 'team' && data?.team) {
      const team = data.team;
      return [
        {
          label: '팀 수정',
          icon: Edit3,
          action: withClose(() => openEditTeamModal(team)),
        },
        {
          label: '멤버 관리',
          icon: Users,
          action: withClose(() => openTeamMemberModal(team.id)),
        },
        {
          label: '팀 삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '팀 삭제',
              message: `"${team.name}" 팀을 삭제하시겠습니까?`,
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteTeam(team.id),
            });
          }),
        },
      ];
    }

    // Routine 우클릭
    if (type === 'routine' && data?.routine) {
      const routine = data.routine;
      return [
        {
          label: routine.isCompletedToday ? '완료 취소' : '완료 처리',
          icon: routine.isCompletedToday ? XCircle : CheckCircle,
          action: withClose(() => toggleRoutineComplete(routine.id)),
        },
        {
          label: '루틴 수정',
          icon: Edit3,
          action: withClose(() => openEditRoutineModal(routine)),
        },
        {
          label: '루틴 삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '루틴 삭제',
              message: `"${routine.title}" 루틴을 삭제하시겠습니까?`,
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteRoutine(routine.id),
            });
          }),
        },
      ];
    }

    // Meeting 우클릭
    if (type === 'meeting' && data?.meeting) {
      const meeting = data.meeting;
      return [
        {
          label: '상세보기',
          icon: Eye,
          action: withClose(() => openMeetingDetailModal(meeting)),
        },
        {
          label: '수정',
          icon: Edit3,
          action: withClose(() => openEditMeetingModal(meeting)),
        },
        {
          label: '삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '회의자료 삭제',
              message: `"${meeting.title}" 회의자료를 삭제하시겠습니까?`,
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteMeeting(meeting.id),
            });
          }),
        },
      ];
    }

    // Meeting Comment 우클릭
    if (type === 'meetingComment' && data?.meetingComment) {
      const comment = data.meetingComment;
      return [
        {
          label: '댓글 삭제',
          icon: Trash2,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '댓글 삭제',
              message: '이 댓글을 삭제하시겠습니까?',
              confirmText: '삭제',
              variant: 'danger',
              onConfirm: () => deleteMeetingComment(comment.meetingId, comment.id),
            });
          }),
        },
      ];
    }

    // Member 우클릭 (팀/프로젝트 멤버)
    if (type === 'member' && data?.member) {
      const { member, context, teamId } = data.member;
      const items: MenuItemConfig[] = [
        {
          label: '업무 보기',
          icon: ClipboardList,
          action: withClose(() => {
            // 멤버의 업무 페이지로 이동하거나 필터링
            window.location.href = `/my-tasks?assignee=${member.id}`;
          }),
        },
      ];

      if (member.email) {
        items.push({
          label: '이메일 보내기',
          icon: Mail,
          action: withClose(() => {
            window.location.href = `mailto:${member.email}`;
          }),
        });
      }

      if (context === 'team' && teamId) {
        items.push({
          label: '팀에서 제거',
          icon: UserMinus,
          variant: 'danger',
          action: withClose(() => {
            openConfirmModal({
              title: '멤버 제거',
              message: `${member.name}님을 팀에서 제거하시겠습니까?`,
              confirmText: '제거',
              variant: 'warning',
              onConfirm: () => {
                // 팀 멤버 제거 로직 (추후 구현)
                console.log('Remove member from team:', member.id, teamId);
              },
            });
          }),
        });
      }

      return items;
    }

    return [];
  }, [
    contextMenu,
    closeContextMenu,
    openCreateTaskModal,
    openEditTaskModal,
    openCreateProjectModal,
    openEditProjectModal,
    openProjectProgressModal,
    openEditTeamModal,
    openTeamMemberModal,
    openEditRoutineModal,
    openEditMeetingModal,
    openMeetingDetailModal,
    openConfirmModal,
    deleteTask,
    updateTaskStatus,
    deleteProject,
    deleteTeam,
    toggleRoutineComplete,
    deleteRoutine,
    deleteMeeting,
    deleteMeetingComment,
  ]);

  return menuItems;
}
