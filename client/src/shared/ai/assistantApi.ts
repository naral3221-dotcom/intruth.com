import type {
  AiAgentAction,
  AiAssistantHistoryItem,
  AiAssistantResult,
  AiAssistantScope,
  AiCommandMessage,
  ApproveAiAgentActionResult,
  CreateAiTaskDraftActionResult,
  SaveAiCommandMessageInput,
} from '@/types';

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

async function requestAi(path: string, init?: RequestInit) {
  try {
    return await fetch(`${getBaseUrl()}${path}`, init);
  } catch {
    throw new Error('AI API 서버에 연결할 수 없습니다. 로컬 서버가 켜져 있는지와 VITE_API_BASE_URL 설정을 확인해주세요.');
  }
}

export async function askAiAssistant(
  prompt: string,
  scope?: Pick<AiAssistantScope, 'type' | 'id'>
): Promise<AiAssistantResult> {
  const token = getToken();
  const response = await requestAi('/ai/assistant/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ prompt, scope }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function listAiAssistantRuns(limit = 8): Promise<AiAssistantHistoryItem[]> {
  const token = getToken();
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await requestAi(`/ai/assistant/runs?${params.toString()}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function listAiAgentActions(limit = 8): Promise<AiAgentAction[]> {
  const token = getToken();
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await requestAi(`/ai/assistant/actions?${params.toString()}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function listAiCommandMessages(limit = 30): Promise<AiCommandMessage[]> {
  const token = getToken();
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await requestAi(`/ai/assistant/command-messages?${params.toString()}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function saveAiCommandMessage(input: SaveAiCommandMessageInput): Promise<AiCommandMessage> {
  const token = getToken();
  const response = await requestAi('/ai/assistant/command-messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function clearAiCommandMessages(): Promise<{ deletedCount: number }> {
  const token = getToken();
  const response = await requestAi('/ai/assistant/command-messages', {
    method: 'DELETE',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function createAiTaskDraftAction(
  prompt: string,
  scope?: Pick<AiAssistantScope, 'type' | 'id'>
): Promise<CreateAiTaskDraftActionResult> {
  const token = getToken();
  const response = await requestAi('/ai/assistant/task-drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ prompt, scope }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function approveAiAgentAction(actionId: number): Promise<ApproveAiAgentActionResult> {
  const token = getToken();
  const response = await requestAi(`/ai/assistant/actions/${actionId}/approve`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function rejectAiAgentAction(actionId: number): Promise<AiAgentAction> {
  const token = getToken();
  const response = await requestAi(`/ai/assistant/actions/${actionId}/reject`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
