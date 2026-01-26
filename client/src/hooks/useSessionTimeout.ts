import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook that manages session timeout based on user activity.
 * Automatically logs out the user after the configured timeout period of inactivity.
 */
export function useSessionTimeout() {
  const { security } = useSettingsStore();
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearTimeouts();
    logout();
    // Show notification that session expired
    if (typeof window !== 'undefined') {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }, [clearTimeouts, logout]);

  const resetTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    clearTimeouts();

    const timeoutMinutes = security.sessionTimeout;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    // Set warning 1 minute before timeout (if timeout > 1 minute)
    if (timeoutMinutes > 1) {
      const warningMs = (timeoutMinutes - 1) * 60 * 1000;
      warningTimeoutRef.current = setTimeout(() => {
        // Could show a warning toast here
        console.log('Session will expire in 1 minute');
      }, warningMs);
    }

    // Set actual timeout
    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [isAuthenticated, security.sessionTimeout, clearTimeouts, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle the reset to avoid excessive timer resets
    let lastActivity = Date.now();
    const throttleMs = 1000; // Only reset once per second max

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity >= throttleMs) {
        lastActivity = now;
        resetTimeout();
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeouts();
    };
  }, [isAuthenticated, resetTimeout, clearTimeouts]);

  return {
    resetTimeout,
  };
}
