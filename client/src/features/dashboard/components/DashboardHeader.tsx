import { motion } from "framer-motion";
import { AnimatedSection, FloatingElement } from "@/presentation/components/effects/AnimatedSection";

interface DashboardHeaderProps {
    userName: string;
    welcomeMessage: string;
}

export function DashboardHeader({ userName, welcomeMessage }: DashboardHeaderProps) {
    return (
        <AnimatedSection animation="fadeInDown" className="mb-10">
            <header>
                <FloatingElement floatIntensity={3} rotateIntensity={1} duration={6}>
                    <motion.h1
                        className="text-4xl font-bold text-white mb-2 tracking-tight"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        안녕하세요, <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-violet to-neon-teal">{userName}님</span>
                    </motion.h1>
                </FloatingElement>
                <p className="text-gray-400">{welcomeMessage}</p>
            </header>
        </AnimatedSection>
    );
}
