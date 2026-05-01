import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ClipboardPlus, FileText, FolderPlus, Plus, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export function QuickAddButton() {
    const [isOpen, setIsOpen] = useState(false);
    const {
        openCreateTaskModal,
        openCreateProjectModal,
        openCreateMeetingModal,
        openCreateRoutineModal,
    } = useUIStore();

    const actions = [
        {
            label: "새 업무",
            icon: ClipboardPlus,
            onClick: () => openCreateTaskModal(),
        },
        {
            label: "새 회의",
            icon: FileText,
            onClick: openCreateMeetingModal,
        },
        {
            label: "새 루틴",
            icon: CalendarPlus,
            onClick: () => openCreateRoutineModal(),
        },
        {
            label: "새 프로젝트",
            icon: FolderPlus,
            onClick: openCreateProjectModal,
        },
    ];

    const handleAction = (onClick: () => void) => {
        setIsOpen(false);
        onClick();
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.button
                        type="button"
                        aria-label="빠른 추가 메뉴 닫기"
                        className="fixed inset-0 z-[55] bg-background/70 backdrop-blur-[2px] lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] lg:bottom-8 lg:right-8">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="absolute bottom-16 right-0 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900"
                            initial={{ opacity: 0, y: 10, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        >
                            {actions.map((action) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => handleAction(action.onClick)}
                                    className="flex min-h-12 w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left text-sm font-semibold text-foreground last:border-b-0 hover:bg-muted"
                                >
                                    <action.icon className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="whitespace-nowrap">{action.label}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.button
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    onClick={() => setIsOpen((value) => !value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="빠른 추가"
                    aria-label="빠른 추가"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </motion.button>
            </div>
        </>
    );
}
