/**
 * Repository Provider
 * Repository 인스턴스를 React 컴포넌트 트리에 제공
 */
import { type ReactNode, useMemo } from 'react';
import { RepositoryContext, type Repositories } from './RepositoryContext';
import { createRepositories } from './createRepositories';

interface RepositoryProviderProps {
  children: ReactNode;
}

/**
 * Repository Provider 컴포넌트
 * 환경 변수에 따라 Mock 또는 API Repository를 생성하여 제공
 */
export function RepositoryProvider({ children }: RepositoryProviderProps) {
  const repositories = useMemo<Repositories>(() => {
    const useMock = import.meta.env.VITE_USE_MOCK === 'true';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const logLevel = (import.meta.env.VITE_LOG_LEVEL || 'error') as 'debug' | 'info' | 'warn' | 'error';

    return createRepositories({
      useMock,
      apiBaseUrl,
      getToken: () => localStorage.getItem('token'),
      onAuthExpired: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('token_expires_at');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      },
      logLevel,
    });
  }, []);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}
