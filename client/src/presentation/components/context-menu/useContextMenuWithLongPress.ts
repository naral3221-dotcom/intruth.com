import { useCallback } from 'react';
import { useLongPress } from './useLongPress';
import { useUIStore } from '@/stores/uiStore';
import type { ContextMenuType, ContextMenuData } from '@/stores/uiStore';

interface UseContextMenuWithLongPressOptions {
  type: ContextMenuType;
  data?: ContextMenuData;
  disabled?: boolean;
  longPressDelay?: number;
}

interface TouchPosition {
  x: number;
  y: number;
}

interface ContextMenuWithLongPressResult {
  contextMenuProps: {
    onContextMenu: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchMove: (e: React.TouchEvent) => void;
  };
  isLongPressing: boolean;
  ripplePosition: TouchPosition | null;
}

export function useContextMenuWithLongPress({
  type,
  data,
  disabled = false,
  longPressDelay = 500,
}: UseContextMenuWithLongPressOptions): ContextMenuWithLongPressResult {
  const openContextMenu = useUIStore((state) => state.openContextMenu);

  // Long press 핸들러 (모바일)
  const {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    isLongPressing,
    ripplePosition,
  } = useLongPress({
    type,
    data,
    disabled,
    delay: longPressDelay,
  });

  // Context menu 핸들러 (데스크톱 우클릭)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // 화면 경계 체크
      const menuWidth = 200;
      const menuHeight = 250;
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
    contextMenuProps: {
      onContextMenu: handleContextMenu,
      onTouchStart,
      onTouchEnd,
      onTouchMove,
    },
    isLongPressing,
    ripplePosition,
  };
}
