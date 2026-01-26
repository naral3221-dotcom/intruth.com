/**
 * 커스텀 에러 클래스
 * 비즈니스 로직에서 발생하는 에러를 표준화
 */

/**
 * 기본 애플리케이션 에러
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Error 클래스 상속 시 prototype chain 복원
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 리소스를 찾을 수 없음 (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = '리소스를 찾을 수 없습니다.', details?: Record<string, unknown>) {
    super(404, 'NOT_FOUND', message, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 유효성 검증 실패 (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = '유효하지 않은 요청입니다.', details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 인증 실패 (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '인증이 필요합니다.', details?: Record<string, unknown>) {
    super(401, 'UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 권한 없음 (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '접근 권한이 없습니다.', details?: Record<string, unknown>) {
    super(403, 'FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 충돌 (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = '리소스 충돌이 발생했습니다.', details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 서버 내부 오류 (500)
 */
export class InternalError extends AppError {
  constructor(message: string = '서버 오류가 발생했습니다.', details?: Record<string, unknown>) {
    super(500, 'INTERNAL_ERROR', message, details);
    this.name = 'InternalError';
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * 에러가 AppError 타입인지 확인
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Express Response를 위한 에러 핸들링 헬퍼
 */
export function handleError(error: unknown): { statusCode: number; body: { error: string; code?: string; details?: Record<string, unknown> } } {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }

  // 알 수 없는 에러
  console.error('Unexpected error:', error);
  return {
    statusCode: 500,
    body: {
      error: '서버 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR',
    },
  };
}
