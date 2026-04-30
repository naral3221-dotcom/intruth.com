import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderKanban,
  CheckCircle,
  Clock,
  AlertCircle,
  Pause,
  Calendar,
  Users,
  ListTodo,
  TrendingUp,
  Edit3,
  Trash2,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useProjectStore } from '@/stores/projectStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { toast } from '@/stores/toastStore';
import { shareProject } from '@/shared/share/entityShare';
import type { ShareResult } from '@/shared/share/kakaoShare';

// 프로젝트 상태 설정
const PROJECT_STATUS_CONFIG = {
  ACTIVE: {
    label: '진행중',
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    gradient: 'from-blue-500 to-cyan-500',
  },
  COMPLETED: {
    label: '완료',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/50',
    gradient: 'from-emerald-500 to-teal-500',
  },
  ON_HOLD: {
    label: '대기',
    icon: Pause,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/50',
    gradient: 'from-gray-500 to-slate-500',
  },
  ARCHIVED: {
    label: '보관됨',
    icon: AlertCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    gradient: 'from-amber-500 to-orange-500',
  },
} as const;

type ProjectStatus = keyof typeof PROJECT_STATUS_CONFIG;

const STATUS_ORDER: ProjectStatus[] = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];

export function ProjectProgressModal() {
  const { isProjectProgressModalOpen, progressProject, closeProjectProgressModal, openEditProjectModal, openConfirmModal } = useUIStore();
  const { updateProject, deleteProject, projects } = useProjectStore();
  const { tasks } = useTaskStore();

  // progressProject.id를 사용해서 store에서 최신 프로젝트 데이터 가져오기
  const currentProject = progressProject
    ? projects.find(p => p.id === progressProject.id) || progressProject
    : null;

  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);

  // 프로젝트의 업무 통계 계산
  const taskStats = useMemo(() => {
    if (!currentProject) return { total: 0, todo: 0, inProgress: 0, review: 0, done: 0, progress: 0 };

    const projectTasks = tasks.filter(t => t.projectId === currentProject.id);
    const total = projectTasks.length;
    const todo = projectTasks.filter(t => t.status === 'TODO').length;
    const inProgress = projectTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const review = projectTasks.filter(t => t.status === 'REVIEW').length;
    const done = projectTasks.filter(t => t.status === 'DONE').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, todo, inProgress, review, done, progress };
  }, [currentProject, tasks]);

  // 팀 정보 수집 (teams 또는 team)
  const teams = useMemo(() => {
    if (!currentProject) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = currentProject as any;
    if (proj.teams?.length) return proj.teams;
    if (proj.team) return [proj.team];
    return [];
  }, [currentProject]);

  // 담당자 정보 수집 (teamAssignments에서 모든 담당자 추출, 없으면 members 사용)
  const allAssignees = useMemo(() => {
    if (!currentProject) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = currentProject as any;

    if (proj.teamAssignments?.length) {
      const assigneeMap = new Map<string, { id: string; name: string; avatarUrl?: string; position?: string }>();
      proj.teamAssignments.forEach((ta: { assignees?: Array<{ id: string; name: string; avatarUrl?: string; position?: string }> }) => {
        ta.assignees?.forEach(a => {
          if (!assigneeMap.has(a.id)) {
            assigneeMap.set(a.id, { id: a.id, name: a.name, avatarUrl: a.avatarUrl, position: a.position });
          }
        });
      });
      return Array.from(assigneeMap.values());
    }

    // members에서 가져오기
    if (proj.members?.length) {
      return proj.members.map((pm: { member: { id: string; name: string; avatarUrl?: string; position?: string } }) => ({
        id: pm.member.id,
        name: pm.member.name,
        avatarUrl: pm.member.avatarUrl,
        position: pm.member.position
      }));
    }

    return [];
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      setSelectedStatus(currentProject.status);
    }
  }, [currentProject]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!currentProject || newStatus === selectedStatus) return;

    setLoading(true);
    try {
      await updateProject(currentProject.id, { status: newStatus });
      setSelectedStatus(newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!currentProject) return;
    closeProjectProgressModal();
    openEditProjectModal(currentProject);
  };

  const handleDelete = () => {
    if (!currentProject) return;
    openConfirmModal({
      title: '프로젝트 삭제',
      message: `"${currentProject.name}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: async () => {
        await deleteProject(currentProject.id);
        closeProjectProgressModal();
      },
    });
  };

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
    if (!currentProject) return;

    setSharingKakao(true);
    try {
      const result = await shareProject(currentProject);
      notifyShareResult(result);
    } catch {
      toast.error('프로젝트 공유에 실패했습니다.');
    } finally {
      setSharingKakao(false);
    }
  };

  if (!currentProject) return null;

  const currentConfig = PROJECT_STATUS_CONFIG[selectedStatus];

  return (
    <AnimatePresence>
      {isProjectProgressModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeProjectProgressModal}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 w-full sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
              {/* Header */}
              <div className="relative shrink-0 border-b border-gray-200 px-4 py-4 dark:border-slate-700 sm:px-6 sm:py-5">
                <div className={cn(
                  "absolute inset-0 opacity-10 dark:opacity-20 bg-gradient-to-r",
                  currentConfig.gradient
                )} />
                <div className="relative flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      currentConfig.bgColor
                    )}>
                      <FolderKanban className={cn("w-5 h-5", currentConfig.color)} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                        {currentProject.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">프로젝트 진행상황 관리</p>
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-2">
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="프로젝트 수정"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="프로젝트 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={closeProjectProgressModal}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:p-6">
                {/* 진행률 표시 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      전체 진행률
                    </span>
                    <span className={cn("text-2xl font-bold", currentConfig.color)}>
                      {taskStats.progress}%
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${taskStats.progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn("h-full rounded-full bg-gradient-to-r", currentConfig.gradient)}
                    />
                  </div>
                </div>

                {/* 업무 통계 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="p-3 rounded-xl bg-gray-500/10 border border-gray-500/20 text-center">
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-300">{taskStats.todo}</div>
                    <div className="text-xs text-muted-foreground">대기</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</div>
                    <div className="text-xs text-muted-foreground">진행중</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{taskStats.review}</div>
                    <div className="text-xs text-muted-foreground">검토</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{taskStats.done}</div>
                    <div className="text-xs text-muted-foreground">완료</div>
                  </div>
                </div>

                {/* 프로젝트 정보 */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      총 업무
                    </span>
                    <span className="text-foreground font-medium">{taskStats.total}개</span>
                  </div>
                  {currentProject.startDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        시작일
                      </span>
                      <span className="text-foreground font-medium">
                        {new Date(currentProject.startDate).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {currentProject.endDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        종료일
                      </span>
                      <span className="text-foreground font-medium">
                        {new Date(currentProject.endDate).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* 담당 팀원 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    담당 팀원
                  </label>
                  {/* 팀 배지 */}
                  {teams.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {teams.map((team: { id: string; name: string; color?: string }) => (
                        <span
                          key={team.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: `${team.color || '#6366f1'}20`,
                            color: team.color || '#6366f1',
                            border: `1px solid ${team.color || '#6366f1'}40`
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                          />
                          {team.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 담당자 목록 */}
                  {allAssignees.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allAssignees.map((member: { id: string; name: string; avatarUrl?: string; position?: string }) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </div>
                          <span className="text-sm text-foreground">{member.name}</span>
                          {member.position && (
                            <span className="text-xs text-muted-foreground">{member.position}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">배정된 팀원이 없습니다</p>
                  )}
                </div>

                {/* 상태 변경 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    프로젝트 상태 변경
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STATUS_ORDER.map((status) => {
                      const config = PROJECT_STATUS_CONFIG[status];
                      const Icon = config.icon;
                      const isSelected = selectedStatus === status;

                      return (
                        <motion.button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={loading}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                            isSelected
                              ? cn(config.bgColor, config.borderColor)
                              : "bg-muted/30 border-border hover:border-border/80",
                            loading && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isSelected ? config.bgColor : "bg-muted"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4",
                              isSelected ? config.color : "text-muted-foreground"
                            )} />
                          </div>
                          <span className={cn(
                            "font-medium",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {config.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto"
                            >
                              <CheckCircle className={cn("w-5 h-5", config.color)} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 설명 */}
                {currentProject.description && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">설명</label>
                    <p className="text-sm text-foreground p-3 rounded-lg bg-muted/30">
                      {currentProject.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-slate-700 dark:bg-slate-800/50 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:px-6 sm:pb-4 sm:pt-4">
                <button
                  onClick={() => void handleKakaoShare()}
                  disabled={sharingKakao}
                  className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f2da00] disabled:opacity-60 sm:mb-0 sm:w-auto"
                >
                  {sharingKakao ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  카카오 공유
                </button>
                <button
                  onClick={closeProjectProgressModal}
                  className="aboard-btn-primary min-h-11 w-full justify-center sm:w-auto"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
