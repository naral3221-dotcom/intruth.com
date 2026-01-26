import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Menu,
    ChevronDown,
    LogOut,
    Settings,
    Shield,
    Home,
    User,
    Briefcase,
    Users,
    FileText,
    Search,
    Bell,
    ClipboardCheck
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthRepository } from "@/di";
import { cn } from "@/core/utils/cn";
import { MobileMenu } from "./MobileMenu";

const NAV_ITEMS = [
    { label: "Home", path: "/", icon: Home },
    { label: "내 할일", path: "/my-tasks", icon: User },
    { label: "칸반", path: "/tasks", icon: Briefcase },
    { label: "프로젝트", path: "/projects", icon: Briefcase },
    { label: "팀", path: "/team", icon: Users },
    { label: "회의", path: "/meetings", icon: FileText },
    { label: "셀 출석", path: "/attendance", icon: ClipboardCheck },
];

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

    // Close user menu when clicking outside
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
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm2 4v-2H3c0 1.1.9 2 2 2zM3 9h2V7H3v2zm12 12h2v-2h-2v2zm4-18H9c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H9V5h10v10zm-8 6h2v-2h-2v2zm-4 0h2v-2H7v2z"/>
                            </svg>
                        </div>
                        <span className="font-semibold text-lg hidden sm:block text-foreground">WorkFlow</span>
                    </NavLink>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-0.5">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                        {/* Admin Link */}
                        {isAdmin() && (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
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

                    {/* Right Section */}
                    <div className="flex items-center gap-1">
                        {/* Search Button */}
                        <button className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Search className="w-[18px] h-[18px]" />
                        </button>

                        {/* Notifications */}
                        <button className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
                            <Bell className="w-[18px] h-[18px]" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                        </button>

                        {/* Settings Link (Desktop) */}
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => cn(
                                "hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                                isActive
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Settings className="w-[18px] h-[18px]" />
                        </NavLink>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-6 bg-border mx-2" />

                        {/* User Menu (Desktop) */}
                        <div className="hidden lg:block relative" ref={userMenuRef}>
                            <button
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

                            {/* Dropdown Menu */}
                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-medium shadow-sm">
                                                {user?.name?.charAt(0) || 'G'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
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
                                            <Settings className="w-4 h-4 text-muted-foreground" />
                                            설정
                                        </NavLink>
                                        <button
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

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="메뉴 열기"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />
        </>
    );
}
