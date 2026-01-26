import { useCallback, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { ContextMenuType, ContextMenuData } from '@/stores/uiStore';

interface UseLongPressOptions {
  type: ContextMenuType;
  data?: ContextMenuData;
  disabled?: boolean;
  delay?: number; // 기본 500ms
}

interface TouchPosition {
  x: number;
  y: number;
}

interface LongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  isLongPressing: boolean;
  ripplePosition: TouchPosition | null;
}

export function useLongPress({
  type,
  data,
  disabled = false,
  delay = 500,
}: UseLongPressOptions): LongPressResult {
  const openContextMenu = useUIStore((state) => state.openContextMenu);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [ripplePosition, setRipplePosition] = useState<TouchPosition | null>(null);
  const touchStartPos = useRef<TouchPosition>({ x: 0, y: 0 });
  const elementRef = useRef<DOMRect | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPressing(false);
    // Ripple 효과는 애니메이션 후 제거되도록 약간의 딜레이
    setTimeout(() => setRipplePosition(null), 300);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      elementRef.current = rect;

      // Ripple 위치 계산 (요소 내 상대 좌표)
      setRipplePosition({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
      setIsLongPressing(true);

      timerRef.current = setTimeout(() => {
        // 진동 피드백 (지원되는 기기)
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        // 화면 경계 체크
        const menuWidth = 200;
        const menuHeight = 250;
        const padding = 10;

        let x = touch.clientX;
        let y = touch.clientY;

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
        clearTimer();
      }, delay);
    },
    [type, data, disabled, delay, openContextMenu, clearTimer]
  );

  const handleTouchEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // 이동 거리가 10px 이상이면 long press 취소 (스크롤로 간주)
      const touch = e.touches[0];
      const moveX = Math.abs(touch.clientX - touchStartPos.current.x);
      const moveY = Math.abs(touch.clientY - touchStartPos.current.y);

      if (moveX > 10 || moveY > 10) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    isLongPressing,
    ripplePosition,
  };
}
