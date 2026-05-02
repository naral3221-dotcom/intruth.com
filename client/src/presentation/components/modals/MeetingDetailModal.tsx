import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Download,
  Edit,
  FileDown,
  FileText,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMeetingStore } from '@/stores/meetingStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useMemberStore } from '@/stores/memberStore';
import { toast } from '@/stores/toastStore';
import { cn } from '@/core/utils/cn';
import { shareMeeting, shareTaskBundle } from '@/shared/share/entityShare';
import { generateMeetingPdfFile } from '@/shared/share/meetingPdf';
import { shareFileOrDownload } from '@/shared/share/nativeFileShare';
import {
  applyMeetingMaterialDraft,
  createMeetingMaterialDraft,
  createTasksFromMeetingActionItems,
  discardMeetingMaterialDraft,
  listMeetingMaterialDrafts,
  listMeetingRecordings,
  transcribeMeetingRecording,
  uploadMeetingRecording,
} from '@/shared/ai/meetingRecordingApi';
import type {
  ActionItemPriority,
  MeetingActionItem,
  MeetingMaterialDraft,
  MeetingRecording,
  Task,
} from '@/types';
import type { ShareResult } from '@/shared/share/kakaoShare';

const recordingStatusLabel: Record<MeetingRecording['status'], string> = {
  UPLOADED: '업로드됨',
  TRANSCRIBING: '전사 중',
  TRANSCRIBED: '전사 완료',
  FAILED: '실패',
};

const recordingStatusClass: Record<MeetingRecording['status'], string> = {
  UPLOADED: 'aboard-badge-info',
  TRANSCRIBING: 'aboard-badge-warning',
  TRANSCRIBED: 'aboard-badge-success',
  FAILED: 'aboard-badge-warning',
};

const draftStatusLabel: Record<MeetingMaterialDraft['status'], string> = {
  DRAFT: '검토 대기',
  APPLIED: '적용 완료',
  DISCARDED: '폐기됨',
};

const draftStatusClass: Record<MeetingMaterialDraft['status'], string> = {
  DRAFT: 'aboard-badge-info',
  APPLIED: 'aboard-badge-success',
  DISCARDED: 'aboard-badge-warning',
};

const priorityLabel = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
} as const;

