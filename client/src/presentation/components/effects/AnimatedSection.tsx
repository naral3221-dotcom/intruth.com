import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useViewportAnimation, useStaggerAnimation } from "../../hooks/useViewportAnimation";

type AnimationType = "fadeIn" | "fadeInUp" | "fadeInDown" | "fadeInLeft" | "fadeInRight" |
    "scaleIn" | "rotateIn" | "flipIn" | "bounceIn" | "slideIn";

interface AnimatedSectionProps {
    children: ReactNode;
    animation?: AnimationType;
    delay?: number;
    duration?: number;
    className?: string;
    once?: boolean;
    threshold?: number;
}

export function AnimatedSection({
    children,
    animation = "fadeInUp",
    delay = 0,
    duration = 0.6,
    className = "",
    once = true,
    threshold = 0.2,
}: AnimatedSectionProps) {
    const { ref, controls, variants } = useViewportAnimation({
        variant: animation,
        delay,
        duration,
        once,
        threshold,
    });

    return (
        <motion.div
            ref={ref as React.RefObject<HTMLDivElement>}
            initial="hidden"
            animate={controls}
            variants={variants}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface AnimatedListProps {
    children: ReactNode[];
    animation?: AnimationType;
    staggerDelay?: number;
    className?: string;
    itemClassName?: string;
    once?: boolean;
}

export function AnimatedList({
    children,
    animation = "fadeInUp",
    staggerDelay: _staggerDelay = 0.1,
    className = "",
    itemClassName = "",
    once = true,
}: AnimatedListProps) {
    const { ref, controls, containerVariants, itemVariants } = useStaggerAnimation(
        children.length,
        { variant: animation, once }
    );

    return (
        <motion.div
            ref={ref as React.RefObject<HTMLDivElement>}
            initial="hidden"
            animate={controls}
            variants={containerVariants}
            className={className}
        >
            {children.map((child, index) => (
                <motion.div
                    key={index}
                    variants={itemVariants}
                    className={itemClassName}
                    custom={index}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}

interface Parallax3DSectionProps {
    children: ReactNode;
    className?: string;
    depth?: number;
    rotateIntensity?: number;
}

export function Parallax3DSection({
    children,
    className = "",
    depth = 50,
    rotateIntensity = 5,
}: Parallax3DSectionProps) {
    return (
        <motion.div
            className={`relative ${className}`}
            style={{ perspective: 1000 }}
            initial={{ opacity: 0, z: -depth, rotateX: rotateIntensity }}
            whileInView={{
                opacity: 1,
                z: 0,
                rotateX: 0,
                transition: {
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    duration: 0.8,
                },
            }}
            viewport={{ once: true, amount: 0.3 }}
        >
            <motion.div style={{ transformStyle: "preserve-3d" }}>
                {children}
            </motion.div>
        </motion.div>
    );
}

interface FloatingElementProps {
    children: ReactNode;
    className?: string;
    floatIntensity?: number;
    rotateIntensity?: number;
    duration?: number;
}

export function FloatingElement({
    children,
    className = "",
    floatIntensity = 10,
    rotateIntensity = 3,
    duration = 4,
}: FloatingElementProps) {
    return (
        <motion.div
            className={className}
            animate={{
                y: [-floatIntensity, floatIntensity, -floatIntensity],
                rotate: [-rotateIntensity, rotateIntensity, -rotateIntensity],
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    );
}

interface GlowingBorderProps {
    children: ReactNode;
    className?: string;
    colors?: string[];
    blur?: number;
    animated?: boolean;
}

export function GlowingBorder({
    children,
    className = "",
    colors = ["#00FFFF", "#E040FB", "#00FFFF"],
    blur = 20,
    animated = true,
}: GlowingBorderProps) {
    const gradient = `linear-gradient(135deg, ${colors.join(", ")})`;

    return (
        <div className={`relative ${className}`}>
            <motion.div
                className="absolute -inset-px rounded-xl opacity-60 -z-10"
                style={{
                    background: gradient,
                    filter: `blur(${blur}px)`,
                }}
                animate={animated ? {
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.02, 1],
                } : undefined}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            {children}
        </div>
    );
}
