import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
  Key,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAdminRepository } from '@/di';
import type { AuthUser } from '@/types';
import type { CreateUserDTO } from '@/domain/repositories/IAdminRepository';

export function AdminPage() {
  const adminRepository = useAdminRepository();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<AuthUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminRepository.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admin: users.filter(u => u.userRole === 'admin').length,
    needsPasswordChange: users.filter(u => u.mustChangePassword).length,
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!confirm(`정말 ${user.name}님의 계정을 삭제하시겠습니까?`)) return;

    try {
      await adminRepository.deleteUser(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (user: AuthUser) => {
    try {
      await adminRepository.updateUser(user.id, { isActive: !user.isActive });
      setUsers(users.map((u) =>
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    }
  };

  const handleResetPassword = async (user: AuthUser) => {
    try {
      const newPassword = await adminRepository.resetPassword(user.id);
      setTempPassword(newPassword);
      setShowResetModal(user);
    } catch (err) {
      alert(err instanceof Error ? err.message : '비밀번호 초기화에 실패했습니다.');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">
            총 {stats.total}명 · 활성 {stats.active}명
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="aboard-btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 새 계정 생성
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">전체 사용자</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-green flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-xs text-muted-foreground">활성 사용자</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-purple flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.admin}</p>
              <p className="text-xs text-muted-foreground">관리자</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-orange flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.needsPasswordChange}</p>
              <p className="text-xs text-muted-foreground">비번 변경 필요</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="이름, 아이디, 부서로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aboard-input pl-10"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="aboard-card p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="aboard-card overflow-hidden">
        <table className="aboard-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th>부서</th>
              <th>직책</th>
              <th>권한</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground">{user.name}</span>
                  </div>
                </td>
                <td className="text-muted-foreground">{user.username}</td>
                <td className="text-muted-foreground">{user.department || '-'}</td>
                <td className="text-muted-foreground">{user.position || '-'}</td>
                <td>
                  <span className={`aboard-badge ${
                    user.userRole === 'admin' ? 'aboard-badge-warning' : 'aboard-badge-info'
                  }`}>
                    {user.userRole === 'admin' ? '관리자' : '멤버'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`aboard-badge ${
                      user.isActive ? 'aboard-badge-success' : 'aboard-badge-danger'
                    }`}>
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                    {user.mustChangePassword && (
                      <span className="aboard-badge aboard-badge-warning text-[10px]">
                        비번변경
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title="비밀번호 초기화"
                    >
                      <Key className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title={user.isActive ? '비활성화' : '활성화'}
                    >
                      {user.isActive ? (
                        <UserX className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          adminRepository={adminRepository}
          onClose={() => setShowCreateModal(false)}
          onCreated={(user, password) => {
            setUsers([user, ...users]);
            setShowCreateModal(false);
            setTempPassword(password);
            setShowResetModal(user);
          }}
        />
      )}

      {/* Password Display Modal */}
      {showResetModal && tempPassword && (
        <PasswordDisplayModal
          user={showResetModal}
          password={tempPassword}
          onClose={() => {
            setShowResetModal(null);
            setTempPassword(null);
          }}
        />
      )}
    </motion.div>
  );
}

// 사용자 생성 모달
function CreateUserModal({
  adminRepository,
  onClose,
  onCreated,
}: {
  adminRepository: ReturnType<typeof useAdminRepository>;
  onClose: () => void;
  onCreated: (user: AuthUser, tempPassword: string) => void;
}) {
  const [form, setForm] = useState<CreateUserDTO>({
    username: '',
    name: '',
    password: '123456789',
    email: '',
    department: '',
    position: '',
    role: 'member',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, tempPassword } = await adminRepository.createUser(form);
      onCreated(user, tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="aboard-card w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">새 계정 생성</h2>
            <p className="text-xs text-muted-foreground">새로운 팀원 계정을 생성합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                아이디 (로그인용) *
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="aboard-input"
                placeholder="예: 홍길동"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                이름 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="aboard-input"
                placeholder="예: 홍길동"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              초기 비밀번호
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="aboard-input"
              placeholder="기본값: 123456789"
            />
            <p className="text-xs text-muted-foreground mt-1">
              비워두면 기본 비밀번호 123456789가 설정됩니다
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                부서
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="aboard-input"
                placeholder="예: 물리치료실"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                직책
              </label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="aboard-input"
                placeholder="예: 물리치료사"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              이메일 (선택)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="aboard-input"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              권한
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'member' })}
              className="aboard-input"
            >
              <option value="member">멤버</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="aboard-btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="aboard-btn-primary disabled:opacity-50"
            >
              {loading ? '생성 중...' : '계정 생성'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// 비밀번호 표시 모달
function PasswordDisplayModal({
  user,
  password,
  onClose,
}: {
  user: AuthUser;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`아이디: ${user.username}\n비밀번호: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="aboard-card w-full max-w-sm p-6"
      >
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl widget-icon-green flex items-center justify-center mb-4">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">계정 정보</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {user.name}님에게 아래 정보를 전달해주세요
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">아이디</p>
              <p className="font-mono text-lg font-semibold text-foreground">{user.username}</p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">초기 비밀번호</p>
              <p className="font-mono text-lg font-semibold text-foreground">{password}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>첫 로그인 시 비밀번호 변경이 필요합니다</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 aboard-btn-secondary"
          >
            {copied ? '복사됨!' : '복사하기'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 aboard-btn-primary"
          >
            확인
          </button>
        </div>
      </motion.div>
    </div>
  );
}
