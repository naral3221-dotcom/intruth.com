/**
 * Meeting Repository 구현체
 * IMeetingRepository 인터페이스를 구현하여 API를 통한 회의자료 데이터 접근 제공
 */
import type { Meeting, MeetingComment, MeetingAttachment, CreateMeetingInput, UpdateMeetingInput, MeetingFilters } from '@/types';
import type { IMeetingRepository, AddCommentDTO } from '@/domain/repositories/IMeetingRepository';
import { MeetingApiSource } from '../sources/api/MeetingApiSource';

export class MeetingRepository implements IMeetingRepository {
  constructor(private readonly apiSource: MeetingApiSource) {}

  async findAll(filters?: MeetingFilters): Promise<Meeting[]> {
    return this.apiSource.list(filters);
  }

  async findById(id: number): Promise<Meeting> {
    return this.apiSource.get(id);
  }

  async create(data: CreateMeetingInput): Promise<Meeting> {
    return this.apiSource.create(data);
  }

  async update(id: number, data: UpdateMeetingInput): Promise<Meeting> {
    return this.apiSource.update(id, data);
  }

  async delete(id: number): Promise<void> {
    return this.apiSource.delete(id);
  }

  async uploadAttachments(meetingId: number, files: File[]): Promise<MeetingAttachment[]> {
    return this.apiSource.uploadAttachments(meetingId, files);
  }

  async deleteAttachment(meetingId: number, attachmentId: number): Promise<void> {
    return this.apiSource.deleteAttachment(meetingId, attachmentId);
  }

  async downloadAttachment(meetingId: number, attachmentId: number): Promise<Blob> {
    return this.apiSource.downloadAttachment(meetingId, attachmentId);
  }

  async getComments(meetingId: number): Promise<MeetingComment[]> {
    return this.apiSource.getComments(meetingId);
  }

  async addComment(meetingId: number, data: AddCommentDTO): Promise<MeetingComment> {
    return this.apiSource.addComment(meetingId, data);
  }

  async deleteComment(meetingId: number, commentId: number): Promise<void> {
    return this.apiSource.deleteComment(meetingId, commentId);
  }
}
