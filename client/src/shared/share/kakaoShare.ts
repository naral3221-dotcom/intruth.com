import { getKakaoJavascriptKey } from './shareConfig';

export type ShareResult = 'kakao' | 'native' | 'copied' | 'downloaded' | 'unavailable';

interface KakaoShareTextInput {
  title: string;
  text: string;
  url: string;
  buttonTitle?: string;
  serverCallbackArgs?: Record<string, string>;
}

interface KakaoSdk {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (params: {
      objectType: 'text';
      text: string;
      link: {
        mobileWebUrl: string;
        webUrl: string;
      };
      buttonTitle?: string;
      serverCallbackArgs?: Record<string, string>;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';
let kakaoSdkPromise: Promise<KakaoSdk> | null = null;

function trimForKakao(text: string) {
  const normalized = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized;
}

function loadKakaoSdk() {
  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  kakaoSdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_SDK_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.Kakao) {
          resolve(window.Kakao);
          return;
        }
        reject(new Error('Kakao SDK not available'));
      });
      existingScript.addEventListener('error', () => reject(new Error('Kakao SDK failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Kakao) {
        resolve(window.Kakao);
        return;
      }
      reject(new Error('Kakao SDK not available'));
    };
    script.onerror = () => reject(new Error('Kakao SDK failed to load'));
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
}

export async function copyShareText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function shareTextFallback({
  title,
  text,
  url,
}: KakaoShareTextInput): Promise<ShareResult> {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return 'native';
  }

  await copyShareText(`${title}\n${text}\n${url}`);
  return 'copied';
}

export async function shareKakaoText(input: KakaoShareTextInput): Promise<ShareResult> {
  const key = getKakaoJavascriptKey();

  if (!key) {
    return shareTextFallback(input);
  }

  try {
    const Kakao = await loadKakaoSdk();

    if (!Kakao.isInitialized()) {
      Kakao.init(key);
    }

    Kakao.Share.sendDefault({
      objectType: 'text',
      text: trimForKakao(input.text),
      link: {
        mobileWebUrl: input.url,
        webUrl: input.url,
      },
      buttonTitle: input.buttonTitle || '열기',
      serverCallbackArgs: input.serverCallbackArgs,
    });

    return 'kakao';
  } catch {
    return shareTextFallback(input);
  }
}
