import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Users,
  Briefcase,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useRoutineStore } from '@/stores/routineStore';
import { useMemberStore } from '@/stores/memberStore';
import { useProjectStore } from '@/stores/projectStore';
import type { RoutineTask, CreateRoutineInput, TaskPriority, RepeatType } from '@/types';

// 요일 데이터
const DAYS = [
  { value: 0, label: '일', short: '일' },
  { value: 1, label: '월', short: '월' },
  { value: 2, label: '화', short: '화' },
  { value: 3, label: '수', short: '수' },
  { value: 4, label: '목', short: '목' },
  { value: 5, label: '금', short: '금' },
  { value: 6, label: '토', short: '토' },
];

// 우선순위 옵션
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: '낮음', color: 'bg-gray-500' },
  { value: 'MEDIUM', label: '보통', color: 'bg-blue-500' },
  { value: 'HIGH', label: '높음', color: 'bg-orange-500' },
  { value: 'URGENT', label: '긴급', color: 'bg-red-500' },
];

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRoutine?: RoutineTask | null;
  defaultProjectId?: string;
}

export function RoutineModal({
  isOpen,
  onClose,
  editingRoutine,
  defaultProjectId
}: RoutineModalProps) {
  const { createRoutine, updateRoutine, loading } = useRoutineStore();
  const { members, fetchMembers } = useMemberStore();
  const { projects, fetchProjects } = useProjectStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('weekly');
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // 기본: 평일
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchProjects();
    }
  }, [isOpen, fetchMembers, fetchProjects]);

  // 편집 모드일 때 폼 초기화
  useEffect(() => {
    if (editingRoutine) {
      setTitle(editingRoutine.title);
      setDescription(editingRoutine.description || '');
      setRepeatType(editingRoutine.repeatType);
      setRepeatDays(editingRoutine.repeatDays);
      setPriority(editingRoutine.priority);
      setEstimatedMinutes(editingRoutine.estimatedMinutes);
      setProjectId(editingRoutine.projectId);
      setAssigneeIds(editingRoutine.assignees.map(a => a.id));
    } else {
      // 새 루틴: 폼 초기화
      setTitle('');
      setDescription('');
      setRepeatType('weekly');
      setRepeatDays([1, 2, 3, 4, 5]);
      setPriority('MEDIUM');
      setEstimatedMinutes(undefined);
      setProjectId(defaultProjectId);
      setAssigneeIds([]);
    }
  }, [editingRoutine, defaultProjectId]);

  // 요일 토글
  const toggleDay = (day: number) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter(d => d !== day));
    } else {
      setRepeatDays([...repeatDays, day].sort());
    }
  };

  // 담당자 토글
  const toggleAssignee = (memberId: string) => {
    if (assigneeIds.includes(memberId)) {
      setAssigneeIds(assigneeIds.filter(id => id !== memberId));
    } else {
      setAssigneeIds([...assigneeIds, memberId]);
    }
  };

  // 반복 타입 변경
  const handleRepeatTypeChange = (type: RepeatType) => {
    setRepeatType(type);
    if (type === 'daily') {
      setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (type === 'weekly') {
      setRepeatDays([1, 2, 3, 4, 5]); // 평일
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const data: CreateRoutineInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      repeatType,
      repeatDays,
      priority,
      estimatedMinutes,
      projectId: projectId || undefined,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
    };

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, data);
      } else {
        await createRoutine(data);
      }
      onClose();
    } catch (error) {
      // 에러는 store에서 처리
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {editingRoutine ? '루틴 수정' : '새 루틴'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                루틴 제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 일일 보고서 작성"
                className="aboard-input"
                required
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="루틴에 대한 설명을 입력하세요"
                rows={2}
                className="aboard-input resize-none"
              />
            </div>

            {/* 반복 설정 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                반복 설정
              </label>

              {/* 반복 타입 */}
              <div className="flex gap-2 mb-3">
                {(['daily', 'weekly', 'custom'] as RepeatType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleRepeatTypeChange(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      repeatType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {type === 'daily' ? '매일' : type === 'weekly' ? '평일' : '직접 선택'}
                  </button>
                ))}
              </div>

              {/* 요일 선택 (custom일 때만 활성화) */}
              <div className="flex gap-1">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => repeatType === 'custom' && toggleDay(day.value)}
                    disabled={repeatType !== 'custom'}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      repeatDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${repeatType !== 'custom' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/80'}`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            {/* 우선순위 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                우선순위
              </label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      priority === opt.value
                        ? `${opt.color} text-white`
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 예상 소요 시간 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                예상 소요 시간 (분)
              </label>
              <input
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="예: 30"
                min={1}
                className="aboard-input w-32"
              />
            </div>

            {/* 프로젝트 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Briefcase className="w-4 h-4 inline mr-1" />
                프로젝트 (선택)
              </label>
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || undefined)}
                className="aboard-input"
              >
                <option value="">개인 루틴</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 담당자 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                담당자
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      assigneeIds.includes(member.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <button
                type="button"
                className="aboard-btn-secondary"
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="submit"
                className="aboard-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !title.trim()}
              >
                {loading ? '저장 중...' : editingRoutine ? '수정' : '생성'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
