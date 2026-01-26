import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Search, Check, Crown } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useTeamStore } from '@/stores/teamStore';
import { useUIStore } from '@/stores/uiStore';
import { useAdminRepository } from '@/di';
import type { Member, TeamMemberRole, AuthUser } from '@/types';

// AuthUser를 Member 형태로 변환
function authUserToMember(user: AuthUser): Member {
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    department: user.department,
    position: user.position,
    avatarUrl: user.avatarUrl,
  };
}

export function TeamMemberModal() {
  const { isTeamMemberModalOpen, teamMemberModalTeamId, closeTeamMemberModal } = useUIStore();
  const { addMemberToTeam, getTeamMembers } = useTeamStore();
  const adminRepository = useAdminRepository();

  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Map<string, TeamMemberRole>>(new Map());
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isTeamMemberModalOpen) {
      // adminRepository.getUsers()를 사용하여 모든 활성 사용자 가져오기
      setFetchingMembers(true);
      adminRepository.getUsers()
        .then((users) => {
          // 활성 사용자만 필터링하고 Member 형태로 변환
          const activeMembers = users
            .filter((u) => u.isActive !== false)
            .map(authUserToMember);
          setMembers(activeMembers);
        })
        .catch((err) => {
          console.error('Failed to fetch users:', err);
          setError('사용자 목록을 불러오는데 실패했습니다.');
        })
        .finally(() => {
          setFetchingMembers(false);
        });
      setSearchQuery('');
      setSelectedMembers(new Map());
      setError(null);
    }
  }, [isTeamMemberModalOpen, adminRepository]);

  // 이미 팀에 속한 멤버 제외
  const existingMemberIds = teamMemberModalTeamId
    ? new Set(getTeamMembers(teamMemberModalTeamId).map((tm) => tm.memberId))
    : new Set<string>();

  const availableMembers = members.filter((m) => {
    if (existingMemberIds.has(m.id)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query) ||
      m.department?.toLowerCase().includes(query)
    );
  });

  const toggleMember = (member: Member) => {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      if (next.has(member.id)) {
        next.delete(member.id);
      } else {
        next.set(member.id, 'MEMBER');
      }
      return next;
    });
  };

  const setMemberRole = (memberId: string, role: TeamMemberRole) => {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      if (next.has(memberId)) {
        next.set(memberId, role);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!teamMemberModalTeamId || selectedMembers.size === 0) return;

    setLoading(true);
    setError(null);

    try {
      // 선택된 멤버들을 순차적으로 추가
      for (const [memberId, role] of selectedMembers) {
        await addMemberToTeam(teamMemberModalTeamId, memberId, role);
      }
      closeTeamMemberModal();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isTeamMemberModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeTeamMemberModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  팀원 추가
                </h2>
                <button
                  onClick={closeTeamMemberModal}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름 또는 이메일로 검색..."
                    className="w-full py-2.5 pr-4 pl-12 border border-border rounded-lg bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Member List */}
              <div className="flex-1 overflow-y-auto p-6">
                {fetchingMembers ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
                    <p>사용자 목록 불러오는 중...</p>
                  </div>
                ) : availableMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <UserPlus className="w-12 h-12 mb-3 opacity-50" />
                    <p>추가할 수 있는 멤버가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableMembers.map((member) => {
                      const isSelected = selectedMembers.has(member.id);
                      const role = selectedMembers.get(member.id);

                      return (
                        <motion.div
                          key={member.id}
                          onClick={() => toggleMember(member)}
                          className={cn(
                            'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary/10 border border-primary/50'
                              : 'bg-muted/30 border border-transparent hover:bg-muted'
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              'w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted border border-border'
                            )}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>

                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium truncate">{member.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                          </div>

                          {/* Role Toggle */}
                          {isSelected && (
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setMemberRole(member.id, 'MEMBER')}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                  role === 'MEMBER'
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                              >
                                멤버
                              </button>
                              <button
                                onClick={() => setMemberRole(member.id, 'LEADER')}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                                  role === 'LEADER'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                              >
                                <Crown className="w-3 h-3" />
                                리더
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <p className="text-sm text-muted-foreground">
                  {selectedMembers.size}명 선택됨
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeTeamMemberModal}
                    className="aboard-btn-secondary"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || selectedMembers.size === 0}
                    className={cn(
                      'aboard-btn-primary',
                      (loading || selectedMembers.size === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loading ? '추가 중...' : `${selectedMembers.size}명 추가하기`}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
