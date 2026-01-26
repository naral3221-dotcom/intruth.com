/**
 * Mock Meeting Repository
 * IMeetingRepository 인터페이스를 구현하여 Mock 회의자료 데이터 제공
 */
import type { Meeting, MeetingComment, MeetingAttachment, MeetingAttendee, CreateMeetingInput, UpdateMeetingInput, MeetingFilters } from '@/types';
import type { IMeetingRepository, AddCommentDTO } from '@/domain/repositories/IMeetingRepository';
import { MockStorage } from './MockStorage';

// 회의자료 데이터를 위한 localStorage 키
const MEETING_STORAGE_KEY = 'workflow_meetings';

export class MockMeetingRepository implements IMeetingRepository {
  private storage = MockStorage.getInstance();

  private getMeetings(): Meeting[] {
    try {
      const stored = localStorage.getItem(MEETING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveMeetings(meetings: Meeting[]): void {
    localStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(meetings));
  }

  async findAll(filters?: MeetingFilters): Promise<Meeting[]> {
    await this.storage.delay(300);

    let meetings = this.getMeetings();

    if (filters) {
      if (filters.projectId) {
        meetings = meetings.filter((m) => m.projectId === filters.projectId);
      }
      if (filters.authorId) {
        meetings = meetings.filter((m) => m.authorId === filters.authorId);
      }
      if (filters.status) {
        meetings = meetings.filter((m) => m.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        meetings = meetings.filter((m) =>
          m.title.toLowerCase().includes(searchLower) ||
          m.content.toLowerCase().includes(searchLower) ||
          m.summary?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.startDate) {
        meetings = meetings.filter((m) =>
          new Date(m.meetingDate) >= new Date(filters.startDate!)
        );
      }
      if (filters.endDate) {
        meetings = meetings.filter((m) =>
          new Date(m.meetingDate) <= new Date(filters.endDate!)
        );
      }
    }

    return meetings.sort((a, b) =>
      new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
    );
  }

  async findById(id: number): Promise<Meeting> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === id);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    return meeting;
  }

  async create(data: CreateMeetingInput): Promise<Meeting> {
    await this.storage.delay(300);

    const meetings = this.getMeetings();
    const members = this.storage.members;
    const projects = this.storage.projects;
    const currentMember = this.storage.getCurrentMember();

    const newMeetingId = Date.now();

    const attendees: MeetingAttendee[] = data.attendeeIds.map((memberId, idx) => {
      const member = members.find((m) => m.id === String(memberId));
      return member ? {
        id: newMeetingId * 1000 + idx,
        meetingId: newMeetingId,
        memberId,
        member,
        createdAt: new Date().toISOString(),
      } : null;
    }).filter((a): a is MeetingAttendee => a !== null);

    const project = data.projectId
      ? projects.find((p) => p.id === String(data.projectId))
      : undefined;

    const newMeeting: Meeting = {
      id: newMeetingId,
      title: data.title,
      meetingDate: data.meetingDate,
      location: data.location,
      projectId: data.projectId,
      project: project ? { id: Number(project.id), name: project.name } : undefined,
      content: data.content,
      summary: data.summary,
      authorId: Number(currentMember.id),
      author: currentMember,
      attendees,
      attachments: [],
      comments: [],
      status: data.status || 'DRAFT',
      _count: { attachments: 0, comments: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    meetings.push(newMeeting);
    this.saveMeetings(meetings);

    return newMeeting;
  }

  async update(id: number, data: UpdateMeetingInput): Promise<Meeting> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const index = meetings.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    const members = this.storage.members;
    const projects = this.storage.projects;

    let attendees = meetings[index].attendees;
    if (data.attendeeIds) {
      attendees = data.attendeeIds.map((memberId, idx) => {
        const member = members.find((m) => m.id === String(memberId));
        return member ? {
          id: id * 1000 + idx + Date.now() % 1000,
          meetingId: id,
          memberId,
          member,
          createdAt: new Date().toISOString(),
        } : null;
      }).filter((a): a is MeetingAttendee => a !== null);
    }

    let project = meetings[index].project;
    if (data.projectId !== undefined) {
      project = data.projectId
        ? projects.find((p) => p.id === String(data.projectId))
        : undefined;
      if (project) {
        project = { id: Number(project.id), name: project.name };
      }
    }

    meetings[index] = {
      ...meetings[index],
      ...data,
      attendees,
      project,
      updatedAt: new Date().toISOString(),
    };

    this.saveMeetings(meetings);
    return meetings[index];
  }

  async delete(id: number): Promise<void> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const index = meetings.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    meetings.splice(index, 1);
    this.saveMeetings(meetings);
  }

  async uploadAttachments(meetingId: number, files: File[]): Promise<MeetingAttachment[]> {
    await this.storage.delay(500);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    // Mock에서는 파일을 실제로 저장하지 않고 메타데이터만 저장
    const newAttachments: MeetingAttachment[] = files.map((file, idx) => ({
      id: meetingId * 10000 + Date.now() % 10000 + idx,
      meetingId,
      fileName: file.name,
      storedName: `${Date.now()}-${file.name}`,
      filePath: `/uploads/meetings/${Date.now()}-${file.name}`,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    }));

    meeting.attachments = [...(meeting.attachments || []), ...newAttachments];
    meeting._count = {
      ...meeting._count,
      attachments: meeting.attachments.length,
    };

    this.saveMeetings(meetings);
    return newAttachments;
  }

  async deleteAttachment(meetingId: number, attachmentId: number): Promise<void> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    meeting.attachments = (meeting.attachments || []).filter((a) => a.id !== attachmentId);
    meeting._count = {
      ...meeting._count,
      attachments: meeting.attachments.length,
    };

    this.saveMeetings(meetings);
  }

  async downloadAttachment(_meetingId: number, _attachmentId: number): Promise<Blob> {
    await this.storage.delay(200);
    // Mock에서는 빈 Blob 반환
    return new Blob(['Mock file content'], { type: 'text/plain' });
  }

  async getComments(meetingId: number): Promise<MeetingComment[]> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    return meeting.comments || [];
  }

  async addComment(meetingId: number, data: AddCommentDTO): Promise<MeetingComment> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    const currentMember = this.storage.getCurrentMember();

    const newComment: MeetingComment = {
      id: Date.now(),
      meetingId,
      authorId: Number(currentMember.id),
      author: currentMember,
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    meeting.comments = [...(meeting.comments || []), newComment];
    meeting._count = {
      ...meeting._count,
      comments: meeting.comments.length,
    };

    this.saveMeetings(meetings);
    return newComment;
  }

  async deleteComment(meetingId: number, commentId: number): Promise<void> {
    await this.storage.delay(200);

    const meetings = this.getMeetings();
    const meeting = meetings.find((m) => m.id === meetingId);

    if (!meeting) {
      throw new Error('회의자료를 찾을 수 없습니다.');
    }

    meeting.comments = (meeting.comments || []).filter((c) => c.id !== commentId);
    meeting._count = {
      ...meeting._count,
      comments: meeting.comments.length,
    };

    this.saveMeetings(meetings);
  }
}
