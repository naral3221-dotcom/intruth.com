import { useState } from 'react';
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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMeetingStore } from '@/stores/meetingStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

export function MeetingDetailModal() {
  const { isMeetingDetailModalOpen, viewingMeeting, closeMeetingDetailModal, openEditMeetingModal, openConfirmModal } = useUIStore();
  const { deleteMeeting, addComment, deleteComment } = useMeetingStore();
  const { user } = useAuthStore();

  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const meeting = viewingMeeting;

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
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-slate-700">
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
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6 space-y-6">
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
            <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <button
                onClick={handleClose}
                className="aboard-btn-secondary"
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
