/**
 * MeetingFormModal - 회의자료 작성/수정 모달 (고도화 버전)
 * 5탭 구조: 기본 정보, 안건, 회의 내용, 액션 아이템, 첨부파일
 * PC/모바일 반응형 지원
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Calendar,
  ListTodo,
  Target,
  Paperclip,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useMeetingStore } from '@/stores/meetingStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMemberStore } from '@/stores/memberStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import type { MeetingStatus, CreateAgendaInput, CreateActionItemInput } from '@/types';

import { BasicInfoStep } from './steps/BasicInfoStep';
import { AgendaStep } from './steps/AgendaStep';
import { ContentStep } from './steps/ContentStep';
import { ActionItemStep } from './steps/ActionItemStep';
import { AttachmentStep } from './steps/AttachmentStep';

// 탭 타입 정의
type TabType = 'basic' | 'agenda' | 'content' | 'actions' | 'attachments';

interface TabConfig {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'basic', label: '기본 정보', shortLabel: '기본', icon: Calendar, required: true },
  { id: 'agenda', label: '안건', shortLabel: '안건', icon: ListTodo },
  { id: 'content', label: '회의 내용', shortLabel: '내용', icon: FileText, required: true },
  { id: 'actions', label: '액션 아이템', shortLabel: '액션', icon: Target },
  { id: 'attachments', label: '첨부파일', shortLabel: '첨부', icon: Paperclip },
];

// 로컬 안건 타입
interface LocalAgenda extends CreateAgendaInput {
  id: string;
  status?: 'PENDING' | 'DISCUSSED' | 'SKIPPED';
}

// 로컬 액션 아이템 타입
interface LocalActionItem extends CreateActionItemInput {
  id: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export function MeetingFormModal() {
  const { isMeetingModalOpen, editingMeeting, closeMeetingModal } = useUIStore();
  const { addMeeting, updateMeeting, uploadAttachments, deleteAttachment } = useMeetingStore();
  const { projects } = useProjectStore();
  const { members } = useMemberStore();
  const { teams, teamMembers, fetchTeams, fetchTeamMembers } = useTeamStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    title: '',
    meetingDate: '',
    teamId: '',
    projectId: '',
    content: '',
    contentType: 'text' as 'text' | 'json',
    summary: '',
    attendeeIds: [] as string[],
    status: 'DRAFT' as MeetingStatus,
  });
  const [agendas, setAgendas] = useState<LocalAgenda[]>([]);
  const [actionItems, setActionItems] = useState<LocalActionItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingMeeting;

  // 폼 초기화
  useEffect(() => {
    if (editingMeeting) {
      setFormData({
        title: editingMeeting.title,
        meetingDate: editingMeeting.meetingDate.slice(0, 16),
        teamId: editingMeeting.teamId || '',
        projectId: editingMeeting.projectId || '',
        content: editingMeeting.content,
        contentType: editingMeeting.contentType || 'text',
        summary: editingMeeting.summary || '',
        attendeeIds: editingMeeting.attendees.map(a => a.memberId),
        status: editingMeeting.status,
      });
      // 기존 안건과 액션 아이템 로드
      if (editingMeeting.agendas) {
        setAgendas(editingMeeting.agendas.map(a => ({
          ...a,
          id: String(a.id),
        })));
      }
      if (editingMeeting.actionItems) {
        setActionItems(editingMeeting.actionItems.map(item => ({
          ...item,
          id: String(item.id),
          dueDate: item.dueDate ? item.dueDate.split('T')[0] : undefined,
        })));
      }
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
        contentType: 'text',
        summary: '',
        attendeeIds: [],
        status: 'DRAFT',
      });
      setAgendas([]);
      setActionItems([]);
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

  useEffect(() => {
    if (!isMeetingModalOpen || teams.length === 0) return;

    teams.forEach((team) => {
      if (!teamMembers.has(team.id)) {
        void fetchTeamMembers(team.id);
      }
    });
  }, [fetchTeamMembers, isMeetingModalOpen, teamMembers, teams]);

  const visibleTeams = useMemo(() => {
    if (!user) return teams;

    const myTeams = teams.filter((team) => (
      team.leaderId === user.id ||
      (teamMembers.get(team.id) || []).some((member) => member.memberId === user.id)
    ));

    return myTeams.length > 0 ? myTeams : teams;
  }, [teamMembers, teams, user]);

  // 폼 필드 변경 핸들러
  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 파일 추가 핸들러
  const handleAddFiles = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  // 대기 중인 파일 제거
  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 기존 첨부파일 삭제
  const handleDeleteExistingAttachment = async (attachmentId: number) => {
    if (!editingMeeting) return;
    try {
      await deleteAttachment(editingMeeting.id, attachmentId);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  // 탭 유효성 검사
  const validateTab = (tab: TabType): boolean => {
    switch (tab) {
      case 'basic':
        return !!(formData.title.trim() && formData.meetingDate);
      case 'content':
        return !!formData.content.trim();
      default:
        return true;
    }
  };

  // 현재 탭 인덱스
  const currentTabIndex = TABS.findIndex(t => t.id === activeTab);

  // 다음/이전 탭 이동
  const goToNextTab = () => {
    if (currentTabIndex < TABS.length - 1) {
      setActiveTab(TABS[currentTabIndex + 1].id);
    }
  };

  const goToPrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(TABS[currentTabIndex - 1].id);
    }
  };

  // 제출 핸들러
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
        contentType: formData.contentType,
        summary: formData.summary.trim() || undefined,
        attendeeIds: formData.attendeeIds,
        status,
        // 신규 생성 시에만 안건과 액션 아이템 포함
        ...(!isEditing && {
          agendas: agendas.map(a => ({
            title: a.title,
            description: a.description,
            order: a.order,
          })),
          actionItems: actionItems.map(item => ({
            title: item.title,
            description: item.description,
            assigneeId: item.assigneeId,
            dueDate: item.dueDate,
            priority: item.priority,
          })),
        }),
      };

      if (isEditing && editingMeeting) {
        await updateMeeting(editingMeeting.id, meetingData);

        if (pendingFiles.length > 0) {
          await uploadAttachments(editingMeeting.id, pendingFiles);
        }
      } else {
        const newMeeting = await addMeeting(meetingData);

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

  // 진행률 계산
  const progress = useMemo(() => {
    let completed = 0;
    if (formData.title.trim()) completed++;
    if (formData.meetingDate) completed++;
    if (formData.content.trim()) completed++;
    return Math.round((completed / 3) * 100);
  }, [formData.title, formData.meetingDate, formData.content]);

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
          {/* Backdrop - PC만 */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Container */}
          <motion.div
            className={cn(
              'relative bg-white dark:bg-slate-900 overflow-hidden flex flex-col',
              // 모바일: 전체 화면
              'w-full h-full',
              // PC: 중앙 모달
              'md:w-full md:max-w-4xl md:max-h-[90vh] md:h-auto',
              'md:rounded-2xl md:border md:border-gray-200 md:dark:border-slate-700 md:shadow-2xl'
            )}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-foreground">
                    {isEditing ? '회의자료 수정' : '새 회의자료'}
                  </h2>
                  {/* 진행률 표시 (모바일) */}
                  <div className="flex items-center gap-2 mt-1 md:hidden">
                    <div className="h-1.5 w-24 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Progress Bar (PC) */}
            <div className="hidden md:block h-1 bg-gray-200 dark:bg-slate-700">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentTabIndex + 1) / TABS.length) * 100}%` }}
              />
            </div>

            {/* Tabs (PC) */}
            <div className="hidden md:flex border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isValid = validateTab(tab.id);
                const isActive = activeTab === tab.id;
                const isPast = index < currentTabIndex;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* 완료 표시 */}
                    {isPast && isValid && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.required && <span className="text-destructive">*</span>}
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <form onSubmit={(e) => handleSubmit(e)} className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {/* Tab Content */}
                {activeTab === 'basic' && (
                <BasicInfoStep
                  formData={formData}
                  onChange={handleFieldChange}
                  projects={projects}
                  teams={visibleTeams}
                  members={members}
                />
                )}

                {activeTab === 'agenda' && (
                  <AgendaStep
                    agendas={agendas}
                    onChange={setAgendas}
                  />
                )}

                {activeTab === 'content' && (
                  <ContentStep
                    formData={formData}
                    onChange={handleFieldChange}
                  />
                )}

                {activeTab === 'actions' && (
                  <ActionItemStep
                    actionItems={actionItems}
                    onChange={setActionItems}
                    members={members}
                  />
                )}

                {activeTab === 'attachments' && (
                  <AttachmentStep
                    pendingFiles={pendingFiles}
                    existingAttachments={editingMeeting?.attachments}
                    onAddFiles={handleAddFiles}
                    onRemovePendingFile={handleRemovePendingFile}
                    onDeleteExistingAttachment={isEditing ? handleDeleteExistingAttachment : undefined}
                  />
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              {/* 모바일: 이전/다음 + 저장 버튼 */}
              <div className="md:hidden p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goToPrevTab}
                    disabled={currentTabIndex === 0}
                    className={cn(
                      'flex items-center gap-1 px-4 py-2.5 rounded-lg min-h-[44px]',
                      currentTabIndex === 0
                        ? 'text-muted-foreground/50'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>

                  {/* 현재 탭 표시 */}
                  <div className="flex items-center gap-1.5">
                    {TABS.map((tab, index) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-colors',
                          index === currentTabIndex
                            ? 'bg-primary'
                            : 'bg-gray-300 dark:bg-slate-600'
                        )}
                      />
                    ))}
                  </div>

                  {currentTabIndex < TABS.length - 1 ? (
                    <button
                      type="button"
                      onClick={goToNextTab}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-foreground hover:bg-muted min-h-[44px]"
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                      disabled={loading}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? '저장 중...' : '게시'}
                    </button>
                  )}
                </div>

                {/* 임시저장 버튼 (모바일) */}
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'DRAFT')}
                  disabled={loading}
                  className="w-full mt-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  임시저장
                </button>
              </div>

              {/* PC: 취소/임시저장/게시 버튼 */}
              <div className="hidden md:flex items-center justify-between p-4 md:p-6">
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
            </div>

            {/* Mobile Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 z-10">
              <div className="flex">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isValid = validateTab(tab.id);

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex-1 flex flex-col items-center py-2 relative',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" />
                        {tab.required && !isValid && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                        )}
                      </div>
                      <span className="text-[10px] mt-1">{tab.shortLabel}</span>
                      {isActive && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* 모바일 하단 탭 바 공간 확보 */}
            <div className="md:hidden h-16" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
