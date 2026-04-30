import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, AlertCircle, ChevronDown, Folder, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useTaskStore } from '@/stores/taskStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMemberStore } from '@/stores/memberStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { validateTaskForm, getFieldError, type ValidationResult } from '@/core/utils/validation';
import { shareTask } from '@/shared/share/entityShare';
import type { ShareResult } from '@/shared/share/kakaoShare';
import type { TaskStatus, TaskPriority } from '@/types';

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: '대기중', color: 'bg-gray-400' },
  { value: 'IN_PROGRESS', label: '진행중', color: 'bg-blue-500' },
  { value: 'REVIEW', label: '검토중', color: 'bg-amber-500' },
  { value: 'DONE', label: '완료', color: 'bg-emerald-500' },
];

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: '낮음', color: 'bg-slate-400' },
  { value: 'MEDIUM', label: '보통', color: 'bg-yellow-500' },
  { value: 'HIGH', label: '높음', color: 'bg-orange-500' },
  { value: 'URGENT', label: '긴급', color: 'bg-red-500' },
];

export function SpatialTaskModal() {
  const { isTaskModalOpen, editingTask, taskModalProjectId, taskModalParentId, closeTaskModal } = useUIStore();
  const { tasks, addTask, updateTask } = useTaskStore();
  const { projects } = useProjectStore();
  const { members } = useMemberStore();
  const { user } = useAuthStore();

  const currentTask = editingTask
    ? tasks.find(t => t.id === editingTask.id) || editingTask
    : null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    assigneeIds: [] as string[],
    startDate: '',
    dueDate: '',
    folderUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });

  const toggleAssignee = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(memberId)
        ? prev.assigneeIds.filter(id => id !== memberId)
        : [...prev.assigneeIds, memberId]
    }));
  };

  const removeAssignee = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.filter(id => id !== memberId)
    }));
  };

  const selectedAssignees = members.filter(m => formData.assigneeIds.includes(m.id));

  // 나에게 할당 토글
  const assignToMe = () => {
    if (!user) return;
    const myMember = members.find(m => m.name === user.name || m.email === user.email);
    if (myMember) {
      if (formData.assigneeIds.includes(myMember.id)) {
        removeAssignee(myMember.id);
      } else {
        toggleAssignee(myMember.id);
      }
    }
  };

  const isAssignedToMe = () => {
    if (!user) return false;
    const myMember = members.find(m => m.name === user.name || m.email === user.email);
    return myMember ? formData.assigneeIds.includes(myMember.id) : false;
  };

  useEffect(() => {
    if (currentTask) {
      const assigneeIds = currentTask.assignees?.map(a => a.id)
        || (currentTask.assignee ? [currentTask.assignee.id] : []);
      setFormData({
        title: currentTask.title,
        description: currentTask.description || '',
        projectId: currentTask.projectId,
        status: currentTask.status,
        priority: currentTask.priority,
        assigneeIds,
        startDate: currentTask.startDate || '',
        dueDate: currentTask.dueDate || '',
        folderUrl: currentTask.folderUrl || '',
      });
      setShowAdvanced(true);
    } else {
      setFormData({
        title: '',
        description: '',
        projectId: taskModalProjectId || (projects[0]?.id ?? ''),
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeIds: [],
        startDate: '',
        dueDate: '',
        folderUrl: '',
      });
      setShowAdvanced(false);
    }
    setError(null);
    setShowAssigneeDropdown(false);
    setSharingKakao(false);
    setValidation({ isValid: true, errors: [] });
  }, [currentTask, taskModalProjectId, projects, isTaskModalOpen, user]);

  const notifyShareResult = (result: ShareResult) => {
    if (result === 'kakao' || result === 'native') {
      toast.success('공유 화면을 열었습니다.');
      return;
    }

    if (result === 'copied') {
      toast.success('공유 내용을 복사했습니다.');
      return;
    }

    toast.info('공유를 완료했습니다.');
  };

  const handleKakaoShare = async () => {
    if (!currentTask) return;

    setSharingKakao(true);
    try {
      const result = await shareTask(currentTask);
      notifyShareResult(result);
    } catch {
      toast.error('업무 공유에 실패했습니다.');
    } finally {
      setSharingKakao(false);
    }
  };

  const validateField = (fieldName: string) => {
    const result = validateTaskForm(formData, !!taskModalParentId);
    setValidation(result);
    return getFieldError(result, fieldName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateTaskForm(formData, !!taskModalParentId);
    setValidation(result);

    if (!result.isValid) {
      const firstError = result.errors[0];
      if (firstError) {
        setError(firstError.message);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentTask) {
        await updateTask(currentTask.id, {
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          priority: formData.priority,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
          folderUrl: formData.folderUrl || undefined,
          assigneeIds: formData.assigneeIds.length > 0 ? formData.assigneeIds : undefined,
        });
      } else {
        await addTask({
          projectId: formData.projectId,
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          priority: formData.priority,
          assigneeIds: formData.assigneeIds.length > 0 ? formData.assigneeIds : undefined,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
          parentId: taskModalParentId || undefined,
        });
      }
      closeTaskModal();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 빠른 날짜 선택
  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const today = new Date();
    let date: Date;

    switch (type) {
      case 'today':
        date = today;
        break;
      case 'tomorrow':
        date = new Date(today.setDate(today.getDate() + 1));
        break;
      case 'nextWeek':
        date = new Date(today.setDate(today.getDate() + (8 - today.getDay())));
        break;
    }

    setFormData(prev => ({
      ...prev,
      dueDate: date.toISOString().split('T')[0]
    }));
  };

  return (
    <AnimatePresence>
      {isTaskModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={closeTaskModal}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 w-full sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:mx-4 sm:-translate-x-1/2 sm:-translate-y-1/2",
              taskModalParentId ? "sm:max-w-md" : "sm:max-w-lg"
            )}
          >
            <div className="flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-foreground">
                  {currentTask ? '업무 수정' : taskModalParentId ? '하위 업무 추가' : '새 업무'}
                </h2>
                <button
                  onClick={closeTaskModal}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {/* Error */}
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Title - 필수 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      제목 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      onBlur={() => validateField('제목')}
                      placeholder="업무 제목을 입력하세요"
                      maxLength={100}
                      autoFocus
                      className={cn(
                        "aboard-input",
                        getFieldError(validation, '제목') && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                    />
                    {getFieldError(validation, '제목') && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError(validation, '제목')}
                      </p>
                    )}
                  </div>

                  {/* Project - 하위 업무가 아닐 때만 */}
                  {!taskModalParentId && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        프로젝트 <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="aboard-input"
                      >
                        <option value="">선택하세요</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status & Priority - 2 columns */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">상태</label>
                      <div className="grid grid-cols-2 gap-2">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: opt.value })}
                            className={cn(
                              "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                              formData.status === opt.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 rounded-full", opt.color)} />
                            <span className="whitespace-nowrap">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">우선순위</label>
                      <div className="grid grid-cols-2 gap-2">
                        {priorityOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: opt.value })}
                            className={cn(
                              "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                              formData.priority === opt.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 rounded-full", opt.color)} />
                            <span className="whitespace-nowrap">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Assignee */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">담당자</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={assignToMe}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-all",
                          isAssignedToMe()
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {isAssignedToMe() && <Check className="w-3 h-3 inline mr-1" />}
                        나에게 할당
                      </button>
                      {selectedAssignees.filter(m => {
                        const myMember = members.find(mem => mem.name === user?.name);
                        return m.id !== myMember?.id;
                      }).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-sm"
                        >
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary">
                            {member.name.charAt(0)}
                          </div>
                          <span className="text-foreground">{member.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAssignee(member.id)}
                            className="p-0.5 hover:bg-background rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                      >
                        + 추가
                      </button>
                    </div>

                    {/* Assignee Dropdown */}
                    <AnimatePresence>
                      {showAssigneeDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-2 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto"
                        >
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {members.map((member) => {
                              const isSelected = formData.assigneeIds.includes(member.id);
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => toggleAssignee(member.id)}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors text-sm",
                                    isSelected ? "bg-primary/10" : "hover:bg-muted"
                                  )}
                                >
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  )}>
                                    {member.name.charAt(0)}
                                  </div>
                                  <span className={cn(
                                    "truncate",
                                    isSelected ? "text-primary font-medium" : "text-foreground"
                                  )}>
                                    {member.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Advanced Section (Collapsible) */}
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>추가 옵션</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        showAdvanced && "rotate-180"
                      )} />
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-4">
                            {/* Description */}
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1.5">설명</label>
                              <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="업무 설명을 입력하세요 (선택)"
                                rows={2}
                                maxLength={2000}
                                className="aboard-input resize-none"
                              />
                            </div>

                            {/* Due Date with Quick Options */}
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1.5">
                                <Clock className="w-4 h-4 inline mr-1.5" />
                                마감일
                              </label>
                              <div className="flex gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() => setQuickDate('today')}
                                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  오늘
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickDate('tomorrow')}
                                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  내일
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickDate('nextWeek')}
                                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  다음주
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">시작일</label>
                                  <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="aboard-input text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">마감일</label>
                                  <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="aboard-input text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Folder URL */}
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1.5">
                                <Folder className="w-4 h-4 inline mr-1.5" />
                                작업 폴더 URL
                              </label>
                              <input
                                type="url"
                                value={formData.folderUrl}
                                onChange={(e) => setFormData({ ...formData, folderUrl: e.target.value })}
                                placeholder="https://drive.google.com/..."
                                className="aboard-input"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-slate-700 dark:bg-slate-800/50 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:pb-3">
                  {currentTask && (
                    <button
                      type="button"
                      onClick={() => void handleKakaoShare()}
                      disabled={loading || sharingKakao}
                      className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f2da00] disabled:opacity-60 sm:mb-0 sm:w-auto"
                    >
                      {sharingKakao ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                      카카오 공유
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:justify-end">
                    <button
                      type="button"
                      onClick={closeTaskModal}
                      className="aboard-btn-secondary min-h-11 justify-center"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={loading || sharingKakao}
                      className={cn(
                        "aboard-btn-primary min-h-11 justify-center",
                        (loading || sharingKakao) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {loading ? '저장 중...' : currentTask ? '수정' : '추가'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
