import { useMotionValue, useSpring, type MotionValue } from "framer-motion";
import { useRef, useCallback, type RefObject } from "react";

interface MagneticOptions {
    /** How strongly the element follows the cursor (0.1 = subtle, 1 = follows cursor exactly) */
    strength?: number;
    /** Distance in pixels at which the magnetic effect activates */
    distance?: number;
    /** Spring stiffness */
    stiffness?: number;
    /** Spring damping */
    damping?: number;
}

interface MagneticResult {
    ref: RefObject<HTMLElement>;
    x: MotionValue<number>;
    y: MotionValue<number>;
    scale: MotionValue<number>;
    isHovered: MotionValue<number>;
    handlers: {
        onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
        onMouseLeave: () => void;
        onMouseEnter: () => void;
    };
}

/**
 * useMagneticEffect - Creates a magnetic hover effect where elements follow the cursor
 *
 * @example
 * const { ref, x, y, scale, handlers } = useMagneticEffect({ strength: 0.4 });
 * <motion.button ref={ref} style={{ x, y, scale }} {...handlers}>Click me</motion.button>
 */
export function useMagneticEffect(options: MagneticOptions = {}): MagneticResult {
    const {
        strength = 0.3,
        distance = 100,
        stiffness = 150,
        damping = 15,
    } = options;

    const ref = useRef<HTMLElement>(null);

    // Raw motion values
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const rawScale = useMotionValue(1);
    const isHovered = useMotionValue(0);

    // Apply spring physics
    const springConfig = { stiffness, damping };
    const x = useSpring(rawX, springConfig);
    const y = useSpring(rawY, springConfig);
    const scale = useSpring(rawScale, springConfig);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        const distanceFromCenter = Math.sqrt(distanceX ** 2 + distanceY ** 2);

        // Only apply effect within the specified distance
        if (distanceFromCenter < distance) {
            rawX.set(distanceX * strength);
            rawY.set(distanceY * strength);
        }
    }, [strength, distance, rawX, rawY]);

    const onMouseLeave = useCallback(() => {
        rawX.set(0);
        rawY.set(0);
        rawScale.set(1);
        isHovered.set(0);
    }, [rawX, rawY, rawScale, isHovered]);

    const onMouseEnter = useCallback(() => {
        rawScale.set(1.1);
        isHovered.set(1);
    }, [rawScale, isHovered]);

    return {
        ref: ref as RefObject<HTMLElement>,
        x,
        y,
        scale,
        isHovered,
        handlers: {
            onMouseMove,
            onMouseLeave,
            onMouseEnter,
        },
    };
}

/**
 * useRepelEffect - Opposite of magnetic, pushes element away from cursor
 */
export function useRepelEffect(options: MagneticOptions = {}) {
    const magnetic = useMagneticEffect({
        ...options,
        strength: -(options.strength ?? 0.3),
    });

    return magnetic;
}
