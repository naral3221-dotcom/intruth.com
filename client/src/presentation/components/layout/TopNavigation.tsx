import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Search,
    Shield,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthRepository } from "@/di";
import { cn } from "@/core/utils/cn";
import { MobileMenu } from "./MobileMenu";
import {
    FUTURE_EDITOR_NAV_ITEM,
    MAIN_NAV_ITEMS,
    isNavigationItemActive,
    type NavigationItem,
} from "./navigationConfig";

function DesktopNavItem({ item }: { item: NavigationItem }) {
    const location = useLocation();
    const active = isNavigationItemActive(location.pathname, item);

    if (!item.children?.length) {
        return (
            <NavLink
                to={item.path}
                className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
            >
                {item.label}
            </NavLink>
        );
    }

    return (
        <div className="group relative">
            <NavLink
                to={item.path}
                className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
            >
                {item.label}
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </NavLink>

            <div className="invisible absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                <div className="space-y-1">
                    {item.children.map((child) => {
                        const childActive = isNavigationItemActive(location.pathname, child);
                        return (
                            <NavLink
                                key={child.path}
                                to={child.path}
                                className={cn(
                                    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    childActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <child.icon className="h-4 w-4" />
                                <span className="font-medium">{child.label}</span>
                            </NavLink>
                        );
                    })}
                </div>

                <div className="mt-2 border-t border-border pt-2">
                    <div className="flex items-start gap-3 rounded-lg px-3 py-2 text-muted-foreground/70">
                        <FUTURE_EDITOR_NAV_ITEM.icon className="mt-0.5 h-4 w-4" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{FUTURE_EDITOR_NAV_ITEM.label}</span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                                    준비중
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs">
                                {FUTURE_EDITOR_NAV_ITEM.children.join(", ")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TopNavigation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const { user, logout, isAdmin } = useAuthStore();
    const authRepository = useAuthRepository();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await authRepository.logout();
        } catch {
            // 로그아웃 API 실패해도 로컬 상태는 클리어
        }
        logout();
        navigate('/login');
        setUserMenuOpen(false);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <header className={cn(
                "fixed top-0 left-0 right-0 z-50",
                "h-14",
                "bg-white dark:bg-slate-900 border-b border-border",
                "shadow-sm"
            )}>
                <nav className="max-w-[1400px] mx-auto h-full px-4 lg:px-6 flex items-center justify-between">
                    <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
                            <span className="text-sm font-black tracking-normal">IN</span>
                        </div>
                        <span className="text-xl font-black tracking-normal text-foreground">INTRUTH</span>
                    </NavLink>

                    <div className="hidden lg:flex items-center gap-0.5">
                        {MAIN_NAV_ITEMS.map((item) => (
                            <DesktopNavItem key={item.path} item={item} />
                        ))}
                        {isAdmin() && (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                                    isActive
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                        : "text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                )}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                관리자
                            </NavLink>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label="검색"
                            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Search className="w-[18px] h-[18px]" />
                        </button>

                        <button
                            type="button"
                            aria-label="알림"
                            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
                        >
                            <Bell className="w-[18px] h-[18px]" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                        </button>

                        <div className="hidden lg:block w-px h-6 bg-border mx-2" />

                        <div className="hidden lg:block relative" ref={userMenuRef}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                                    "hover:bg-muted",
                                    userMenuOpen && "bg-muted"
                                )}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                                    {user?.name?.charAt(0) || 'G'}
                                </div>
                                <div className="text-left hidden xl:block">
                                    <span className="text-sm font-medium block leading-tight">
                                        {user?.name || '게스트'}
                                    </span>
                                    <span className="text-xs text-muted-foreground leading-tight">
                                        {user?.position || '팀원'}
                                    </span>
                                </div>
                                <ChevronDown className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform",
                                    userMenuOpen && "rotate-180"
                                )} />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-medium shadow-sm">
                                                {user?.name?.charAt(0) || 'G'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user?.username || user?.email}</p>
                                            </div>
                                        </div>
                                        {isAdmin() && (
                                            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                관리자
                                            </span>
                                        )}
                                    </div>
                                    <div className="py-1">
                                        <NavLink
                                            to="/settings"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                        >
                                            설정
                                        </NavLink>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            로그아웃
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="메뉴 열기"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </nav>
            </header>

            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />
        </>
    );
}
