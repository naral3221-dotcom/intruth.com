import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, Shield } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useMemberStore } from '@/stores/memberStore';
import { useUIStore } from '@/stores/uiStore';

const roleOptions = [
  { value: 'member', label: '팀원', description: '기본 권한' },
  { value: 'admin', label: '관리자', description: '전체 권한' },
];

export function InviteMemberModal() {
  const { isInviteMemberModalOpen, closeInviteMemberModal } = useUIStore();
  const { inviteMember } = useMemberStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await inviteMember(email, role);
      setSuccess(true);
      setTimeout(() => {
        setEmail('');
        setRole('member');
        setSuccess(false);
        closeInviteMemberModal();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setError(null);
    setSuccess(false);
    closeInviteMemberModal();
  };

  return (
    <AnimatePresence>
      {isInviteMemberModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  팀원 초대
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm"
                  >
                    초대가 완료되었습니다!
                  </motion.div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="aboard-input"
                    autoFocus
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Shield className="w-4 h-4 inline mr-2" />
                    역할
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {roleOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all',
                          role === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/30 hover:bg-muted'
                        )}
                      >
                        <div className="font-medium text-foreground">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="aboard-btn-secondary flex-1"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success}
                    className={cn(
                      'aboard-btn-primary flex-1',
                      (loading || success) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loading ? '초대 중...' : success ? '완료!' : '초대하기'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
