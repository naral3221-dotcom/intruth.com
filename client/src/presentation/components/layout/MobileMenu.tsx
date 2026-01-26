import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { X, Home, ClipboardList, Kanban, Layout, Users, FileText, Settings, Shield, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthRepository } from "@/di";
import { cn } from "@/core/utils/cn";

const NAV_ITEMS = [
    { icon: Home, label: "대시보드", path: "/" },
    { icon: ClipboardList, label: "내 할일", path: "/my-tasks" },
    { icon: Kanban, label: "칸반 보드", path: "/tasks" },
    { icon: Layout, label: "프로젝트", path: "/projects" },
    { icon: Users, label: "팀", path: "/team" },
    { icon: FileText, label: "회의자료", path: "/meetings" },
    { icon: Settings, label: "설정", path: "/settings" },
];

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
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
        onClose();
    };

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-background"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                                    <span className="text-background font-bold text-sm">W</span>
                                </div>
                                <span className="font-semibold text-lg">WorkFlow</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 rounded-lg hover:bg-foreground/5 transition-colors"
                                aria-label="메뉴 닫기"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex-1 overflow-y-auto px-4 py-6">
                            <div className="space-y-1">
                                {NAV_ITEMS.map((item, index) => (
                                    <motion.div
                                        key={item.path}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.2 }}
                                    >
                                        <NavLink
                                            to={item.path}
                                            onClick={onClose}
                                            className={({ isActive }) => cn(
                                                "flex items-center gap-4 px-4 py-4 rounded-xl transition-colors",
                                                isActive
                                                    ? "bg-foreground/5 text-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                            )}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span className="text-lg font-medium">{item.label}</span>
                                        </NavLink>
                                    </motion.div>
                                ))}

                                {/* Admin Menu */}
                                {isAdmin() && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: NAV_ITEMS.length * 0.03, duration: 0.2 }}
                                    >
                                        <div className="pt-4 pb-2">
                                            <div className="border-t border-border" />
                                            <p className="text-xs text-muted-foreground mt-4 px-4">관리자</p>
                                        </div>
                                        <NavLink
                                            to="/admin"
                                            onClick={onClose}
                                            className={({ isActive }) => cn(
                                                "flex items-center gap-4 px-4 py-4 rounded-xl transition-colors",
                                                isActive
                                                    ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                                    : "text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                                            )}
                                        >
                                            <Shield className="w-5 h-5" />
                                            <span className="text-lg font-medium">사용자 관리</span>
                                        </NavLink>
                                    </motion.div>
                                )}
                            </div>
                        </nav>

                        {/* User Section */}
                        <motion.div
                            className="border-t border-border p-4 bg-secondary/50"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.2 }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                                    {user?.name?.charAt(0) || 'G'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium truncate">{user?.name || '게스트'}</p>
                                        {isAdmin() && (
                                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                관리자
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                로그아웃
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
