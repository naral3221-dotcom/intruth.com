import { NavLink } from 'react-router-dom';
import { cn } from '@/core/utils/cn';
import { MOBILE_BOTTOM_NAV_ITEMS } from './navigationConfig';

export function MobileBottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
