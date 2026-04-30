const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function readConfiguredPublicUrl() {
  return import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_SHARE_BASE_URL || '';
}

export function getKakaoJavascriptKey() {
  return import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || import.meta.env.VITE_KAKAO_APP_KEY || '';
}

export function getPublicAppUrl() {
  const configuredUrl = readConfiguredPublicUrl();
  if (configuredUrl) return normalizeBaseUrl(configuredUrl);

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin);
  }

  return '';
}

export function createShareUrl(path: string) {
  const baseUrl = getPublicAppUrl();
  if (!baseUrl) return path;

  return new URL(path, `${baseUrl}/`).toString();
}

export function isLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function getShareRuntimeStatus() {
  const publicAppUrl = getPublicAppUrl();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const configuredPublicUrl = Boolean(readConfiguredPublicUrl());

  return {
    publicAppUrl,
    currentOrigin,
    configuredPublicUrl,
    kakaoJavascriptKey: getKakaoJavascriptKey(),
    publicUrlIsLocal: isLocalUrl(publicAppUrl),
    currentOriginIsLocal: currentOrigin ? isLocalUrl(currentOrigin) : false,
  };
}
