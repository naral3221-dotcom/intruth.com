import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}: SettingsSectionProps) {
  return (
    <motion.div
      className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          {Icon && (
            <motion.div
              className="p-2 bg-neon-violet/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Icon className="w-5 h-5 text-neon-violet" />
            </motion.div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </motion.div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SettingsDividerProps {
  label?: string;
}

export function SettingsDivider({ label }: SettingsDividerProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-white/10" />
      {label && <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>}
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}
