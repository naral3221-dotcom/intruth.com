import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Calendar,
  MapPin,
  Users,
  Paperclip,
  MessageSquare,
  Edit,
  Trash2,
  Download,
  Send,
  MessageCircle,
  FileDown,
  Loader2,
  Mic,
  UploadCloud,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMeetingStore } from '@/stores/meetingStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { cn } from '@/core/utils/cn';
import { shareMeeting } from '@/shared/share/entityShare';
import { generateMeetingPdfFile } from '@/shared/share/meetingPdf';
import { shareFileOrDownload } from '@/shared/share/nativeFileShare';
import {
  listMeetingRecordings,
  transcribeMeetingRecording,
  uploadMeetingRecording,
} from '@/shared/ai/meetingRecordingApi';
import type { MeetingRecording } from '@/types';
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

export function MeetingDetailModal() {
  const { isMeetingDetailModalOpen, viewingMeeting, closeMeetingDetailModal, openEditMeetingModal, openConfirmModal } = useUIStore();
  const { deleteMeeting, addComment, deleteComment } = useMeetingStore();
  const { user } = useAuthStore();

  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [transcribingRecordingId, setTranscribingRecordingId] = useState<number | null>(null);
  const recordingInputRef = useRef<HTMLInputElement>(null);

  const meeting = viewingMeeting;
  const aiServerEnabled = import.meta.env.VITE_USE_MOCK !== 'true';

  useEffect(() => {
    if (!isMeetingDetailModalOpen || !meeting || !aiServerEnabled) {
      setRecordings([]);
      return;
    }

    let cancelled = false;
    setRecordingsLoading(true);

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

    return () => {
      cancelled = true;
    };
  }, [aiServerEnabled, isMeetingDetailModalOpen, meeting]);

  const handleClose = () => {
    closeMeetingDetailModal();
    setCommentContent('');
  };

  const handleEdit = () => {
    if (meeting) {
      closeMeetingDetailModal();
      openEditMeetingModal(meeting);
    }
  };

  const handleDelete = () => {
    if (!meeting) return;

    openConfirmModal({
      title: '회의자료 삭제',
      message: `"${meeting.title}" 회의자료를 삭제하시겠습니까?\n삭제된 회의자료는 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'danger',
      onConfirm: async () => {
        await deleteMeeting(Number(meeting.id));
        handleClose();
      },
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting || !commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(Number(meeting.id), commentContent.trim());
      setCommentContent('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (!meeting) return;

    openConfirmModal({
      title: '댓글 삭제',
      message: '이 댓글을 삭제하시겠습니까?',
      confirmText: '삭제',
      variant: 'danger',
      onConfirm: async () => {
        await deleteComment(Number(meeting.id), commentId);
      },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canEdit = meeting && (meeting.authorId === Number(user?.id) || user?.userRole === 'admin');

  if (!isMeetingDetailModalOpen || !meeting) return null;

  const meetingDate = parseISO(meeting.meetingDate);

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

  const handleRecordingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!meeting || !file) return;

    setUploadingRecording(true);
    try {
      const recording = await uploadMeetingRecording(meeting.id, file);
      setRecordings((prev) => [recording, ...prev]);
      toast.success('녹음 파일을 업로드했습니다.');
    } catch (error) {
      toast.error('녹음 업로드에 실패했습니다.', (error as Error).message);
    } finally {
      setUploadingRecording(false);
    }
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

  return (
    <AnimatePresence>
      {isMeetingDetailModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative h-full w-full max-w-4xl overflow-hidden border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-slate-700 sm:p-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground truncate">
                      {meeting.title}
                    </h2>
                    {meeting.status === 'DRAFT' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                        임시저장
                      </span>
                    )}
                  </div>
                </div>

                {/* 기본 정보 */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(meetingDate, 'yyyy년 M월 d일 (EEE) HH:mm', { locale: ko })}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {meeting.location}
                    </span>
                  )}
                  {meeting.project && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      {meeting.project.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {canEdit && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="수정"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(100vh-190px)] sm:max-h-[calc(90vh-200px)]">
              <div className="p-4 space-y-6 sm:p-6">
                {/* 작성자 & 참석자 */}
                <div className="flex flex-wrap items-start gap-6">
                  {/* 작성자 */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">작성자</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {meeting.author.avatarUrl ? (
                          <img
                            src={meeting.author.avatarUrl}
                            alt={meeting.author.name}
                            className="w-full h-full rounded-full object-cover"
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

                  {/* 참석자 */}
                  {meeting.attendees.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        참석자 ({meeting.attendees.length}명)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {meeting.attendees.map((attendee) => (
                          <div
                            key={attendee.id}
                            className="flex items-center gap-2 px-2 py-1 bg-muted rounded-full"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                              {attendee.member.avatarUrl ? (
                                <img
                                  src={attendee.member.avatarUrl}
                                  alt={attendee.member.name}
                                  className="w-full h-full rounded-full object-cover"
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
                </div>

                {/* 회의 내용 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">회의 내용</h3>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: meeting.content.replace(/\n/g, '<br />') }}
                    />
                  </div>
                </div>

                {/* 결정사항/요약 */}
                {meeting.summary && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">결정사항 / 요약</h3>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-foreground whitespace-pre-wrap">{meeting.summary}</p>
                    </div>
                  </div>
                )}

                {/* AI 회의 녹음 */}
                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Mic className="h-4 w-4" />
                        AI 회의 녹음
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        녹음 파일을 업로드하면 서버에서 보관하고, OpenAI 키가 설정된 환경에서 전사할 수 있습니다.
                      </p>
                    </div>
                    <input
                      ref={recordingInputRef}
                      type="file"
                      accept="audio/*,video/mp4"
                      className="hidden"
                      onChange={(event) => void handleRecordingUpload(event)}
                    />
                    <button
                      type="button"
                      onClick={() => recordingInputRef.current?.click()}
                      disabled={!aiServerEnabled || uploadingRecording}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {uploadingRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      녹음 업로드
                    </button>
                  </div>

                  {!aiServerEnabled ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      현재 Mock 모드입니다. 서버 모드에서 녹음 업로드와 전사를 사용할 수 있습니다.
                    </div>
                  ) : recordingsLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      녹음 목록을 불러오는 중...
                    </div>
                  ) : recordings.length > 0 ? (
                    <div className="space-y-3">
                      {recordings.map((recording) => {
                        const transcriptPreview = recording.segments?.length
                          ? recording.segments.map((segment) => (
                              `${segment.speaker ? `${segment.speaker}: ` : ''}${segment.text}`
                            )).join('\n')
                          : recording.transcriptText;
                        const canTranscribe = recording.status === 'UPLOADED' || recording.status === 'FAILED';

                        return (
                          <div key={recording.id} className="rounded-lg border border-border bg-muted/30 p-4">
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
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => recordingInputRef.current?.click()}
                      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                    >
                      <UploadCloud className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">회의 녹음을 업로드해 전사 준비하기</span>
                    </button>
                  )}
                </div>

                {/* 첨부파일 */}
                {meeting.attachments && meeting.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
                      <Paperclip className="w-4 h-4" />
                      첨부파일 ({meeting.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {meeting.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={attachment.fileName}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-foreground group-hover:text-primary transition-colors">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 댓글 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    댓글 ({meeting.comments?.length || 0})
                  </h3>

                  {/* 댓글 입력 */}
                  <form onSubmit={handleAddComment} className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="댓글을 입력하세요..."
                        className="aboard-input flex-1"
                      />
                      <button
                        type="submit"
                        disabled={!commentContent.trim() || submittingComment}
                        className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  {/* 댓글 목록 */}
                  {meeting.comments && meeting.comments.length > 0 ? (
                    <div className="space-y-3">
                      {meeting.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 bg-muted/30 rounded-lg border border-border"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                                {comment.author.avatarUrl ? (
                                  <img
                                    src={comment.author.avatarUrl}
                                    alt={comment.author.name}
                                    className="w-full h-full rounded-full object-cover"
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
                            {(comment.authorId === Number(user?.id) || user?.userRole === 'admin') && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-foreground ml-8">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">아직 댓글이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 p-4 border-t border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  onClick={() => void handleKakaoShare()}
                  disabled={sharingKakao || sharingPdf}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f2da00] disabled:opacity-60"
                >
                  {sharingKakao ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  카카오 공유
                </button>
                <button
                  onClick={() => void handlePdfShare()}
                  disabled={sharingKakao || sharingPdf}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {sharingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  PDF 공유
                </button>
              </div>
              <button
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
