import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '프로젝트', href: '/projects', icon: FolderKanban },
  { name: '팀원', href: '/members', icon: Users },
  { name: '설정', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { logout, user: member } = useAuthStore();

  return (
    <aside className="flex h-screen w-64 flex-col bg-white border-r border-gray-100 shadow-sm">
      {/* Logo - 그라디언트와 깊이감 */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-100">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white font-bold shadow-lg shadow-blue-500/25">
          <span className="text-lg relative z-10">W</span>
          <div className="absolute inset-0 rounded-xl bg-linear-to-t from-black/10 to-transparent" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900">Workflow</span>
          <span className="text-[10px] text-gray-400 font-medium -mt-0.5">Task Management</span>
        </div>
      </div>

      {/* Navigation - 더 명확한 활성 상태 */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-linear-to-r from-blue-50 to-blue-50/30 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* 활성 상태 표시 바 */}
                <div
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full transition-all duration-200',
                    isActive
                      ? 'bg-linear-to-b from-blue-500 to-blue-600 opacity-100'
                      : 'opacity-0'
                  )}
                />

                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>

                <span className="flex-1">{item.name}</span>

                {/* 호버시 화살표 표시 */}
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-all duration-200',
                    isActive
                      ? 'opacity-100 text-blue-500'
                      : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-gray-400'
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile - 더 매력적인 디자인 */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-xl p-3 bg-linear-to-r from-gray-50 to-gray-50/50 hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group cursor-pointer">
          {/* 그라디언트 아바타 */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white shadow-md shadow-blue-500/20">
            {member?.name?.charAt(0) || 'U'}
            {/* 온라인 상태 */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {member?.name || '사용자'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {member?.email || ''}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all duration-200 opacity-0 group-hover:opacity-100"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
