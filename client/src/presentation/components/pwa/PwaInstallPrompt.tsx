import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInstallPrompt } from '@/shared/pwa/useInstallPrompt';

export function PwaInstallPrompt() {
  const { canInstall, promptInstall, dismissInstallPrompt } = useInstallPrompt();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          className="fixed left-3 right-3 z-40 lg:hidden"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">INTRUTH 추가</p>
              <p className="text-xs text-muted-foreground">홈 화면에서 바로 열기</p>
            </div>
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              추가
            </button>
            <button
              type="button"
              onClick={dismissInstallPrompt}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="설치 안내 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
