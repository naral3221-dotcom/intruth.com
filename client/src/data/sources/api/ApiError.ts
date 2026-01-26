/**
 * API 에러 클래스
 * HTTP 응답 에러를 표준화된 형태로 처리
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static fromResponse(status: number, data: Record<string, unknown>): ApiError {
    return new ApiError(
      status,
      (data.code as string) || 'UNKNOWN_ERROR',
      (data.message as string) || (data.error as string) || '오류가 발생했습니다.',
      data.details as Record<string, unknown>
    );
  }

  static unauthorized(message = '인증이 필요합니다.'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = '접근 권한이 없습니다.'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = '리소스를 찾을 수 없습니다.'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static networkError(message = '네트워크 연결을 확인해주세요.'): ApiError {
    return new ApiError(0, 'NETWORK_ERROR', message);
  }

  static tokenExpired(message = '인증이 만료되었습니다. 다시 로그인해주세요.'): ApiError {
    return new ApiError(401, 'TOKEN_EXPIRED', message);
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }
}
