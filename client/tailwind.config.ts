import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Apple Style Colors
                apple: {
                    blue: "#0071e3",
                    "blue-hover": "#0077ed",
                    "blue-dark": "#2997ff",
                    gray: {
                        50: "#f5f5f7",
                        100: "#e8e8ed",
                        200: "#d2d2d7",
                        300: "#86868b",
                        400: "#6e6e73",
                        500: "#1d1d1f",
                    }
                },
                // Timeline View Colors
                midnight: {
                    800: "#1e293b",
                    900: "#0f172a",
                },
                "neon-violet": "#8b5cf6",
                "neon-teal": "#14b8a6"
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "1rem",
                "2xl": "1.25rem",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "fade-out": {
                    from: { opacity: "1" },
                    to: { opacity: "0" },
                },
                "slide-in-from-top": {
                    from: { transform: "translateY(-10px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
                "slide-in-from-bottom": {
                    from: { transform: "translateY(10px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.2s ease-out",
                "fade-out": "fade-out 0.2s ease-out",
                "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
                "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
            },
            boxShadow: {
                'apple': '0 4px 12px rgba(0, 0, 0, 0.08)',
                'apple-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
                'apple-dark': '0 4px 12px rgba(0, 0, 0, 0.3)',
                'apple-dark-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'SF Pro Display',
                    'SF Pro Text',
                    'Pretendard',
                    'Noto Sans KR',
                    'sans-serif',
                ],
            },
        },
    },
    plugins: [tailwindAnimate],
} satisfies Config
