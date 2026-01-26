import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { ContextMenuType, ContextMenuData } from '@/stores/uiStore';

interface UseContextMenuOptions {
  type: ContextMenuType;
  data?: ContextMenuData;
  disabled?: boolean;
}

export function useContextMenu({ type, data, disabled = false }: UseContextMenuOptions) {
  const openContextMenu = useUIStore((state) => state.openContextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // 화면 경계 체크를 위한 뷰포트 정보
      const menuWidth = 200; // 예상 메뉴 너비
      const menuHeight = 250; // 예상 메뉴 높이
      const padding = 10;

      let x = e.clientX;
      let y = e.clientY;

      // 오른쪽 경계 체크
      if (x + menuWidth + padding > window.innerWidth) {
        x = window.innerWidth - menuWidth - padding;
      }

      // 하단 경계 체크
      if (y + menuHeight + padding > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
      }

      // 상단/좌측 경계 체크
      x = Math.max(padding, x);
      y = Math.max(padding, y);

      openContextMenu(type, { x, y }, data);
    },
    [type, data, disabled, openContextMenu]
  );

  return {
    handleContextMenu,
    closeContextMenu,
  };
}

// 빈 공간용 전역 컨텍스트 메뉴 훅
export function useEmptyContextMenu(projectId?: string) {
  return useContextMenu({
    type: 'empty',
    data: projectId ? { projectId } : undefined,
  });
}
