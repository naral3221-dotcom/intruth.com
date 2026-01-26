import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type ToastType } from '@/stores/toastStore';
import { cn } from '@/core/utils/cn';

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    text: 'text-emerald-300',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-300',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    text: 'text-amber-300',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-300',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          const style = styles[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'pointer-events-auto rounded-xl border backdrop-blur-xl shadow-lg shadow-black/20',
                'px-4 py-3 flex items-start gap-3',
                style.bg,
                style.border
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', style.icon)} />

              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-sm', style.text)}>{toast.title}</p>
                {toast.message && (
                  <p className="text-gray-400 text-sm mt-0.5">{toast.message}</p>
                )}
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className={cn(
                      'mt-2 text-sm font-medium underline-offset-2 hover:underline',
                      style.text
                    )}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
