import { lazy, Suspense, type ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { ModalLoader } from '../ui/PageLoader';
import { ContextMenu } from '../context-menu';

// Lazy-loaded modal components
const SpatialTaskModal = lazy(() =>
  import('./SpatialTaskModal').then(m => ({ default: m.SpatialTaskModal }))
);
const SpatialProjectModal = lazy(() =>
  import('./SpatialProjectModal').then(m => ({ default: m.SpatialProjectModal }))
);
const ProjectProgressModal = lazy(() =>
  import('./ProjectProgressModal').then(m => ({ default: m.ProjectProgressModal }))
);
const InviteMemberModal = lazy(() =>
  import('./InviteMemberModal').then(m => ({ default: m.InviteMemberModal }))
);
const ConfirmModal = lazy(() =>
  import('./ConfirmModal').then(m => ({ default: m.ConfirmModal }))
);
const SpatialTeamModal = lazy(() =>
  import('./SpatialTeamModal').then(m => ({ default: m.SpatialTeamModal }))
);
const TeamMemberModal = lazy(() =>
  import('./TeamMemberModal').then(m => ({ default: m.TeamMemberModal }))
);
const RoutineModalWrapper = lazy(() =>
  import('./RoutineModalWrapper').then(m => ({ default: m.RoutineModalWrapper }))
);
const MeetingFormModal = lazy(() =>
  import('./meeting').then(m => ({ default: m.MeetingFormModal }))
);
const MeetingDetailModal = lazy(() =>
  import('./MeetingDetailModal').then(m => ({ default: m.MeetingDetailModal }))
);

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const {
    isTaskModalOpen,
    isProjectModalOpen,
    isProjectProgressModalOpen,
    isInviteMemberModalOpen,
    isConfirmModalOpen,
    isTeamModalOpen,
    isTeamMemberModalOpen,
    isRoutineModalOpen,
    isMeetingModalOpen,
    isMeetingDetailModalOpen,
  } = useUIStore();

  return (
    <>
      {children}

      {/* 조건부 렌더링: 모달이 열릴 때만 로드 */}
      {isTaskModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <SpatialTaskModal />
        </Suspense>
      )}

      {isProjectModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <SpatialProjectModal />
        </Suspense>
      )}

      {isProjectProgressModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <ProjectProgressModal />
        </Suspense>
      )}

      {isInviteMemberModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <InviteMemberModal />
        </Suspense>
      )}

      {isConfirmModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <ConfirmModal />
        </Suspense>
      )}

      {isTeamModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <SpatialTeamModal />
        </Suspense>
      )}

      {isTeamMemberModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <TeamMemberModal />
        </Suspense>
      )}

      {isRoutineModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <RoutineModalWrapper />
        </Suspense>
      )}

      {isMeetingModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <MeetingFormModal />
        </Suspense>
      )}

      {isMeetingDetailModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <MeetingDetailModal />
        </Suspense>
      )}

      {/* ContextMenu는 항상 렌더링 (가벼움) */}
      <ContextMenu />
    </>
  );
}
