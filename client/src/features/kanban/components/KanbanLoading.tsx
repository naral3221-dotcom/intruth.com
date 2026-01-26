import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FloatingElement } from "@/presentation/components/effects/AnimatedSection";

export function KanbanLoading() {
    return (
        <div className="flex h-full items-center justify-center">
            <FloatingElement floatIntensity={15} rotateIntensity={5}>
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        className="h-16 w-16 rounded-full border-4 border-neon-violet border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-neon-violet animate-pulse" />
                        <p className="text-gray-400 animate-pulse">칸반 보드를 준비하는 중...</p>
                    </div>
                </div>
            </FloatingElement>
        </div>
    );
}
