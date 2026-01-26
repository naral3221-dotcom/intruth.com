import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';
import { createTokenManager } from '@/data/sources/api/HttpClient';

// 싱글톤 토큰 매니저 인스턴스 생성
const tokenManager = createTokenManager();

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (token: string, user: AuthUser, mustChangePassword?: boolean) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setMustChangePassword: (value: boolean) => void;
  isAdmin: () => boolean;
  handleAuthExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,

      login: (token, user, mustChangePassword = false) => {
        tokenManager.setToken(token);
        set({
          token,
          user,
          isAuthenticated: true,
          mustChangePassword,
        });
      },

      logout: () => {
        tokenManager.removeToken();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          mustChangePassword: false,
        });
      },

      setUser: (user) => set({ user }),

      setMustChangePassword: (value) => set({ mustChangePassword: value }),

      isAdmin: () => get().user?.userRole === 'admin',

      handleAuthExpired: () => {
        const { logout } = get();
        logout();
        // toast 알림은 컴포넌트에서 처리
      },
    }),
    {
      name: 'wf-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);

// 인증 만료 이벤트 리스너 등록
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useAuthStore.getState().handleAuthExpired();
  });
}

// tokenManager를 외부에서 사용할 수 있도록 export
export { tokenManager };
