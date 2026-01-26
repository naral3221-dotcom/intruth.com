import { create } from 'zustand';
import type { Meeting, MeetingComment, MeetingAttachment, CreateMeetingInput, UpdateMeetingInput, MeetingFilters, MeetingStatus } from '@/types';
import { meetingRepository } from '@/di/storeRepositories';
import { toast } from '@/stores/toastStore';

interface MeetingState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  filters: MeetingFilters;

  // Actions
  fetchMeetings: (filters?: MeetingFilters) => Promise<void>;
  fetchMeeting: (id: number) => Promise<void>;
  addMeeting: (data: CreateMeetingInput) => Promise<Meeting>;
  updateMeeting: (id: number, data: UpdateMeetingInput) => Promise<void>;
  deleteMeeting: (id: number) => Promise<void>;
  setFilters: (filters: MeetingFilters) => void;
  clearFilters: () => void;

  // 첨부파일
  uploadAttachments: (meetingId: number, files: File[]) => Promise<MeetingAttachment[]>;
  deleteAttachment: (meetingId: number, attachmentId: number) => Promise<void>;

  // 댓글
  addComment: (meetingId: number, content: string) => Promise<MeetingComment>;
  deleteComment: (meetingId: number, commentId: number) => Promise<void>;

  // Selectors
  getMeetingsByProject: (projectId: number) => Meeting[];
  getMeetingsByAuthor: (authorId: number) => Meeting[];
  getMeetingsByStatus: (status: MeetingStatus) => Meeting[];
  getRecentMeetings: (count?: number) => Meeting[];
  getThisWeekMeetings: () => Meeting[];
  getThisMonthMeetings: () => Meeting[];
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  currentMeeting: null,
  loading: false,
  error: null,
  filters: {},

  fetchMeetings: async (filters?: MeetingFilters) => {
    set({ loading: true, error: null });
    try {
      const effectiveFilters = filters || get().filters;
      const meetings = await meetingRepository.findAll(effectiveFilters);
      set({ meetings, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('회의자료 목록 로드 실패', message);
    }
  },

  fetchMeeting: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const meeting = await meetingRepository.findById(id);
      set({ currentMeeting: meeting, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false, currentMeeting: null });
      toast.error('회의자료 조회 실패', message);
    }
  },

  addMeeting: async (data: CreateMeetingInput) => {
    set({ loading: true, error: null });
    try {
      const newMeeting = await meetingRepository.create(data);
      set((state) => ({
        meetings: [newMeeting, ...state.meetings],
        loading: false,
      }));
      toast.success('회의자료 작성 완료', `"${newMeeting.title}" 회의자료가 등록되었습니다.`);
      return newMeeting;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('회의자료 작성 실패', message);
      throw error;
    }
  },

  updateMeeting: async (id: number, data: UpdateMeetingInput) => {
    const previousMeetings = get().meetings;

    // Optimistic update
    set((state) => ({
      meetings: state.meetings.map((meeting) =>
        meeting.id === id ? { ...meeting, ...data, updatedAt: new Date().toISOString() } : meeting
      ),
    }));

    try {
      const updatedMeeting = await meetingRepository.update(id, data);
      set((state) => ({
        meetings: state.meetings.map((meeting) =>
          meeting.id === id ? updatedMeeting : meeting
        ),
        currentMeeting: state.currentMeeting?.id === id ? updatedMeeting : state.currentMeeting,
      }));
      toast.success('회의자료 수정 완료');
    } catch (error) {
      // Rollback on error
      set({ meetings: previousMeetings });
      const message = (error as Error).message;
      toast.error('회의자료 수정 실패', message);
      throw error;
    }
  },

  deleteMeeting: async (id: number) => {
    const previousMeetings = get().meetings;

    // Optimistic delete
    set((state) => ({
      meetings: state.meetings.filter((meeting) => meeting.id !== id),
      currentMeeting: state.currentMeeting?.id === id ? null : state.currentMeeting,
    }));

    try {
      await meetingRepository.delete(id);
      toast.success('회의자료 삭제 완료');
    } catch (error) {
      // Rollback on error
      set({ meetings: previousMeetings });
      const message = (error as Error).message;
      toast.error('회의자료 삭제 실패', message);
      throw error;
    }
  },

  setFilters: (filters: MeetingFilters) => {
    set({ filters });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // 첨부파일 업로드
  uploadAttachments: async (meetingId: number, files: File[]) => {
    try {
      const attachments = await meetingRepository.uploadAttachments(meetingId, files);

      // 회의자료 상태 업데이트
      set((state) => ({
        meetings: state.meetings.map((meeting) => {
          if (meeting.id === meetingId) {
            return {
              ...meeting,
              attachments: [...(meeting.attachments || []), ...attachments],
              _count: {
                ...meeting._count,
                attachments: (meeting._count?.attachments || 0) + attachments.length,
              },
            };
          }
          return meeting;
        }),
        currentMeeting: state.currentMeeting?.id === meetingId
          ? {
              ...state.currentMeeting,
              attachments: [...(state.currentMeeting.attachments || []), ...attachments],
              _count: {
                ...state.currentMeeting._count,
                attachments: (state.currentMeeting._count?.attachments || 0) + attachments.length,
              },
            }
          : state.currentMeeting,
      }));

      toast.success('파일 업로드 완료', `${files.length}개 파일이 업로드되었습니다.`);
      return attachments;
    } catch (error) {
      const message = (error as Error).message;
      toast.error('파일 업로드 실패', message);
      throw error;
    }
  },

  // 첨부파일 삭제
  deleteAttachment: async (meetingId: number, attachmentId: number) => {
    try {
      await meetingRepository.deleteAttachment(meetingId, attachmentId);

      set((state) => ({
        meetings: state.meetings.map((meeting) => {
          if (meeting.id === meetingId) {
            return {
              ...meeting,
              attachments: meeting.attachments?.filter((a) => a.id !== attachmentId),
              _count: {
                ...meeting._count,
                attachments: Math.max(0, (meeting._count?.attachments || 0) - 1),
              },
            };
          }
          return meeting;
        }),
        currentMeeting: state.currentMeeting?.id === meetingId
          ? {
              ...state.currentMeeting,
              attachments: state.currentMeeting.attachments?.filter((a) => a.id !== attachmentId),
              _count: {
                ...state.currentMeeting._count,
                attachments: Math.max(0, (state.currentMeeting._count?.attachments || 0) - 1),
              },
            }
          : state.currentMeeting,
      }));

      toast.success('파일 삭제 완료');
    } catch (error) {
      const message = (error as Error).message;
      toast.error('파일 삭제 실패', message);
      throw error;
    }
  },

  // 댓글 추가
  addComment: async (meetingId: number, content: string) => {
    try {
      const comment = await meetingRepository.addComment(meetingId, { content });

      set((state) => ({
        meetings: state.meetings.map((meeting) => {
          if (meeting.id === meetingId) {
            return {
              ...meeting,
              comments: [comment, ...(meeting.comments || [])],
              _count: {
                ...meeting._count,
                comments: (meeting._count?.comments || 0) + 1,
              },
            };
          }
          return meeting;
        }),
        currentMeeting: state.currentMeeting?.id === meetingId
          ? {
              ...state.currentMeeting,
              comments: [comment, ...(state.currentMeeting.comments || [])],
              _count: {
                ...state.currentMeeting._count,
                comments: (state.currentMeeting._count?.comments || 0) + 1,
              },
            }
          : state.currentMeeting,
      }));

      return comment;
    } catch (error) {
      const message = (error as Error).message;
      toast.error('댓글 작성 실패', message);
      throw error;
    }
  },

  // 댓글 삭제
  deleteComment: async (meetingId: number, commentId: number) => {
    try {
      await meetingRepository.deleteComment(meetingId, commentId);

      set((state) => ({
        meetings: state.meetings.map((meeting) => {
          if (meeting.id === meetingId) {
            return {
              ...meeting,
              comments: meeting.comments?.filter((c) => c.id !== commentId),
              _count: {
                ...meeting._count,
                comments: Math.max(0, (meeting._count?.comments || 0) - 1),
              },
            };
          }
          return meeting;
        }),
        currentMeeting: state.currentMeeting?.id === meetingId
          ? {
              ...state.currentMeeting,
              comments: state.currentMeeting.comments?.filter((c) => c.id !== commentId),
              _count: {
                ...state.currentMeeting._count,
                comments: Math.max(0, (state.currentMeeting._count?.comments || 0) - 1),
              },
            }
          : state.currentMeeting,
      }));

      toast.success('댓글 삭제 완료');
    } catch (error) {
      const message = (error as Error).message;
      toast.error('댓글 삭제 실패', message);
      throw error;
    }
  },

  // Selectors
  getMeetingsByProject: (projectId: number) => {
    return get().meetings.filter((m) => m.projectId === projectId);
  },

  getMeetingsByAuthor: (authorId: number) => {
    return get().meetings.filter((m) => m.authorId === authorId);
  },

  getMeetingsByStatus: (status: MeetingStatus) => {
    return get().meetings.filter((m) => m.status === status);
  },

  getRecentMeetings: (count = 5) => {
    return get().meetings
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
      .slice(0, count);
  },

  getThisWeekMeetings: () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return get().meetings.filter((m) => {
      const meetingDate = new Date(m.meetingDate);
      return meetingDate >= startOfWeek && meetingDate < endOfWeek;
    });
  },

  getThisMonthMeetings: () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return get().meetings.filter((m) => {
      const meetingDate = new Date(m.meetingDate);
      return meetingDate >= startOfMonth && meetingDate <= endOfMonth;
    });
  },
}));
