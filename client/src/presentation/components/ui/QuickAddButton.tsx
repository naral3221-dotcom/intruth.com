import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export function QuickAddButton() {
    const { openCreateProjectModal } = useUIStore();

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <motion.button
                className="w-14 h-14 rounded-full flex items-center justify-center bg-primary shadow-apple-lg dark:shadow-apple-dark-lg"
                onClick={openCreateProjectModal}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="새 프로젝트"
            >
                <Plus className="w-6 h-6 text-primary-foreground" />
            </motion.button>
        </div>
    );
}
