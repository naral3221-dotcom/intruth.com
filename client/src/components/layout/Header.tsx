import { Search, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* 검색창 - 더 명확한 입력 필드 */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            placeholder="검색..."
            className="h-10 w-72 rounded-xl border-2 border-gray-200 bg-white pl-10 pr-4 text-[15px]
                     placeholder:text-gray-400
                     hover:border-gray-300
                     focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10
                     transition-all duration-200"
          />
        </div>

        {/* 알림 버튼 - 더 눈에 띄는 배지 */}
        <button className="relative rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200 hover:scale-105 active:scale-95">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white" />
          </span>
        </button>
      </div>
    </header>
  );
}
