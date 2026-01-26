import { motion } from "framer-motion";
import { FolderKanban } from "lucide-react";
import { AnimatedSection, FloatingElement } from "@/presentation/components/effects/AnimatedSection";

export function ProjectHeader() {
    return (
        <AnimatedSection animation="fadeInDown" className="mb-8">
            <header>
                <FloatingElement floatIntensity={3} rotateIntensity={1} duration={6}>
                    <motion.h1
                        className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <FolderKanban className="w-10 h-10 text-neon-violet" />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-violet to-neon-teal">
                            프로젝트
                        </span>
                    </motion.h1>
                </FloatingElement>
                <p className="text-gray-400">모든 프로젝트를 한눈에 관리하세요</p>
            </header>
        </AnimatedSection>
    );
}
