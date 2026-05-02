import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Users, Check, Calendar, Paperclip, Trash2, Upload } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useMeetingStore } from '@/stores/meetingStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMemberStore } from '@/stores/memberStore';
import { useTeamStore } from '@/stores/teamStore';
import { useUIStore } from '@/stores/uiStore';
import type { MeetingStatus } from '@/types';

type TabType = 'basic' | 'content' | 'attachments';

export function MeetingFormModal() {
  const { isMeetingModalOpen, editingMeeting, closeMeetingModal } = useUIStore();
  const { addMeeting, updateMeeting, uploadAttachments, deleteAttachment } = useMeetingStore();
  const { projects } = useProjectStore();
  const { members } = useMemberStore();
  const { teams, fetchTeams } = useTeamStore();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    title: '',
    meetingDate: '',
    teamId: '',
    projectId: '',
    content: '',
    summary: '',
    attendeeIds: [] as string[],
    status: 'DRAFT' as MeetingStatus,
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);

  const isEditing = !!editingMeeting;

  useEffect(() => {
    if (editingMeeting) {
      setFormData({
        title: editingMeeting.title,
        meetingDate: editingMeeting.meetingDate.slice(0, 16), // datetime-local format
        teamId: editingMeeting.teamId || '',
        projectId: editingMeeting.projectId || '',
        content: editingMeeting.content,
        summary: editingMeeting.summary || '',
        attendeeIds: editingMeeting.attendees.map(a => a.memberId),
        status: editingMeeting.status,
      });
      setPendingFiles([]);
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setFormData({
        title: '',
        meetingDate: now.toISOString().slice(0, 16),
        teamId: '',
        projectId: '',
        content: '',
        summary: '',
        attendeeIds: [],
        status: 'DRAFT',
      });
      setPendingFiles([]);
    }
    setActiveTab('basic');
    setError(null);
  }, [editingMeeting, isMeetingModalOpen]);

  useEffect(() => {
    if (isMeetingModalOpen) {
      void fetchTeams();
    }
  }, [fetchTeams, isMeetingModalOpen]);

  const toggleAttendee = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(memberId)
        ? prev.attendeeIds.filter(id => id !== memberId)
        : [...prev.attendeeIds, memberId]
    }));
  };

  const removeAttendee = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.filter(id => id !== memberId)
    }));
  };

  const selectedAttendees = members.filter(m => formData.attendeeIds.includes(m.id));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId: number) => {
    if (!editingMeeting) return;
    try {
      await deleteAttachment(editingMeeting.id, attachmentId);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: MeetingStatus = formData.status) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('회의 제목을 입력해주세요.');
      setActiveTab('basic');
      return;
    }

    if (!formData.meetingDate) {
      setError('회의 일시를 선택해주세요.');
      setActiveTab('basic');
      return;
    }

    if (!formData.content.trim()) {
      setError('회의 내용을 입력해주세요.');
      setActiveTab('content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const meetingData = {
        title: formData.title.trim(),
        meetingDate: new Date(formData.meetingDate).toISOString(),
        teamId: formData.teamId || undefined,
        projectId: formData.projectId || undefined,
        content: formData.content,
        summary: formData.summary.trim() || undefined,
        attendeeIds: formData.attendeeIds,
        status,
      };

      if (isEditing && editingMeeting) {
        await updateMeeting(editingMeeting.id, meetingData);

        // 새 파일 업로드
        if (pendingFiles.length > 0) {
          await uploadAttachments(editingMeeting.id, pendingFiles);
        }
      } else {
        const newMeeting = await addMeeting(meetingData);

        // 새 파일 업로드
        if (pendingFiles.length > 0) {
          await uploadAttachments(newMeeting.id, pendingFiles);
        }
      }

      closeMeetingModal();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeMeetingModal();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isMeetingModalOpen) return null;

  return (
    <AnimatePresence>
      {isMeetingModalOpen && (
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isEditing ? '회의자료 수정' : '새 회의자료'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700">
              {[
                { id: 'basic', label: '기본 정보', icon: Calendar },
                { id: 'content', label: '회의 내용', icon: FileText },
                { id: 'attachments', label: '첨부파일', icon: Paperclip },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <form onSubmit={(e) => handleSubmit(e)} className="overflow-y-auto max-h-[60vh]">
              <div className="p-6 space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    {/* 제목 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        회의 제목 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="회의 제목을 입력하세요"
                        className="aboard-input"
                        autoFocus
                      />
                    </div>

                    {/* 일시 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        회의 일시 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.meetingDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, meetingDate: e.target.value }))}
                        className="aboard-input"
                      />
                    </div>

                    {/* 팀 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">팀</label>
                      <select
                        value={formData.teamId}
                        onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                        className="aboard-input"
                      >
                        <option value="">팀 선택 (선택사항)</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 프로젝트 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">관련 프로젝트</label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                        className="aboard-input"
                      >
                        <option value="">프로젝트 선택 (선택사항)</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 참석자 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">참석자</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAttendeeDropdown(!showAttendeeDropdown)}
                          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-left flex items-center justify-between focus:outline-none focus:border-primary/50"
                        >
                          <span className="text-muted-foreground">
                            {selectedAttendees.length > 0
                              ? `${selectedAttendees.length}명 선택됨`
                              : '참석자 선택'}
                          </span>
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </button>

                        {showAttendeeDropdown && (
                          <div className="absolute z-10 w-full mt-2 py-2 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {members.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => toggleAttendee(member.id)}
                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted transition-colors"
                              >
                                <div className={cn(
                                  'w-5 h-5 rounded border flex items-center justify-center',
                      formData.attendeeIds.includes(member.id)
                                    ? 'bg-primary border-primary'
                                    : 'border-border'
                                )}>
                      {formData.attendeeIds.includes(member.id) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                                    {member.avatarUrl ? (
                                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      member.name.charAt(0)
                                    )}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm text-foreground">{member.name}</p>
                                    {member.position && (
                                      <p className="text-xs text-muted-foreground">{member.position}</p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 선택된 참석자 표시 */}
                      {selectedAttendees.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedAttendees.map((attendee) => (
                            <span
                              key={attendee.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                            >
                              {attendee.name}
                              <button
                                type="button"
                                onClick={() => removeAttendee(attendee.id)}
                                className="hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div className="space-y-4">
                    {/* 회의 내용 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        회의 내용 <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="회의 내용을 작성하세요..."
                        rows={12}
                        className="aboard-input resize-none"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        * 추후 리치 에디터(WYSIWYG)로 업그레이드 예정
                      </p>
                    </div>

                    {/* 결정사항/요약 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">결정사항 / 요약</label>
                      <textarea
                        value={formData.summary}
                        onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                        placeholder="주요 결정사항이나 요약을 입력하세요..."
                        rows={4}
                        className="aboard-input resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Attachments Tab */}
                {activeTab === 'attachments' && (
                  <div className="space-y-4">
                    {/* 파일 업로드 영역 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">첨부파일</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">클릭하여 파일 선택</p>
                          <p className="text-xs text-muted-foreground mt-1">최대 10MB</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* 대기 중인 파일 */}
                    {pendingFiles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">업로드 대기 중</p>
                        <div className="space-y-2">
                          {pendingFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-foreground">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePendingFile(index)}
                                className="p-1 hover:bg-destructive/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 기존 첨부파일 (수정 모드) */}
                    {isEditing && editingMeeting?.attachments && editingMeeting.attachments.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">기존 첨부파일</p>
                        <div className="space-y-2">
                          {editingMeeting.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-foreground">{attachment.fileName}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingAttachment(attachment.id)}
                                className="p-1 hover:bg-destructive/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <button
                  type="button"
                  onClick={handleClose}
                  className="aboard-btn-secondary"
                  disabled={loading}
                >
                  취소
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'DRAFT')}
                    disabled={loading}
                    className="aboard-btn-secondary disabled:opacity-50"
                  >
                    임시저장
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                    disabled={loading}
                    className="aboard-btn-primary disabled:opacity-50"
                  >
                    {loading ? '저장 중...' : isEditing ? '수정' : '게시'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
