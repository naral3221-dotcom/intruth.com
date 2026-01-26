/**
 * CellManagementPage
 * 셀 관리 페이지
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Users, Edit2, Trash2, UserPlus } from 'lucide-react';
import { useCells, useCellDetail, CellList } from '@/features/attendance';
import type { Cell } from '@/features/attendance';
import { useMemberRepository } from '@/di';
import { cn } from '@/lib/utils';

export function CellManagementPage() {
  const { cells, loading, createCell, updateCell, deleteCell, refetch } = useCells();
  const memberRepository = useMemberRepository();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);

  const handleCreateCell = async (data: { name: string; description?: string; color: string; leaderId: string }) => {
    await createCell(data);
    setShowCreateModal(false);
  };

  const handleUpdateCell = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    await updateCell(id, data);
    setEditingCell(null);
  };

  const handleDeleteCell = async (id: string) => {
    if (confirm('정말로 이 셀을 삭제하시겠습니까?')) {
      await deleteCell(id);
      if (selectedCellId === id) {
        setSelectedCellId(null);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">셀 관리</h1>
          <p className="text-gray-500">셀을 생성하고 구성원을 관리하세요</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          새 셀 만들기
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 셀 목록 */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {cells.map((cell) => (
                <div
                  key={cell.id}
                  className={cn(
                    'p-4 rounded-lg border bg-white transition-all',
                    selectedCellId === cell.id && 'ring-2 ring-blue-500'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setSelectedCellId(selectedCellId === cell.id ? null : cell.id)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: cell.color }}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{cell.name}</h3>
                        {cell.description && (
                          <p className="text-sm text-gray-500">{cell.description}</p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          리더: {cell.leader?.name || '-'} | {cell.memberCount}명
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCell(cell)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCell(cell.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cells.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">아직 셀이 없습니다.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    첫 셀 만들기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 셀 상세 */}
        <div className="lg:col-span-1">
          {selectedCellId ? (
            <CellDetailPanel cellId={selectedCellId} />
          ) : (
            <div className="bg-white rounded-lg border p-6 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">셀을 선택하면 구성원을 관리할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 셀 생성 모달 */}
      {showCreateModal && (
        <CellFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCell}
        />
      )}

      {/* 셀 수정 모달 */}
      {editingCell && (
        <CellFormModal
          cell={editingCell}
          onClose={() => setEditingCell(null)}
          onSubmit={(data) => handleUpdateCell(editingCell.id, data)}
        />
      )}
    </motion.div>
  );
}

/**
 * 셀 상세 패널
 */
function CellDetailPanel({ cellId }: { cellId: string }) {
  const { cell, members, loading, addMember, removeMember } = useCellDetail(cellId);
  const [showAddMember, setShowAddMember] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!cell) return null;

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{cell.name} 구성원</h3>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <UserPlus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {member.member?.avatarUrl ? (
                  <img
                    src={member.member.avatarUrl}
                    alt={member.member.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-500">
                    {member.member?.name[0]}
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{member.member?.name}</div>
                {member.role !== 'MEMBER' && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {member.role === 'LEADER' ? '리더' : '부리더'}
                  </span>
                )}
              </div>
            </div>
            {member.role !== 'LEADER' && (
              <button
                onClick={() => removeMember(member.memberId)}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <p className="text-center text-gray-500 py-4">구성원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

/**
 * 셀 생성/수정 모달
 */
interface CellFormModalProps {
  cell?: Cell;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; color: string; leaderId: string }) => Promise<void>;
}

function CellFormModal({ cell, onClose, onSubmit }: CellFormModalProps) {
  const [name, setName] = useState(cell?.name || '');
  const [description, setDescription] = useState(cell?.description || '');
  const [color, setColor] = useState(cell?.color || '#00bcd4');
  const [leaderId, setLeaderId] = useState(cell?.leaderId || '');
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  const memberRepository = useMemberRepository();

  // 멤버 목록 로드
  useState(() => {
    memberRepository.findAll().then((data) => {
      setMembers(data.map((m) => ({ id: m.id, name: m.name })));
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name, description, color, leaderId });
    } finally {
      setSubmitting(false);
    }
  };

  const colors = ['#00bcd4', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#3f51b5'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{cell ? '셀 수정' : '새 셀 만들기'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">셀 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 청년 1셀"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="셀에 대한 간단한 설명"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full',
                    color === c && 'ring-2 ring-offset-2 ring-blue-500'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {!cell && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">셀 리더 *</label>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">리더를 선택하세요</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !name || (!cell && !leaderId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {submitting ? '저장 중...' : cell ? '수정' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CellManagementPage;
