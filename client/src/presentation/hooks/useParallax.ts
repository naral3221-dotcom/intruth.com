import { useScroll, useTransform, useSpring, type MotionValue } from "framer-motion";
import { useRef, type RefObject } from "react";

interface ParallaxOptions {
    /** Parallax intensity (0.1 = subtle, 1 = strong) */
    intensity?: number;
    /** Spring stiffness */
    stiffness?: number;
    /** Spring damping */
    damping?: number;
    /** Scroll offset range */
    offset?: ["start" | "center" | "end", "start" | "center" | "end"];
}

interface ParallaxResult {
    ref: RefObject<HTMLElement>;
    y: MotionValue<number>;
    x: MotionValue<number>;
    scale: MotionValue<number>;
    opacity: MotionValue<number>;
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
}

/**
 * useParallax - Creates smooth parallax scrolling effects
 *
 * @example
 * const { ref, y, opacity } = useParallax({ intensity: 0.5 });
 * <motion.div ref={ref} style={{ y, opacity }}>Content</motion.div>
 */
export function useParallax(options: ParallaxOptions = {}): ParallaxResult {
    const {
        intensity = 0.3,
        stiffness = 100,
        damping = 20,
        offset = ["start", "end"],
    } = options;

    const ref = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: [`${offset[0]} end`, `${offset[1]} start`],
    });

    // Transform values based on scroll progress
    const yRange = 100 * intensity;
    const rawY = useTransform(scrollYProgress, [0, 1], [yRange, -yRange]);
    const rawX = useTransform(scrollYProgress, [0, 1], [-yRange * 0.5, yRange * 0.5]);
    const rawScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
    const rawOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const rawRotateX = useTransform(scrollYProgress, [0, 1], [15 * intensity, -15 * intensity]);
    const rawRotateY = useTransform(scrollYProgress, [0, 1], [-10 * intensity, 10 * intensity]);

    // Apply spring physics for smooth animations
    const springConfig = { stiffness, damping };
    const y = useSpring(rawY, springConfig);
    const x = useSpring(rawX, springConfig);
    const scale = useSpring(rawScale, springConfig);
    const opacity = useSpring(rawOpacity, springConfig);
    const rotateX = useSpring(rawRotateX, springConfig);
    const rotateY = useSpring(rawRotateY, springConfig);

    return {
        ref: ref as RefObject<HTMLElement>,
        y,
        x,
        scale,
        opacity,
        rotateX,
        rotateY,
    };
}

/**
 * useMouseParallax - Creates parallax effect based on mouse position
 */
export function useMouseParallax(intensity: number = 20) {
    const x = useSpring(0, { stiffness: 150, damping: 15 });
    const y = useSpring(0, { stiffness: 150, damping: 15 });

    const handleMouseMove = (e: MouseEvent) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const offsetX = ((e.clientX - centerX) / centerX) * intensity;
        const offsetY = ((e.clientY - centerY) / centerY) * intensity;

        x.set(offsetX);
        y.set(offsetY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return {
        x,
        y,
        handlers: {
            onMouseMove: handleMouseMove,
            onMouseLeave: handleMouseLeave,
        },
    };
}
