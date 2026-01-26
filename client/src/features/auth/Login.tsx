import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAuthRepository } from '@/di';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const authRepository = useAuthRepository();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user, mustChangePassword } = await authRepository.login({
        username,
        password,
      });
      login(token, user, mustChangePassword);

      if (mustChangePassword) {
        navigate('/settings?changePassword=true');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">INTRUTH</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              아이디
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
              placeholder="이름 또는 아이디"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 px-4 py-4 text-base font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '로그인 중...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            계정이 없으신가요? <span className="font-semibold text-gray-900">관리자에게 문의</span>
          </p>
        </div>
      </div>

      {/* Bottom text */}
      <div className="text-center pt-8">
        <p className="text-xs text-gray-400">
          By continuing, you agree to our{' '}
          <span className="font-medium text-gray-600">Terms of Service</span> and{' '}
          <span className="font-medium text-gray-600">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
