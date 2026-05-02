import type { ComponentType } from 'react';
import {
  ClipboardList,
  FileText,
  Files,
  FolderKanban,
  Home,
  Image,
  Kanban,
  ListTodo,
  Settings,
  Users,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

export interface FutureNavigationItem {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: string[];
}

export const PROJECT_CHILD_NAV_ITEMS: NavigationItem[] = [
  { label: '프로젝트 홈', path: '/projects', icon: FolderKanban },
  { label: '칸반보드', path: '/tasks', icon: Kanban },
  { label: '내 할일', path: '/my-tasks', icon: ListTodo },
];

export const FUTURE_EDITOR_NAV_ITEM: FutureNavigationItem = {
  label: '편집',
  description: '추후 추가 예정',
  icon: Image,
  children: ['주보', '이미지'],
};

export const MAIN_NAV_ITEMS: NavigationItem[] = [
  { label: '대시보드', path: '/', icon: Home },
  { label: '회의자료', path: '/meetings', icon: FileText },
  {
    label: '프로젝트',
    path: '/projects',
    icon: FolderKanban,
    children: PROJECT_CHILD_NAV_ITEMS,
  },
  { label: '파일관리', path: '/files', icon: Files },
  { label: '팀', path: '/team', icon: Users },
  { label: '설정', path: '/settings', icon: Settings },
];

export const MOBILE_BOTTOM_NAV_ITEMS: NavigationItem[] = [
  { label: '대시보드', path: '/', icon: Home },
  { label: '회의자료', path: '/meetings', icon: FileText },
  { label: '프로젝트', path: '/projects', icon: ClipboardList },
  { label: '파일', path: '/files', icon: Files },
  { label: '팀', path: '/team', icon: Users },
];

export function isNavigationItemActive(pathname: string, item: NavigationItem): boolean {
  if (item.path === '/') {
    return pathname === '/';
  }

  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
    return true;
  }

  return item.children?.some((child) => isNavigationItemActive(pathname, child)) ?? false;
}
