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
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 lg:bottom-8 lg:right-8">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="absolute bottom-16 right-0 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    >
                        {actions.map((action) => (
                            <button
                                key={action.label}
                                type="button"
                                onClick={() => handleAction(action.onClick)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
                            >
                                <action.icon className="h-4 w-4 text-primary" />
                                {action.label}
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
    );
}
