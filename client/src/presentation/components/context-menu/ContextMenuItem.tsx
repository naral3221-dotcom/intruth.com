import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/core/utils/cn';

export interface ContextMenuItemProps {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function ContextMenuItem({
  label,
  icon: Icon,
  onClick,
  variant = 'default',
  disabled = false,
}: ContextMenuItemProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        variant === 'default' && [
          'text-popover-foreground hover:bg-accent hover:text-accent-foreground',
          disabled && 'text-muted-foreground cursor-not-allowed hover:bg-transparent hover:text-muted-foreground',
        ],
        variant === 'danger' && [
          'text-destructive hover:bg-destructive/15 hover:text-destructive',
          disabled && 'text-destructive/50 cursor-not-allowed hover:bg-transparent hover:text-destructive/50',
        ]
      )}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {Icon && (
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0',
            variant === 'danger' ? 'text-destructive' : 'text-muted-foreground'
          )}
        />
      )}
      <span className="flex-1 text-left">{label}</span>
    </motion.button>
  );
}
