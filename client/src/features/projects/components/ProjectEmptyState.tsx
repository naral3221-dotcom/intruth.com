import { motion } from "framer-motion";
import { FolderKanban, Plus } from "lucide-react";
import { Card } from "@/presentation/components/ui/Card";

interface ProjectEmptyStateProps {
    onCreateProject: () => void;
}

export function ProjectEmptyState({ onCreateProject }: ProjectEmptyStateProps) {
    return (
        <Card className="py-16 text-center">
            <motion.div
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
            >
                <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </motion.div>
            <p className="text-muted-foreground mb-2 font-medium">프로젝트가 없습니다</p>
            <p className="text-sm text-muted-foreground mb-6">첫 프로젝트를 생성하여 시작하세요</p>
            <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                onClick={onCreateProject}
            >
                <Plus className="w-4 h-4" /> 첫 프로젝트 만들기
            </button>
        </Card>
    );
}
