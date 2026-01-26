/**
 * Meeting Repository 인터페이스
 * 회의자료 데이터 접근을 위한 추상화 계층
 */
import type { Meeting, MeetingComment, MeetingAttachment, CreateMeetingInput, UpdateMeetingInput, MeetingFilters } from '@/types';

// DTO (Data Transfer Objects)
export interface AddCommentDTO {
  content: string;
}

// Repository 인터페이스
export interface IMeetingRepository {
  // Query methods (조회)
  findAll(filters?: MeetingFilters): Promise<Meeting[]>;
  findById(id: number): Promise<Meeting>;

  // Command methods (변경)
  create(data: CreateMeetingInput): Promise<Meeting>;
  update(id: number, data: UpdateMeetingInput): Promise<Meeting>;
  delete(id: number): Promise<void>;

  // Attachment methods (첨부파일)
  uploadAttachments(meetingId: number, files: File[]): Promise<MeetingAttachment[]>;
  deleteAttachment(meetingId: number, attachmentId: number): Promise<void>;
  downloadAttachment(meetingId: number, attachmentId: number): Promise<Blob>;

  // Comment methods (댓글)
  getComments(meetingId: number): Promise<MeetingComment[]>;
  addComment(meetingId: number, data: AddCommentDTO): Promise<MeetingComment>;
  deleteComment(meetingId: number, commentId: number): Promise<void>;
}
