import type { GenerateMeetingMaterialsResult, MeetingRecording } from '@/types';

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
