/**
 * Meeting API Source
 * 회의자료 관련 API 호출을 담당
 */
import type { Meeting, MeetingComment, MeetingAttachment, CreateMeetingInput, UpdateMeetingInput, MeetingFilters } from '@/types';
import type { AddCommentDTO } from '@/domain/repositories/IMeetingRepository';
import { HttpClient } from './HttpClient';

export class MeetingApiSource {
  constructor(private readonly httpClient: HttpClient) {}

  async list(filters?: MeetingFilters): Promise<Meeting[]> {
    const searchParams = new URLSearchParams();
    if (filters?.projectId) searchParams.set('projectId', String(filters.projectId));
    if (filters?.teamId) searchParams.set('teamId', String(filters.teamId));
    if (filters?.authorId) searchParams.set('authorId', String(filters.authorId));
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.search) searchParams.set('search', filters.search);
    if (filters?.startDate) searchParams.set('startDate', filters.startDate);
    if (filters?.endDate) searchParams.set('endDate', filters.endDate);
    const query = searchParams.toString();
    return this.httpClient.get(`/meetings${query ? `?${query}` : ''}`);
  }

  async get(id: number): Promise<Meeting> {
    return this.httpClient.get(`/meetings/${id}`);
  }

  async create(data: CreateMeetingInput): Promise<Meeting> {
    return this.httpClient.post('/meetings', data);
  }

  async update(id: number, data: UpdateMeetingInput): Promise<Meeting> {
    return this.httpClient.put(`/meetings/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    return this.httpClient.delete(`/meetings/${id}`);
  }

  async uploadAttachments(meetingId: number, files: File[]): Promise<MeetingAttachment[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${this.getBaseUrl()}/meetings/${meetingId}/attachments`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('첨부파일 업로드에 실패했습니다.');
    }

    return response.json();
  }

  async deleteAttachment(meetingId: number, attachmentId: number): Promise<void> {
    return this.httpClient.delete(`/meetings/${meetingId}/attachments/${attachmentId}`);
  }

  async downloadAttachment(meetingId: number, attachmentId: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.getBaseUrl()}/meetings/${meetingId}/attachments/${attachmentId}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('파일 다운로드에 실패했습니다.');
    }

    return response.blob();
  }

  async getComments(meetingId: number): Promise<MeetingComment[]> {
    return this.httpClient.get(`/meetings/${meetingId}/comments`);
  }

  async addComment(meetingId: number, data: AddCommentDTO): Promise<MeetingComment> {
    return this.httpClient.post(`/meetings/${meetingId}/comments`, data);
  }

  async deleteComment(meetingId: number, commentId: number): Promise<void> {
    return this.httpClient.delete(`/meetings/${meetingId}/comments/${commentId}`);
  }

  private getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL || '/api';
  }
}
