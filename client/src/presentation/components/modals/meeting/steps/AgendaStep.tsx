/**
 * AgendaStep - 안건 관리 스텝
 * 회의 전 아젠다 등록 및 관리
 */
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/core/utils/cn';
import type { CreateAgendaInput, AgendaStatus } from '@/types';

interface LocalAgenda extends CreateAgendaInput {
  id: string; // 임시 ID (클라이언트용)
  status?: AgendaStatus;
}

interface AgendaStepProps {
  agendas: LocalAgenda[];
  onChange: (agendas: LocalAgenda[]) => void;
}

export function AgendaStep({ agendas, onChange }: AgendaStepProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAgendaInput>({
    title: '',
    description: '',
  });

  const handleAdd = () => {
    if (!formData.title.trim()) return;

    const newAgenda: LocalAgenda = {
      ...formData,
      id: `temp-${Date.now()}`,
      order: agendas.length,
      status: 'PENDING',
    };

    onChange([...agendas, newAgenda]);
    setFormData({ title: '', description: '' });
    setShowForm(false);
  };

  const handleUpdate = (id: string) => {
    onChange(agendas.map(a => a.id === id ? { ...a, ...formData } : a));
    setEditingId(null);
    setFormData({ title: '', description: '' });
  };

  const handleDelete = (id: string) => {
    onChange(agendas.filter(a => a.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newAgendas = [...agendas];
    [newAgendas[index - 1], newAgendas[index]] = [newAgendas[index], newAgendas[index - 1]];
    onChange(newAgendas.map((a, i) => ({ ...a, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === agendas.length - 1) return;
    const newAgendas = [...agendas];
    [newAgendas[index], newAgendas[index + 1]] = [newAgendas[index + 1], newAgendas[index]];
    onChange(newAgendas.map((a, i) => ({ ...a, order: i })));
  };

  const startEditing = (agenda: LocalAgenda) => {
    setEditingId(agenda.id);
    setFormData({
      title: agenda.title,
      description: agenda.description,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">안건 목록</h3>
          {agendas.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              총 {agendas.length}개 안건
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ title: '', description: '' });
          }}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          안건 추가
        </button>
      </div>

      {/* 빈 상태 */}
      {agendas.length === 0 && !showForm && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">등록된 안건이 없습니다.</p>
          <p className="text-xs mt-1">회의 전에 안건을 등록하면 더 효율적인 회의가 가능합니다.</p>
        </div>
      )}

      {/* 안건 목록 */}
      {agendas.length > 0 && (
        <div className="space-y-2">
          {agendas.map((agenda, index) => (
            <div
              key={agenda.id}
              className={cn(
                'p-3 border rounded-lg transition-colors',
                editingId === agenda.id
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-primary/30'
              )}
            >
              {editingId === agenda.id ? (
                /* 편집 모드 */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="안건 제목"
                    className="aboard-input"
                    autoFocus
                  />
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="안건 설명 (선택)"
                    rows={2}
                    className="aboard-input resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFormData({ title: '', description: '' });
                      }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(agenda.id)}
                      disabled={!formData.title.trim()}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                /* 보기 모드 */
                <div className="flex items-start gap-2">
                  {/* 순서 조절 버튼 */}
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === agendas.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 안건 정보 */}
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => startEditing(agenda)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground truncate">{agenda.title}</span>
                    </div>
                    {agenda.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {agenda.description}
                      </p>
                    )}
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(agenda.id)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 추가 폼 */}
      {showForm && (
        <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="안건 제목을 입력하세요"
            className="aboard-input"
            autoFocus
          />
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="안건 설명 (선택)"
            rows={2}
            className="aboard-input resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ title: '', description: '' });
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
