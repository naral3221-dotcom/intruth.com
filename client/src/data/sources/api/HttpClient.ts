/**
 * HTTP Client
 * 토큰 관리, 에러 처리, API 요청을 담당하는 클래스
 */
import { ApiError } from './ApiError';

export interface HttpClientConfig {
  baseUrl: string;
  getToken: () => string | null;
  onAuthExpired: () => void;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface TokenManager {
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  isExpired: () => boolean;
  isExpiringSoon: () => boolean;
}

// 로깅 유틸리티
const createLogger = (logLevel: string) => ({
  debug: (...args: unknown[]) => {
    if (logLevel === 'debug') console.log('[HttpClient]', ...args);
  },
  info: (...args: unknown[]) => {
    if (['debug', 'info'].includes(logLevel)) console.info('[HttpClient]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (['debug', 'info', 'warn'].includes(logLevel)) console.warn('[HttpClient]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[HttpClient]', ...args);
  },
});

/**
 * 토큰 관리자 생성
 */
export function createTokenManager(): TokenManager {
  return {
    getToken: () => localStorage.getItem('token'),

    setToken: (token: string) => {
      localStorage.setItem('token', token);
      // 토큰 만료 시간 저장 (24시간)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('token_expires_at', expiresAt.toString());
    },

    removeToken: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('token_expires_at');
    },

    isExpired: () => {
      const expiresAt = localStorage.getItem('token_expires_at');
      if (!expiresAt) return true;
      return Date.now() > parseInt(expiresAt, 10);
    },

    isExpiringSoon: () => {
      const expiresAt = localStorage.getItem('token_expires_at');
      if (!expiresAt) return true;
      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() > parseInt(expiresAt, 10) - fiveMinutes;
    },
  };
}

/**
 * HTTP Client 클래스
 */
export class HttpClient {
  private config: HttpClientConfig;
  private logger: ReturnType<typeof createLogger>;
  private tokenManager: TokenManager;

  constructor(config: HttpClientConfig, tokenManager?: TokenManager) {
    this.config = config;
    this.logger = createLogger(config.logLevel || 'error');
    this.tokenManager = tokenManager || createTokenManager();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.config.getToken();

    // 토큰이 만료된 경우 인증 만료 처리
    if (token && this.tokenManager.isExpired()) {
      this.config.onAuthExpired();
      throw ApiError.tokenExpired();
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    this.logger.debug(`Request: ${options.method || 'GET'} ${endpoint}`);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '오류가 발생했습니다.' }));

        // 401 에러 처리
        if (response.status === 401) {
          this.config.onAuthExpired();
          throw ApiError.unauthorized();
        }

        // 403 에러 처리
        if (response.status === 403) {
          throw ApiError.forbidden();
        }

        // 404 에러 처리
        if (response.status === 404) {
          throw ApiError.notFound();
        }

        // 기타 에러
        throw ApiError.fromResponse(response.status, errorData);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      this.logger.debug(`Response: ${endpoint}`, data);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        this.logger.error(`API Error: ${error.code} - ${error.message}`);
        throw error;
      }

      // 네트워크 에러 등
      this.logger.error('Network Error:', error);
      throw ApiError.networkError();
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  getTokenManager(): TokenManager {
    return this.tokenManager;
  }
}

/**
 * HttpClient 인스턴스 생성 팩토리 함수
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  const tokenManager = createTokenManager();
  return new HttpClient(config, tokenManager);
}
