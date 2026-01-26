import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useUIStore } from '@/stores/uiStore';

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/20',
    buttonBg: 'bg-red-500 hover:bg-red-600',
  },
  warning: {
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    buttonBg: 'bg-amber-500 hover:bg-amber-600',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    buttonBg: 'bg-blue-500 hover:bg-blue-600',
  },
};

export function ConfirmModal() {
  const { isConfirmModalOpen, confirmModalConfig, closeConfirmModal } = useUIStore();

  if (!confirmModalConfig) return null;

  const {
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'danger',
    onConfirm,
  } = confirmModalConfig;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    closeConfirmModal();
  };

  return (
    <AnimatePresence>
      {isConfirmModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={closeConfirmModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button
                  onClick={closeConfirmModal}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn('p-3 rounded-full', config.iconBg)}>
                    <Icon className={cn('w-6 h-6', config.iconColor)} />
                  </div>
                  <p className="text-muted-foreground pt-2">{message}</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeConfirmModal}
                    className="aboard-btn-secondary flex-1"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all',
                      config.buttonBg
                    )}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
