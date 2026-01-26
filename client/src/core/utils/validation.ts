// 유효성 검사 유틸리티

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 문자열 검증
export const stringValidation = {
  required: (value: string, fieldName: string): ValidationError | null => {
    if (!value || !value.trim()) {
      return { field: fieldName, message: `${fieldName}은(는) 필수 입력입니다.` };
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (value && value.trim().length < min) {
      return { field: fieldName, message: `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다.` };
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
    if (value && value.length > max) {
      return { field: fieldName, message: `${fieldName}은(는) 최대 ${max}자까지 입력 가능합니다.` };
    }
    return null;
  },

  noSpecialChars: (value: string, fieldName: string): ValidationError | null => {
    const pattern = /^[a-zA-Z0-9가-힣\s\-_]+$/;
    if (value && !pattern.test(value)) {
      return { field: fieldName, message: `${fieldName}에 특수문자를 사용할 수 없습니다.` };
    }
    return null;
  },
};

// URL 검증
export const urlValidation = {
  isValid: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null; // 선택적 필드인 경우
    try {
      new URL(value);
      return null;
    } catch {
      return { field: fieldName, message: `올바른 URL 형식이 아닙니다.` };
    }
  },

  isHttps: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') {
        return { field: fieldName, message: `보안 연결(HTTPS)을 사용하는 URL을 입력해주세요.` };
      }
      return null;
    } catch {
      return { field: fieldName, message: `올바른 URL 형식이 아닙니다.` };
    }
  },
};

// 날짜 검증
export const dateValidation = {
  isValidDate: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { field: fieldName, message: `올바른 날짜 형식이 아닙니다.` };
    }
    return null;
  },

  isFutureDate: (value: string, fieldName: string): ValidationError | null => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return { field: fieldName, message: `${fieldName}은(는) 오늘 이후 날짜여야 합니다.` };
    }
    return null;
  },

  isAfterDate: (
    value: string,
    compareValue: string,
    fieldName: string,
    compareFieldName: string
  ): ValidationError | null => {
    if (!value || !compareValue) return null;
    const date = new Date(value);
    const compareDate = new Date(compareValue);
    if (date < compareDate) {
      return { field: fieldName, message: `${fieldName}은(는) ${compareFieldName} 이후여야 합니다.` };
    }
    return null;
  },
};

// 업무(Task) 폼 검증
export interface TaskFormData {
  title: string;
  description?: string;
  projectId: string;
  status: string;
  priority: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  folderUrl?: string;
}

export function validateTaskForm(
  data: TaskFormData,
  isSubTask: boolean = false
): ValidationResult {
  const errors: ValidationError[] = [];

  // 제목 검증
  const titleRequired = stringValidation.required(data.title, '제목');
  if (titleRequired) errors.push(titleRequired);

  const titleMinLength = stringValidation.minLength(data.title, 2, '제목');
  if (titleMinLength) errors.push(titleMinLength);

  const titleMaxLength = stringValidation.maxLength(data.title, 100, '제목');
  if (titleMaxLength) errors.push(titleMaxLength);

  // 프로젝트 검증 (하위 업무가 아닌 경우에만)
  if (!isSubTask) {
    const projectRequired = stringValidation.required(data.projectId, '프로젝트');
    if (projectRequired) errors.push(projectRequired);
  }

  // 설명 최대 길이 검증
  if (data.description) {
    const descMaxLength = stringValidation.maxLength(data.description, 2000, '설명');
    if (descMaxLength) errors.push(descMaxLength);
  }

  // 날짜 검증
  if (data.startDate) {
    const startDateValid = dateValidation.isValidDate(data.startDate, '시작일');
    if (startDateValid) errors.push(startDateValid);
  }

  if (data.dueDate) {
    const dueDateValid = dateValidation.isValidDate(data.dueDate, '마감일');
    if (dueDateValid) errors.push(dueDateValid);
  }

  // 시작일과 마감일 순서 검증
  if (data.startDate && data.dueDate) {
    const dateOrder = dateValidation.isAfterDate(
      data.dueDate,
      data.startDate,
      '마감일',
      '시작일'
    );
    if (dateOrder) errors.push(dateOrder);
  }

  // URL 검증
  if (data.folderUrl) {
    const urlValid = urlValidation.isValid(data.folderUrl, '작업 폴더 URL');
    if (urlValid) errors.push(urlValid);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 프로젝트 폼 검증
export interface ProjectFormData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export function validateProjectForm(data: ProjectFormData): ValidationResult {
  const errors: ValidationError[] = [];

  // 이름 검증
  const nameRequired = stringValidation.required(data.name, '프로젝트명');
  if (nameRequired) errors.push(nameRequired);

  const nameMinLength = stringValidation.minLength(data.name, 2, '프로젝트명');
  if (nameMinLength) errors.push(nameMinLength);

  const nameMaxLength = stringValidation.maxLength(data.name, 50, '프로젝트명');
  if (nameMaxLength) errors.push(nameMaxLength);

  // 설명 최대 길이 검증
  if (data.description) {
    const descMaxLength = stringValidation.maxLength(data.description, 500, '설명');
    if (descMaxLength) errors.push(descMaxLength);
  }

  // 날짜 검증
  if (data.startDate && data.endDate) {
    const dateOrder = dateValidation.isAfterDate(
      data.endDate,
      data.startDate,
      '종료일',
      '시작일'
    );
    if (dateOrder) errors.push(dateOrder);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 비밀번호 검증
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (password.length < 8) {
    errors.push({ field: 'password', message: '비밀번호는 최소 8자 이상이어야 합니다.' });
  }

  if (!/[A-Za-z]/.test(password)) {
    errors.push({ field: 'password', message: '비밀번호에 영문자가 포함되어야 합니다.' });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: '비밀번호에 숫자가 포함되어야 합니다.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// XSS 방지를 위한 문자열 살균
export function sanitizeString(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

// 첫 번째 에러 메시지 가져오기
export function getFirstError(result: ValidationResult): string | null {
  return result.errors.length > 0 ? result.errors[0].message : null;
}

// 특정 필드의 에러 메시지 가져오기
export function getFieldError(result: ValidationResult, field: string): string | null {
  const error = result.errors.find((e) => e.field === field);
  return error ? error.message : null;
}
