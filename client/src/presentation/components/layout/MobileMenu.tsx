import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Shield, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthRepository } from "@/di";
import { cn } from "@/core/utils/cn";
import {
    FUTURE_EDITOR_NAV_ITEM,
    MAIN_NAV_ITEMS,
    isNavigationItemActive,
} from "./navigationConfig";

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
    const { user, logout, isAdmin } = useAuthStore();
    const authRepository = useAuthRepository();
    const navigate = useNavigate();
    const location = useLocation();

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
                    className="fixed inset-0 z-[100] bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50 lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-white dark:bg-slate-950"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <div className="relative z-10 flex h-full flex-col bg-white dark:bg-slate-950">
                        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                                    <span className="text-sm font-black tracking-normal">IN</span>
                                </div>
                                <span className="text-xl font-black tracking-normal">INTRUTH</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="-mr-2 rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                                aria-label="메뉴 닫기"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                            <div className="space-y-2">
                                {MAIN_NAV_ITEMS.map((item, index) => {
                                    const active = isNavigationItemActive(location.pathname, item);
                                    return (
                                        <motion.div
                                            key={item.path}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03, duration: 0.2 }}
                                            className={cn(
                                                item.children?.length && "rounded-2xl border border-slate-200 p-1 dark:border-slate-800"
                                            )}
                                        >
                                            <NavLink
                                                to={item.path}
                                                onClick={onClose}
                                                className={cn(
                                                    "flex min-h-14 items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                                                    active
                                                        ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-slate-50"
                                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                                                )}
                                            >
                                                <item.icon className="w-5 h-5" />
                                                <span className="text-base font-semibold">{item.label}</span>
                                            </NavLink>

                                            {item.children?.length ? (
                                                <div className="mt-1 space-y-1 pb-1 pl-9">
                                                    {item.children.map((child) => {
                                                        const childActive = isNavigationItemActive(location.pathname, child);
                                                        return (
                                                            <NavLink
                                                                key={child.path}
                                                                to={child.path}
                                                                onClick={onClose}
                                                                className={cn(
                                                                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                                                                    childActive
                                                                        ? "bg-primary/10 text-primary"
                                                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                                                                )}
                                                            >
                                                                <child.icon className="w-4 h-4" />
                                                                <span className="text-sm font-semibold">{child.label}</span>
                                                            </NavLink>
                                                        );
                                                    })}
                                                    <div className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-slate-400 dark:text-slate-600">
                                                        <FUTURE_EDITOR_NAV_ITEM.icon className="w-4 h-4" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold">{FUTURE_EDITOR_NAV_ITEM.label}</span>
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-900">
                                                                    준비중
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 text-xs">
                                                                {FUTURE_EDITOR_NAV_ITEM.children.join(", ")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </motion.div>
                                    );
                                })}

                                {isAdmin() && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: MAIN_NAV_ITEMS.length * 0.03, duration: 0.2 }}
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

                        <motion.div
                            className="shrink-0 border-t border-slate-200 bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900"
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
                                    <p className="text-sm text-muted-foreground truncate">{user?.username || user?.email}</p>
                                </div>
                            </div>
                            <button
                                type="button"
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
