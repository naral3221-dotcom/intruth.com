import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // 기본 5초
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 자동 제거
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// 편의 함수들
export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'success', title, message, duration }),

  error: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'error', title, message, duration: duration ?? 7000 }),

  warning: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'warning', title, message, duration }),

  info: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'info', title, message, duration }),

  // 에러 객체를 받아서 처리하는 헬퍼
  fromError: (error: unknown, defaultMessage = '오류가 발생했습니다.') => {
    const message = error instanceof Error ? error.message : defaultMessage;
    return useToastStore.getState().addToast({
      type: 'error',
      title: '오류',
      message,
      duration: 7000,
    });
  },

  // 커스텀 액션이 있는 토스트
  withAction: (
    type: ToastType,
    title: string,
    message: string,
    action: { label: string; onClick: () => void },
    duration?: number
  ) =>
    useToastStore.getState().addToast({ type, title, message, action, duration }),
};
