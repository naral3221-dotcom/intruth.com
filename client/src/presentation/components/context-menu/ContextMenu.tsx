import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { ContextMenuItem } from './ContextMenuItem';
import { ContextMenuDivider } from './ContextMenuDivider';
import { useMenuItems } from './useMenuItems';

export function ContextMenu() {
  const { contextMenu, closeContextMenu } = useUIStore();
  const { isOpen, position } = contextMenu;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItems = useMenuItems();

  // 외부 클릭 감지
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    },
    [closeContextMenu]
  );

  // ESC 키 감지
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    },
    [closeContextMenu]
  );

  // 스크롤 감지
  const handleScroll = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  // 이벤트 리스너 등록
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, handleClickOutside, handleKeyDown, handleScroll]);

  // 메뉴 위치 조정 (화면 경계 체크)
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const padding = 10;

      let newX = position.x;
      let newY = position.y;

      // 오른쪽 경계
      if (rect.right > window.innerWidth - padding) {
        newX = position.x - rect.width;
      }

      // 하단 경계
      if (rect.bottom > window.innerHeight - padding) {
        newY = position.y - rect.height;
      }

      // 적용
      menu.style.left = `${Math.max(padding, newX)}px`;
      menu.style.top = `${Math.max(padding, newY)}px`;
    }
  }, [isOpen, position]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && menuItems.length > 0 && (
        <motion.div
          ref={menuRef}
          className="fixed z-[100] min-w-[200px] py-2 px-1.5 rounded-xl
                     bg-popover/98 backdrop-blur-xl
                     border border-border shadow-2xl shadow-black/20 dark:shadow-black/50"
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* 배경 그라데이션 효과 */}
          <div className="absolute inset-0 rounded-xl bg-linear-to-b from-foreground/5 to-transparent pointer-events-none" />

          {/* 메뉴 아이템 */}
          <div className="relative">
            {menuItems.map((item, index) => {
              // danger 아이템 전에 구분선 추가
              const prevItem = menuItems[index - 1];
              const showDivider = item.variant === 'danger' && prevItem?.variant !== 'danger';

              return (
                <div key={`${item.label}-${index}`}>
                  {showDivider && <ContextMenuDivider />}
                  <ContextMenuItem
                    label={item.label}
                    icon={item.icon}
                    onClick={item.action}
                    variant={item.variant}
                    disabled={item.disabled}
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