const priorityOptions: Array<{ value: ActionItemPriority; label: string }> = [
  { value: 'LOW', label: '낮음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'HIGH', label: '높음' },
  { value: 'URGENT', label: '긴급' },
];

interface ActionItemTaskDraft {
  actionItemId: number;
  title: string;
  description: string;
  priority: ActionItemPriority;
  assigneeId: string;
  dueDate: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatElapsedSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDateForInput(value?: string | null) {
  if (!value) return '';

  try {
    return format(parseISO(value), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function createTaskDraftFromActionItem(item: MeetingActionItem): ActionItemTaskDraft {
  return {
    actionItemId: item.id,
    title: item.title,
    description: item.description || '',
    priority: item.priority,
    assigneeId: item.assigneeId || '',
    dueDate: formatDateForInput(item.dueDate),
  };
}

function getTranscriptPreview(recording: MeetingRecording) {
  if (recording.segments?.length) {
    return recording.segments
      .map((segment) => `${segment.speaker ? `${segment.speaker}: ` : ''}${segment.text}`)
      .join('\n');
  }

  return recording.transcriptText || '';
}

export function MeetingDetailModal() {
  const {
    isMeetingDetailModalOpen,
    viewingMeeting,
    closeMeetingDetailModal,
    openEditMeetingModal,
    openConfirmModal,
  } = useUIStore();
  const { deleteMeeting, addComment, deleteComment } = useMeetingStore();
  const { user } = useAuthStore();
  const { members, fetchMembers } = useMemberStore();

  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [transcribingRecordingId, setTranscribingRecordingId] = useState<number | null>(null);
  const [materialDrafts, setMaterialDrafts] = useState<MeetingMaterialDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [applyingDraftId, setApplyingDraftId] = useState<number | null>(null);
  const [discardingDraftId, setDiscardingDraftId] = useState<number | null>(null);
  const [selectedActionItemIds, setSelectedActionItemIds] = useState<number[]>([]);
  const [actionItemTaskDrafts, setActionItemTaskDrafts] = useState<Record<number, ActionItemTaskDraft>>({});
  const [creatingTasksFromActionItems, setCreatingTasksFromActionItems] = useState(false);
  const [createdTasksForShare, setCreatedTasksForShare] = useState<Task[]>([]);
  const [sharingCreatedTasks, setSharingCreatedTasks] = useState(false);
  const [appliedKakaoBrief, setAppliedKakaoBrief] = useState<string | null>(null);
  const [browserRecorder, setBrowserRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const recordingInputRef = useRef<HTMLInputElement>(null);
  const browserRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const meeting = viewingMeeting;
  const aiServerEnabled = import.meta.env.VITE_USE_MOCK !== 'true';
  const canUseBrowserRecording =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    'MediaRecorder' in window;
  const isBrowserRecording = browserRecorder?.state === 'recording';

  const openDraft = useMemo(() => {
    const draftById = activeDraftId
      ? materialDrafts.find((draft) => draft.id === activeDraftId)
      : null;

    return draftById || materialDrafts.find((draft) => draft.status === 'DRAFT') || null;
  }, [activeDraftId, materialDrafts]);

  const hasTranscribedRecording = recordings.some((recording) => (
    recording.status === 'TRANSCRIBED' && Boolean(recording.transcriptText || recording.segments?.length)
  ));

  const meetingActionItems = useMemo(() => meeting?.actionItems || [], [meeting?.actionItems]);
  const convertibleActionItems = useMemo(
    () => meetingActionItems.filter((item) => !item.taskId),
    [meetingActionItems]
  );
  const convertibleActionItemIds = useMemo(
    () => convertibleActionItems.map((item) => item.id),
    [convertibleActionItems]
  );
  const convertibleActionItemSignature = convertibleActionItemIds.join(',');
  const convertedActionItemCount = meetingActionItems.length - convertibleActionItems.length;
  const taskDraftAssigneeOptions = useMemo(() => {
    const byId = new Map<string, typeof members[number]>();

    const addMember = (member: typeof members[number] | null | undefined) => {
      if (member?.id) byId.set(member.id, member);
    };

    addMember(meeting?.author);
    meeting?.attendees?.forEach((attendee) => addMember(attendee.member));
    meetingActionItems.forEach((item) => addMember(item.assignee));
    members.filter((member) => member.isActive !== false).forEach(addMember);

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [meeting, meetingActionItems, members]);

  const canEdit = meeting && (meeting.authorId === user?.id || user?.userRole === 'admin');

  useEffect(() => {
    if (!isMeetingDetailModalOpen || !meeting || !aiServerEnabled) {
      setRecordings([]);
      setMaterialDrafts([]);
      setActiveDraftId(null);
      return;
    }

    let cancelled = false;
    setRecordingsLoading(true);
    setDraftsLoading(true);

    listMeetingRecordings(meeting.id)
      .then((items) => {
        if (!cancelled) setRecordings(items);
      })
      .catch((error) => {
        if (!cancelled) toast.error('녹음 목록을 불러오지 못했습니다.', (error as Error).message);
      })
      .finally(() => {
        if (!cancelled) setRecordingsLoading(false);
      });

    listMeetingMaterialDrafts(meeting.id)
      .then((items) => {
        if (!cancelled) {
          setMaterialDrafts(items);
          setActiveDraftId(items.find((draft) => draft.status === 'DRAFT')?.id ?? items[0]?.id ?? null);
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error('AI 초안 목록을 불러오지 못했습니다.', (error as Error).message);
      })
      .finally(() => {
        if (!cancelled) setDraftsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiServerEnabled, isMeetingDetailModalOpen, meeting]);

  useEffect(() => {
    if (isMeetingDetailModalOpen && members.length === 0) {
      void fetchMembers();
    }
  }, [fetchMembers, isMeetingDetailModalOpen, members.length]);

  useEffect(() => {
    if (!isBrowserRecording || !recordingStartedAt) return;

    const interval = window.setInterval(() => {
      setRecordingElapsedSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isBrowserRecording, recordingStartedAt]);

  useEffect(() => () => {
    if (browserRecorderRef.current?.state === 'recording') {
      browserRecorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    setActionItemTaskDrafts((current) => {
      if (!isMeetingDetailModalOpen || !meeting?.id) {
        return Object.keys(current).length > 0 ? {} : current;
      }

      const convertibleIds = new Set(convertibleActionItems.map((item) => item.id));
      const next: Record<number, ActionItemTaskDraft> = {};
      let changed = false;

      for (const item of convertibleActionItems) {
        next[item.id] = current[item.id] || createTaskDraftFromActionItem(item);
        if (!current[item.id]) changed = true;
      }

      for (const id of Object.keys(current).map(Number)) {
        if (!convertibleIds.has(id)) {
          changed = true;
          break;
        }
      }

      return changed ? next : current;
    });
  }, [convertibleActionItems, isMeetingDetailModalOpen, meeting?.id]);

  useEffect(() => {
    setSelectedActionItemIds((current) => {
      if (!isMeetingDetailModalOpen || !meeting?.id) {
        return current.length > 0 ? [] : current;
      }

      const next = convertibleActionItemSignature
        ? convertibleActionItemSignature.split(',').map(Number)
        : [];
      const unchanged = current.length === next.length && current.every((id, index) => id === next[index]);
      return unchanged ? current : next;
    });
  }, [convertibleActionItemSignature, isMeetingDetailModalOpen, meeting?.id]);

  const handleClose = () => {
    if (browserRecorderRef.current?.state === 'recording') {
      browserRecorderRef.current.stop();
    }
    closeMeetingDetailModal();
    setCommentContent('');
    setAppliedKakaoBrief(null);
  };

  const handleEdit = () => {
    if (!meeting) return;
    closeMeetingDetailModal();
    openEditMeetingModal(meeting);
  };

  const handleDelete = () => {
    if (!meeting) return;

    openConfirmModal({
      title: '회의자료 삭제',
      message: `"${meeting.title}" 회의자료를 삭제할까요?\n삭제한 회의자료는 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'danger',
      onConfirm: async () => {
        await deleteMeeting(Number(meeting.id));
        handleClose();
      },
    });
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meeting || !commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(Number(meeting.id), commentContent.trim());
      setCommentContent('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (!meeting) return;

    openConfirmModal({
      title: '댓글 삭제',
      message: '이 댓글을 삭제할까요?',
      confirmText: '삭제',
      variant: 'danger',
      onConfirm: async () => {
        await deleteComment(Number(meeting.id), commentId);
      },
    });
  };

  const notifyShareResult = (result: ShareResult, downloadedMessage = '파일을 내려받았습니다.') => {
    if (result === 'kakao' || result === 'native') {
      toast.success('공유 화면을 열었습니다.');
      return;
    }

    if (result === 'copied') {
      toast.success('공유 내용을 복사했습니다.');
      return;
    }

    if (result === 'downloaded') {
      toast.success(downloadedMessage);
      return;
    }

    toast.info('공유를 완료했습니다.');
  };

  const handleKakaoShare = async () => {
    if (!meeting) return;

    setSharingKakao(true);
    try {
      const result = await shareMeeting(meeting);
      notifyShareResult(result);
    } catch {
      toast.error('카카오 공유에 실패했습니다.');
    } finally {
      setSharingKakao(false);
    }
  };

  const handlePdfShare = async () => {
    if (!meeting) return;

    setSharingPdf(true);
    try {
      const file = await generateMeetingPdfFile(meeting);
      const result = await shareFileOrDownload({
        file,
        title: meeting.title,
        text: `${meeting.title} 회의자료`,
      });
      notifyShareResult(result, 'PDF 파일을 내려받았습니다.');
    } catch {
      toast.error('PDF 공유에 실패했습니다.');
    } finally {
      setSharingPdf(false);
    }
  };

  const autoCreateDraftFromRecording = async (recording: MeetingRecording) => {
    if (!meeting) return;

    setTranscribingRecordingId(recording.id);
    setRecordings((prev) => prev.map((item) => (
      item.id === recording.id ? { ...item, status: 'TRANSCRIBING', errorMessage: null } : item
    )));

    try {
      const transcribedRecording = await transcribeMeetingRecording(recording.id);
      setRecordings((prev) => prev.map((item) => (
        item.id === transcribedRecording.id ? transcribedRecording : item
      )));
      toast.success('회의 녹음을 전사했습니다.');
    } catch (error) {
      const message = (error as Error).message;
      setRecordings((prev) => prev.map((item) => (
        item.id === recording.id ? { ...item, status: 'FAILED', errorMessage: message } : item
      )));
      toast.error('전사에 실패했습니다.', message);
      setTranscribingRecordingId(null);
      return;
    }

    setTranscribingRecordingId(null);
    setCreatingDraft(true);

    try {
      const result = await createMeetingMaterialDraft(meeting.id);
      setMaterialDrafts((prev) => [result.draft, ...prev]);
      setActiveDraftId(result.draft.id);
      toast.success('AI 회의자료 초안을 만들었습니다.', `녹음 ${result.recordingCount}개를 반영했습니다.`);
    } catch (error) {
      toast.error('AI 초안 생성에 실패했습니다.', (error as Error).message);
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleRecordingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!meeting || !file) return;

    setUploadingRecording(true);
    try {
      const recording = await uploadMeetingRecording(meeting.id, file);
      setRecordings((prev) => [recording, ...prev]);
      toast.success('녹음 파일을 업로드했습니다.');
      void autoCreateDraftFromRecording(recording);
    } catch (error) {
      toast.error('녹음 업로드에 실패했습니다.', (error as Error).message);
    } finally {
      setUploadingRecording(false);
    }
  };

  const handleStartBrowserRecording = async () => {
    if (!meeting) return;

    if (!canUseBrowserRecording) {
      toast.info('이 기기에서는 바로 녹음을 지원하지 않습니다.', '녹음 파일 업로드를 사용해주세요.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type });

        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        browserRecorderRef.current = null;
        setBrowserRecorder(null);
        setRecordingStartedAt(null);

        if (blob.size === 0) {
          setRecordingElapsedSeconds(0);
          toast.error('녹음 파일이 비어 있습니다.');
          return;
        }

        setUploadingRecording(true);
        try {
          const file = new File([blob], `meeting-${meeting.id}-${Date.now()}.${extension}`, { type });
          const recording = await uploadMeetingRecording(meeting.id, file);
          setRecordings((prev) => [recording, ...prev]);
          toast.success('회의 녹음을 저장했습니다.', '전사와 AI 초안을 바로 시작합니다.');
          void autoCreateDraftFromRecording(recording);
        } catch (error) {
          toast.error('녹음 저장에 실패했습니다.', (error as Error).message);
        } finally {
          setUploadingRecording(false);
          setRecordingElapsedSeconds(0);
        }
      };

      recorder.start(1000);
      browserRecorderRef.current = recorder;
      setBrowserRecorder(recorder);
      setRecordingStartedAt(Date.now());
      setRecordingElapsedSeconds(0);
      toast.success('녹음을 시작했습니다.');
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      toast.error('녹음을 시작하지 못했습니다.', (error as Error).message);
    }
  };

  const handleStopBrowserRecording = () => {
    const recorder = browserRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.stop();
  };

  const handleTranscribeRecording = async (recordingId: number) => {
    setTranscribingRecordingId(recordingId);
    setRecordings((prev) => prev.map((recording) => (
      recording.id === recordingId ? { ...recording, status: 'TRANSCRIBING', errorMessage: null } : recording
    )));

    try {
      const recording = await transcribeMeetingRecording(recordingId);
      setRecordings((prev) => prev.map((item) => (item.id === recording.id ? recording : item)));
      toast.success('회의 녹음을 전사했습니다.');
    } catch (error) {
      const message = (error as Error).message;
      setRecordings((prev) => prev.map((recording) => (
        recording.id === recordingId ? { ...recording, status: 'FAILED', errorMessage: message } : recording
      )));
      toast.error('전사에 실패했습니다.', message);
    } finally {
      setTranscribingRecordingId(null);
    }
  };

  const handleCreateDraft = async () => {
    if (!meeting) return;

    setCreatingDraft(true);
    setAppliedKakaoBrief(null);
    try {
      const result = await createMeetingMaterialDraft(meeting.id);
      setMaterialDrafts((prev) => [result.draft, ...prev]);
      setActiveDraftId(result.draft.id);
      toast.success('AI 회의자료 초안을 만들었습니다.', `녹음 ${result.recordingCount}개를 반영했습니다.`);
    } catch (error) {
      toast.error('AI 초안 생성에 실패했습니다.', (error as Error).message);
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleApplyDraft = async (draft: MeetingMaterialDraft) => {
    setApplyingDraftId(draft.id);
    try {
      const result = await applyMeetingMaterialDraft(draft.id, { replaceActionItems: false });

      useUIStore.setState({ viewingMeeting: result.meeting });
      useMeetingStore.setState((state) => ({
        meetings: state.meetings.map((item) => (
          item.id === result.meeting.id ? result.meeting : item
        )),
        currentMeeting: state.currentMeeting?.id === result.meeting.id ? result.meeting : state.currentMeeting,
      }));

      setMaterialDrafts((prev) => prev.map((item) => (item.id === result.draft.id ? result.draft : item)));
      setAppliedKakaoBrief(result.materials.kakaoBrief);
      toast.success('AI 초안을 회의자료에 적용했습니다.', `할 일 ${result.createdActionItemCount}개가 추가되었습니다.`);
    } catch (error) {
      toast.error('AI 초안 적용에 실패했습니다.', (error as Error).message);
    } finally {
      setApplyingDraftId(null);
    }
  };

  const handleDiscardDraft = async (draft: MeetingMaterialDraft) => {
    setDiscardingDraftId(draft.id);
    try {
      const updated = await discardMeetingMaterialDraft(draft.id);
      setMaterialDrafts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActiveDraftId((current) => (current === draft.id ? null : current));
      toast.success('AI 초안을 폐기했습니다.');
    } catch (error) {
      toast.error('AI 초안 폐기에 실패했습니다.', (error as Error).message);
    } finally {
      setDiscardingDraftId(null);
    }
  };

  const handleToggleActionItem = (actionItemId: number) => {
    setSelectedActionItemIds((current) => (
      current.includes(actionItemId)
        ? current.filter((id) => id !== actionItemId)
        : [...current, actionItemId]
    ));
  };

  const handleSelectAllActionItems = () => {
    setSelectedActionItemIds(convertibleActionItems.map((item) => item.id));
  };

  const handleUpdateActionItemTaskDraft = (
    actionItemId: number,
    patch: Partial<ActionItemTaskDraft>
  ) => {
    setActionItemTaskDrafts((current) => ({
      ...current,
      [actionItemId]: {
        ...(current[actionItemId] || { actionItemId }),
        ...patch,
      } as ActionItemTaskDraft,
    }));
  };

  const handleCreateTasksFromActionItems = async () => {
    if (!meeting || selectedActionItemIds.length === 0) return;

    const overrides = selectedActionItemIds.map((actionItemId) => actionItemTaskDrafts[actionItemId]).filter(Boolean);
    const emptyTitle = overrides.find((draft) => !draft.title.trim());

    if (emptyTitle) {
      toast.error('업무 제목을 확인해주세요.', '선택한 업무 후보의 제목은 비워둘 수 없습니다.');
      return;
    }

    setCreatingTasksFromActionItems(true);
    try {
      const result = await createTasksFromMeetingActionItems(meeting.id, selectedActionItemIds, overrides.map((draft) => ({
        actionItemId: draft.actionItemId,
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
        assigneeId: draft.assigneeId || null,
        dueDate: draft.dueDate || null,
      })));

      useUIStore.setState({ viewingMeeting: result.meeting });
      useMeetingStore.setState((state) => ({
        meetings: state.meetings.map((item) => (
          item.id === result.meeting.id ? result.meeting : item
        )),
        currentMeeting: state.currentMeeting?.id === result.meeting.id ? result.meeting : state.currentMeeting,
      }));
      useTaskStore.setState((state) => {
        const createdTaskIds = new Set(result.tasks.map((task) => task.id));
        return {
          tasks: [...state.tasks.filter((task) => !createdTaskIds.has(task.id)), ...result.tasks],
        };
      });
      setSelectedActionItemIds([]);
      setActionItemTaskDrafts((current) => {
        const next = { ...current };
        result.convertedActionItemIds.forEach((id) => delete next[id]);
        return next;
      });
      setCreatedTasksForShare(result.tasks);
      toast.success('회의 할 일을 업무로 만들었습니다.', `${result.tasks.length}개 업무가 추가되었습니다.`);
    } catch (error) {
      toast.error('업무 생성에 실패했습니다.', (error as Error).message);
    } finally {
      setCreatingTasksFromActionItems(false);
    }
  };

  const handleShareCreatedTasks = async () => {
    if (!createdTasksForShare.length) return;

    setSharingCreatedTasks(true);
    try {
      const result = await shareTaskBundle(createdTasksForShare, {
        title: 'INTRUTH 회의 후속 업무',
        context: `[${meeting?.title || '회의'} 후속 업무]`,
      });
      notifyShareResult(result);
    } catch {
      toast.error('생성 업무 공유에 실패했습니다.');
    } finally {
      setSharingCreatedTasks(false);
    }
  };

  if (!isMeetingDetailModalOpen || !meeting) return null;

  const meetingDate = parseISO(meeting.meetingDate);

  return (
    <AnimatePresence>
      {isMeetingDetailModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            className="relative h-full w-full max-w-4xl overflow-hidden border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-slate-700 sm:p-6">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-foreground">{meeting.title}</h2>
                      {meeting.status === 'DRAFT' && (
                        <span className="shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                          임시저장
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(meetingDate, 'yyyy년 M월 d일 (EEE) HH:mm', { locale: ko })}
                      </span>
                      {meeting.team && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {meeting.team.name}
                        </span>
                      )}
                      {meeting.project && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {meeting.project.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="수정"
                      aria-label="수정"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="삭제"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg p-2 transition-colors hover:bg-muted"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-190px)] overflow-y-auto sm:max-h-[calc(90vh-200px)]">
              <div className="space-y-6 p-4 pb-28 sm:p-6">
                <section className="flex flex-wrap items-start gap-6">
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">작성자</p>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                        {meeting.author.avatarUrl ? (
                          <img
                            src={meeting.author.avatarUrl}
                            alt={meeting.author.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          meeting.author.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{meeting.author.name}</p>
                        {meeting.author.position && (
                          <p className="text-xs text-muted-foreground">{meeting.author.position}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {meeting.attendees.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        참석자 {meeting.attendees.length}명
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {meeting.attendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center gap-2 rounded-full bg-muted px-2 py-1">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                              {attendee.member.avatarUrl ? (
                                <img
                                  src={attendee.member.avatarUrl}
                                  alt={attendee.member.name}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                attendee.member.name.charAt(0)
                              )}
                            </div>
                            <span className="text-sm text-foreground">{attendee.member.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">회의 내용</h3>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div
                      className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: (meeting.content || '').replace(/\n/g, '<br />') }}
                    />
                  </div>
                </section>

                {meeting.summary && (
                  <section>
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground">요약 / 결정사항</h3>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="whitespace-pre-wrap text-foreground">{meeting.summary}</p>
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Mic className="h-4 w-4" />
                        AI 회의 녹음
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasTranscribedRecording ? '전사 완료된 녹음이 있습니다.' : '전사 완료 후 AI 초안을 만들 수 있습니다.'}
                      </p>
                    </div>
                    <input
                      ref={recordingInputRef}
                      type="file"
                      accept="audio/*,video/mp4"
                      className="hidden"
                      onChange={(event) => void handleRecordingUpload(event)}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => (isBrowserRecording ? handleStopBrowserRecording() : void handleStartBrowserRecording())}
                        disabled={!aiServerEnabled || uploadingRecording || !canUseBrowserRecording}
                        className={cn(
                          'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60',
                          isBrowserRecording
                            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border border-border bg-card text-foreground hover:bg-muted'
                        )}
                      >
                        {uploadingRecording ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                        {isBrowserRecording ? `녹음 종료 ${formatElapsedSeconds(recordingElapsedSeconds)}` : '바로 녹음'}
                      </button>
                      <button
                        type="button"
                        onClick={() => recordingInputRef.current?.click()}
                        disabled={!aiServerEnabled || uploadingRecording}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        {uploadingRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        녹음 업로드
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateDraft()}
                        disabled={!aiServerEnabled || !hasTranscribedRecording || creatingDraft}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {creatingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI 초안 만들기
                      </button>
                    </div>
                  </div>

                  {!canUseBrowserRecording && aiServerEnabled && (
                    <p className="text-xs text-muted-foreground">
                      이 기기에서는 바로 녹음을 지원하지 않아 녹음 파일 업로드를 사용할 수 있습니다.
                    </p>
                  )}

                  {!aiServerEnabled ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Mock 모드에서는 AI 녹음 기능을 사용할 수 없습니다.
                    </div>
                  ) : recordingsLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      녹음 목록을 불러오는 중...
                    </div>
                  ) : recordings.length > 0 ? (
                    <div className="space-y-3">
                      {recordings.map((recording) => {
                        const transcriptPreview = getTranscriptPreview(recording);
                        const canTranscribe = recording.status === 'UPLOADED' || recording.status === 'FAILED';

                        return (
                          <article key={recording.id} className="rounded-lg border border-border bg-muted/30 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-foreground">{recording.fileName}</p>
                                  <span className={cn('aboard-badge text-[10px]', recordingStatusClass[recording.status])}>
                                    {recordingStatusLabel[recording.status]}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatFileSize(recording.fileSize)} · {format(parseISO(recording.createdAt), 'M/d HH:mm')}
                                </p>
                                {recording.errorMessage && (
                                  <p className="mt-2 text-xs text-amber-600">{recording.errorMessage}</p>
                                )}
                              </div>
                              {canTranscribe && (
                                <button
                                  type="button"
                                  onClick={() => void handleTranscribeRecording(recording.id)}
                                  disabled={transcribingRecordingId === recording.id}
                                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                                >
                                  {transcribingRecordingId === recording.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  전사하기
                                </button>
                              )}
                            </div>

                            {recording.status === 'TRANSCRIBED' && transcriptPreview && (
                              <div className="mt-3 rounded-lg border border-border bg-card p-3">
                                <p className="mb-2 text-xs font-semibold text-muted-foreground">전사 결과</p>
                                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-foreground">
                                  {transcriptPreview}
                                </p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleStartBrowserRecording()}
                        disabled={!canUseBrowserRecording || uploadingRecording}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card p-4 text-left transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        <Mic className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">지금 바로 녹음</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => recordingInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                      >
                        <UploadCloud className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">녹음 파일 업로드</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          AI 회의자료 초안
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          적용 전 검토가 필요한 초안 {materialDrafts.filter((draft) => draft.status === 'DRAFT').length}개
                        </p>
                      </div>
                      {draftsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>

                    {materialDrafts.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {materialDrafts.map((draft) => (
                          <button
                            key={draft.id}
                            type="button"
                            onClick={() => setActiveDraftId(draft.id)}
                            className={cn(
                              'min-h-10 shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                              openDraft?.id === draft.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <span className="font-semibold">#{draft.id}</span>
                            <span className="ml-2">{draftStatusLabel[draft.status]}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {openDraft ? (
                      <article className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-semibold text-foreground">{openDraft.materials.title}</h4>
                              <span className={cn('aboard-badge text-[10px]', draftStatusClass[openDraft.status])}>
                                {draftStatusLabel[openDraft.status]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              녹음 {openDraft.sourceRecordingCount}개 반영 · {format(parseISO(openDraft.createdAt), 'M/d HH:mm')}
                            </p>
                          </div>
                          {openDraft.status === 'DRAFT' && (
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                              <button
                                type="button"
                                onClick={() => void handleDiscardDraft(openDraft)}
                                disabled={discardingDraftId === openDraft.id || applyingDraftId === openDraft.id}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                              >
                                {discardingDraftId === openDraft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                폐기
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleApplyDraft(openDraft)}
                                disabled={applyingDraftId === openDraft.id || discardingDraftId === openDraft.id}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                              >
                                {applyingDraftId === openDraft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                적용
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg bg-card p-3">
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">요약</p>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{openDraft.materials.summary}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-card p-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">결정사항</p>
                            {openDraft.materials.decisions.length ? (
                              <ul className="space-y-2 text-sm text-foreground">
                                {openDraft.materials.decisions.map((item, index) => (
                                  <li key={`${item}-${index}`} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">결정사항 없음</p>
                            )}
                          </div>

                          <div className="rounded-lg bg-card p-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">후속 질문</p>
                            {openDraft.materials.followUpQuestions.length ? (
                              <ul className="space-y-2 text-sm text-foreground">
                                {openDraft.materials.followUpQuestions.map((item, index) => (
                                  <li key={`${item}-${index}`} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">추가 확인 없음</p>
                            )}
                          </div>
                        </div>

                        {openDraft.materials.actionItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">할 일 제안</p>
                            {openDraft.materials.actionItems.map((item, index) => (
                              <div key={`${item.title}-${index}`} className="rounded-lg border border-border bg-card p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">{item.title}</p>
                                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {priorityLabel[item.priority]}
                                  </span>
                                  {item.dueDate && (
                                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600">
                                      {item.dueDate}
                                    </span>
                                  )}
                                </div>
                                {item.ownerName && (
                                  <p className="mt-1 text-xs text-muted-foreground">담당 제안: {item.ownerName}</p>
                                )}
                                {item.description && (
                                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{item.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {openDraft.materials.risks.length > 0 && (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-4 w-4" />
                              주의할 점
                            </p>
                            <ul className="space-y-1 text-sm text-foreground">
                              {openDraft.materials.risks.map((risk, index) => (
                                <li key={`${risk}-${index}`}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="rounded-lg bg-card p-3">
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">카카오 공유문</p>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{openDraft.materials.kakaoBrief}</p>
                        </div>
                      </article>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                        아직 검토할 AI 초안이 없습니다.
                      </div>
                    )}

                    {appliedKakaoBrief && (
                      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-300">
                          <Sparkles className="h-4 w-4" />
                          적용된 카카오 공유문
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{appliedKakaoBrief}</p>
                      </div>
                    )}
                  </div>
                </section>

                {meetingActionItems.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <CheckSquare className="h-4 w-4" />
                          회의 할 일 업무화
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          생성 가능 {convertibleActionItems.length}개 · 업무 연결 완료 {convertedActionItemCount}개
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <button
                          type="button"
                          onClick={handleSelectAllActionItems}
                          disabled={convertibleActionItems.length === 0}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                        >
                          전체 선택
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCreateTasksFromActionItems()}
                          disabled={
                            !canEdit ||
                            !meeting.projectId ||
                            selectedActionItemIds.length === 0 ||
                            creatingTasksFromActionItems
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {creatingTasksFromActionItems ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckSquare className="h-4 w-4" />
                          )}
                          업무 생성
                        </button>
                      </div>
                    </div>

                    {!meeting.projectId && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                        업무로 만들려면 이 회의자료에 프로젝트를 먼저 연결해야 합니다.
                      </div>
                    )}

                    <div className="space-y-2">
                      {meetingActionItems.map((item) => {
                        const isConverted = Boolean(item.taskId);
                        const isSelected = selectedActionItemIds.includes(item.id);
                        const draft = actionItemTaskDrafts[item.id] || createTaskDraftFromActionItem(item);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'rounded-lg border border-border bg-card p-3 transition-colors',
                              isConverted ? 'opacity-70' : 'hover:border-primary/40',
                              !isConverted && isSelected && 'border-primary bg-primary/5'
                            )}
                          >
                            <div className="flex gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isConverted || !canEdit || !meeting.projectId}
                                onChange={() => handleToggleActionItem(item.id)}
                                className="mt-1 h-5 w-5 shrink-0 rounded border-border text-primary focus:ring-primary"
                                aria-label={`${item.title} 업무 생성 선택`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-foreground">{item.title}</span>
                                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {priorityLabel[item.priority]}
                                  </span>
                                  {item.dueDate && (
                                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600">
                                      {format(parseISO(item.dueDate), 'M/d')}
                                    </span>
                                  )}
                                  {isConverted && (
                                    <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] text-green-700 dark:text-green-300">
                                      업무 생성됨
                                    </span>
                                  )}
                                  {isSelected && !isConverted && (
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                                      편집 가능
                                    </span>
                                  )}
                                </div>
                                {item.assignee && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    담당자: {item.assignee.name}
                                  </div>
                                )}
                                {item.description && (
                                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isSelected && !isConverted && (
                              <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
                                <label className="block text-xs font-semibold text-muted-foreground">
                                  업무 제목
                                  <input
                                    type="text"
                                    value={draft.title}
                                    onChange={(event) => handleUpdateActionItemTaskDraft(item.id, { title: event.target.value })}
                                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary"
                                  />
                                </label>

                                <label className="block text-xs font-semibold text-muted-foreground">
                                  설명
                                  <textarea
                                    value={draft.description}
                                    onChange={(event) => handleUpdateActionItemTaskDraft(item.id, { description: event.target.value })}
                                    rows={3}
                                    className="mt-1 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-primary"
                                  />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block text-xs font-semibold text-muted-foreground">
                                    담당자
                                    <select
                                      value={draft.assigneeId}
                                      onChange={(event) => handleUpdateActionItemTaskDraft(item.id, { assigneeId: event.target.value })}
                                      className="mt-1 min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                                    >
                                      <option value="">미지정</option>
                                      {taskDraftAssigneeOptions.map((member) => (
                                        <option key={member.id} value={member.id}>
                                          {member.name}{member.position ? ` · ${member.position}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block text-xs font-semibold text-muted-foreground">
                                    마감일
                                    <input
                                      type="date"
                                      value={draft.dueDate}
                                      onChange={(event) => handleUpdateActionItemTaskDraft(item.id, { dueDate: event.target.value })}
                                      className="mt-1 min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                                    />
                                  </label>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold text-muted-foreground">우선순위</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {priorityOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleUpdateActionItemTaskDraft(item.id, { priority: option.value })}
                                        className={cn(
                                          'min-h-9 rounded-lg border px-2 text-xs font-semibold transition-colors',
                                          draft.priority === option.value
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                        )}
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {createdTasksForShare.length > 0 && (
                      <div className="flex flex-col gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            생성된 업무 {createdTasksForShare.length}개
                          </p>
                          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                            {createdTasksForShare.map((task) => task.title).slice(0, 2).join(', ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleShareCreatedTasks()}
                          disabled={sharingCreatedTasks}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {sharingCreatedTasks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                          카카오 공유
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {meeting.attachments && meeting.attachments.length > 0 && (
                  <section>
                    <h3 className="mb-3 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      첨부파일 {meeting.attachments.length}개
                    </h3>
                    <div className="space-y-2">
                      {meeting.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={attachment.fileName}
                          className="group flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:border-primary/50"
                        >
                          <div className="flex items-center gap-3">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-foreground transition-colors group-hover:text-primary">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                            </div>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="mb-3 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    댓글 {meeting.comments?.length || 0}개
                  </h3>

                  <form onSubmit={handleAddComment} className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentContent}
                        onChange={(event) => setCommentContent(event.target.value)}
                        placeholder="댓글을 입력하세요"
                        className="aboard-input flex-1"
                      />
                      <button
                        type="submit"
                        disabled={!commentContent.trim() || submittingComment}
                        className="rounded-lg bg-primary/20 px-4 py-2 text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
                        aria-label="댓글 작성"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  {meeting.comments && meeting.comments.length > 0 ? (
                    <div className="space-y-3">
                      {meeting.comments.map((comment) => (
                        <article key={comment.id} className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-start justify-between">
                            <div className="mb-2 flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                {comment.author.avatarUrl ? (
                                  <img
                                    src={comment.author.avatarUrl}
                                    alt={comment.author.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  comment.author.name.charAt(0)
                                )}
                              </div>
                              <span className="text-sm font-medium text-foreground">{comment.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(comment.createdAt), 'M/d HH:mm')}
                              </span>
                            </div>
                            {(comment.authorId === user?.id || user?.userRole === 'admin') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                                aria-label="댓글 삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="ml-8 text-sm text-foreground">{comment.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-muted-foreground">아직 댓글이 없습니다.</p>
                  )}
                </section>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => void handleKakaoShare()}
                  disabled={sharingKakao || sharingPdf}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f2da00] disabled:opacity-60"
                >
                  {sharingKakao ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  카카오 공유
                </button>
                <button
                  type="button"
                  onClick={() => void handlePdfShare()}
                  disabled={sharingKakao || sharingPdf}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {sharingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  PDF 공유
                </button>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-11 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
