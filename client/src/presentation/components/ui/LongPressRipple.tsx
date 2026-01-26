import { motion, AnimatePresence } from 'framer-motion';

interface TouchPosition {
  x: number;
  y: number;
}

interface LongPressRippleProps {
  isActive: boolean;
  position: TouchPosition | null;
  duration?: number; // ms
  color?: string;
}

export function LongPressRipple({
  isActive,
  position,
  duration = 500,
  color = 'rgb(139, 92, 246)', // neon-violet
}: LongPressRippleProps) {
  if (!position) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-inherit"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {/* Ripple 원형 파동 효과 */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: position.x,
              top: position.y,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
              backgroundColor: color,
            }}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{
              duration: duration / 1000,
              ease: 'easeOut',
            }}
          />

          {/* 배경 하이라이트 효과 */}
          <motion.div
            className="absolute inset-0 rounded-inherit"
            style={{ backgroundColor: color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
