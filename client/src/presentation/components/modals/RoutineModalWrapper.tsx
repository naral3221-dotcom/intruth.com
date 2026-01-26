import { useUIStore } from '@/stores/uiStore';
import { RoutineModal } from './RoutineModal';

export function RoutineModalWrapper() {
  const {
    isRoutineModalOpen,
    editingRoutine,
    routineModalProjectId,
    closeRoutineModal
  } = useUIStore();

  return (
    <RoutineModal
      isOpen={isRoutineModalOpen}
      onClose={closeRoutineModal}
      editingRoutine={editingRoutine}
      defaultProjectId={routineModalProjectId || undefined}
    />
  );
}
