/**
 * ActionItemStep - 액션 아이템 관리 스텝
 * 회의에서 도출된 할 일 관리
 */
import { Plus, Trash2, Calendar, User, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/core/utils/cn';
import type { CreateActionItemInput, ActionItemPriority, ActionItemStatus, Member } from '@/types';

interface LocalActionItem extends CreateActionItemInput {
  id: string; // 임시 ID (클라이언트용)
  status?: ActionItemStatus;
}

interface ActionItemStepProps {
  actionItems: LocalActionItem[];
  onChange: (actionItems: LocalActionItem[]) => void;
  members: Member[];
}

const PRIORITY_CONFIG: Record<ActionItemPriority, { label: string; color: string; bgColor: string }> = {
  URGENT: { label: '긴급', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  HIGH: { label: '높음', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  MEDIUM: { label: '보통', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  LOW: { label: '낮음', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

export function ActionItemStep({ actionItems, onChange, members }: ActionItemStepProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateActionItemInput>({
    title: '',
    description: '',
    assigneeId: undefined,
    dueDate: '',
    priority: 'MEDIUM',
  });

  const handleAdd = () => {
    if (!formData.title.trim()) return;

    const newItem: LocalActionItem = {
      ...formData,
      id: `temp-${Date.now()}`,
      status: 'TODO',
    };

    onChange([...actionItems, newItem]);
    setFormData({
      title: '',
      description: '',
      assigneeId: undefined,
      dueDate: '',
      priority: 'MEDIUM',
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    onChange(actionItems.filter(item => item.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    onChange(actionItems.map(item =>
      item.id === id
        ? { ...item, status: item.status === 'DONE' ? 'TODO' : 'DONE' }
        : item
    ));
  };

  const getAssigneeName = (assigneeId?: number) => {
    if (!assigneeId) return null;
    const member = members.find(m => Number(m.id) === assigneeId);
    return member?.name;
  };

  const todoCount = actionItems.filter(item => item.status !== 'DONE').length;
  const doneCount = actionItems.filter(item => item.status === 'DONE').length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">액션 아이템</h3>
          {actionItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {todoCount}개 진행 중 | {doneCount}개 완료
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          할 일 추가
        </button>
      </div>

      {/* 빈 상태 */}
      {actionItems.length === 0 && !showForm && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">등록된 액션 아이템이 없습니다.</p>
          <p className="text-xs mt-1">회의에서 도출된 할 일을 추가하세요.</p>
        </div>
      )}

      {/* 액션 아이템 목록 */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          {actionItems.map((item) => {
            const priorityConfig = PRIORITY_CONFIG[item.priority || 'MEDIUM'];
            const isDone = item.status === 'DONE';

            return (
              <div
                key={item.id}
                className={cn(
                  'p-3 border rounded-lg transition-colors',
                  isDone ? 'border-border bg-muted/30' : 'border-border hover:border-primary/30'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스 */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isDone
                        ? 'bg-primary border-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    )}>
                      {isDone && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'text-sm font-medium',
                        isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}>
                        {item.title}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        priorityConfig.bgColor,
                        priorityConfig.color
                      )}>
                        {priorityConfig.label}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {item.assigneeId && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getAssigneeName(item.assigneeId)}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.dueDate).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 추가 폼 */}
      {showForm && (
        <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="할 일 제목 (예: 예산안 검토)"
            className="aboard-input"
            autoFocus
          />

          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="상세 설명 (선택)"
            rows={2}
            className="aboard-input resize-none"
          />

          {/* 모바일: 세로 배치, PC: 가로 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 담당자 */}
            <div>
              <label className="text-xs text-muted-foreground">담당자</label>
              <select
                value={formData.assigneeId || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  assigneeId: e.target.value ? Number(e.target.value) : undefined
                }))}
                className="aboard-input mt-1"
              >
                <option value="">담당자 선택</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* 마감일 */}
            <div>
              <label className="text-xs text-muted-foreground">마감일</label>
              <input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="aboard-input mt-1"
              />
            </div>

            {/* 우선순위 */}
            <div>
              <label className="text-xs text-muted-foreground">우선순위</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  priority: e.target.value as ActionItemPriority
                }))}
                className="aboard-input mt-1"
              >
                <option value="LOW">낮음</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">높음</option>
                <option value="URGENT">긴급</option>
              </select>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({
                  title: '',
                  description: '',
                  assigneeId: undefined,
                  dueDate: '',
                  priority: 'MEDIUM',
                });
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!formData.title.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50 min-h-[44px]"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
