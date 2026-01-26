import { useInView, useAnimation, type Variants } from "framer-motion";
import { useRef, useEffect, type RefObject } from "react";

type AnimationVariant = "fadeIn" | "fadeInUp" | "fadeInDown" | "fadeInLeft" | "fadeInRight" |
    "scaleIn" | "rotateIn" | "flipIn" | "bounceIn" | "slideIn";

interface ViewportAnimationOptions {
    variant?: AnimationVariant;
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
    stiffness?: number;
    damping?: number;
}

// Predefined animation variants
const animationVariants: Record<AnimationVariant, Variants> = {
    fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
    fadeInUp: {
        hidden: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0 },
    },
    fadeInDown: {
        hidden: { opacity: 0, y: -60 },
        visible: { opacity: 1, y: 0 },
    },
    fadeInLeft: {
        hidden: { opacity: 0, x: -60 },
        visible: { opacity: 1, x: 0 },
    },
    fadeInRight: {
        hidden: { opacity: 0, x: 60 },
        visible: { opacity: 1, x: 0 },
    },
    scaleIn: {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 },
    },
    rotateIn: {
        hidden: { opacity: 0, rotate: -15, scale: 0.9 },
        visible: { opacity: 1, rotate: 0, scale: 1 },
    },
    flipIn: {
        hidden: { opacity: 0, rotateX: 90 },
        visible: { opacity: 1, rotateX: 0 },
    },
    bounceIn: {
        hidden: { opacity: 0, scale: 0.3 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 10,
            }
        },
    },
    slideIn: {
        hidden: { opacity: 0, x: -100, rotateY: -30 },
        visible: { opacity: 1, x: 0, rotateY: 0 },
    },
};

export function useViewportAnimation(options: ViewportAnimationOptions = {}) {
    const {
        variant = "fadeInUp",
        delay = 0,
        duration = 0.6,
        threshold = 0.2,
        once = true,
        stiffness = 100,
        damping = 15,
    } = options;

    const ref = useRef<HTMLElement>(null);
    const controls = useAnimation();
    const isInView = useInView(ref, {
        amount: threshold,
        once,
    });

    useEffect(() => {
        if (isInView) {
            controls.start("visible");
        } else if (!once) {
            controls.start("hidden");
        }
    }, [isInView, controls, once]);

    const baseVariants = animationVariants[variant];
    const visibleBase = baseVariants.visible as Record<string, unknown>;

    const variants: Variants = {
        hidden: baseVariants.hidden,
        visible: {
            ...visibleBase,
            transition: {
                type: "spring",
                stiffness,
                damping,
                delay,
                duration,
                ...(visibleBase?.transition as Record<string, unknown> || {}),
            },
        },
    };

    return {
        ref: ref as RefObject<HTMLElement>,
        controls,
        isInView,
        variants,
    };
}

export function useStaggerAnimation(_itemCount: number, options: ViewportAnimationOptions = {}) {
    const {
        variant = "fadeInUp",
        delay = 0,
        duration = 0.5,
        threshold = 0.1,
        once = true,
    } = options;

    const ref = useRef<HTMLElement>(null);
    const controls = useAnimation();
    const isInView = useInView(ref, { amount: threshold, once });

    useEffect(() => {
        if (isInView) {
            controls.start("visible");
        } else if (!once) {
            controls.start("hidden");
        }
    }, [isInView, controls, once]);

    const baseVariants = animationVariants[variant];
    const visibleBase = baseVariants.visible as Record<string, unknown>;

    const containerVariants: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.1,
                delayChildren: delay,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: baseVariants.hidden,
        visible: {
            ...visibleBase,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                duration,
            },
        },
    };

    return {
        ref: ref as RefObject<HTMLElement>,
        controls,
        isInView,
        containerVariants,
        itemVariants,
    };
}
