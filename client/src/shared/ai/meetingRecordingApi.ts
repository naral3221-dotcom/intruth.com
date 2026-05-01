import type {
  ApplyMeetingMaterialDraftResult,
  CreateTasksFromMeetingActionItemsResult,
  CreateMeetingMaterialDraftResult,
  GenerateMeetingMaterialsResult,
  MeetingActionItemTaskOverride,
  MeetingMaterialDraft,
  MeetingRecording,
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

export async function listMeetingRecordings(meetingId: number): Promise<MeetingRecording[]> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/recordings`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function uploadMeetingRecording(meetingId: number, file: File): Promise<MeetingRecording> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/recordings`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function transcribeMeetingRecording(recordingId: number): Promise<MeetingRecording> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/recordings/${recordingId}/transcribe`, {
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

export async function generateMeetingMaterials(
  meetingId: number,
  options?: {
    recordingId?: number;
    applyToMeeting?: boolean;
    replaceActionItems?: boolean;
  }
): Promise<GenerateMeetingMaterialsResult> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function listMeetingMaterialDrafts(meetingId: number): Promise<MeetingMaterialDraft[]> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/material-drafts`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function createMeetingMaterialDraft(
  meetingId: number,
  options?: { recordingId?: number }
): Promise<CreateMeetingMaterialDraftResult> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/material-drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function applyMeetingMaterialDraft(
  draftId: number,
  options?: { replaceActionItems?: boolean }
): Promise<ApplyMeetingMaterialDraftResult> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/material-drafts/${draftId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function discardMeetingMaterialDraft(draftId: number): Promise<MeetingMaterialDraft> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/material-drafts/${draftId}/discard`, {
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

export async function createTasksFromMeetingActionItems(
  meetingId: number,
  actionItemIds: number[],
  overrides?: MeetingActionItemTaskOverride[]
): Promise<CreateTasksFromMeetingActionItemsResult> {
  const token = getToken();
  const response = await fetch(`${getBaseUrl()}/ai/meetings/${meetingId}/action-items/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ actionItemIds, overrides }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
