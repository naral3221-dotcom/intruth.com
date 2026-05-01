import type { AiAssistantHistoryItem, AiAssistantResult } from '@/types';

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || '/api';
}

function getToken() {
  return localStorage.getItem('token');
}

async function parseError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error || 'AI 요청 처리에 실패했습니다.';
}

export async function askAiAssistant(prompt: string): Promise<AiAssistantResult> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/assistant/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function listAiAssistantRuns(limit = 8): Promise<AiAssistantHistoryItem[]> {
  const token = getToken();
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${getBaseUrl()}/ai/assistant/runs?${params.toString()}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
