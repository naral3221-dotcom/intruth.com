import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/core/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "outlined" | "elevated" | "ghost" | "aboard";
    padding?: "none" | "sm" | "md" | "lg";
    hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", padding = "md", hover = false, children, ...props }, ref) => {
        const variants = {
            default: "bg-card border border-border",
            outlined: "bg-transparent border border-border",
            elevated: "bg-card shadow-sm",
            ghost: "bg-transparent",
            aboard: "bg-card shadow-sm hover:shadow-md",
        };

        const paddings = {
            none: "",
            sm: "p-4",
            md: "p-5",
            lg: "p-6",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl transition-all duration-200",
                    variants[variant],
                    paddings[padding],
                    hover && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    iconBg?: string;
    action?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, icon, iconBg, action, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex items-start justify-between mb-4", className)}
            {...props}
        >
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
                        {icon}
                    </div>
                )}
                <div className="flex flex-col space-y-0.5">
                    {children}
                </div>
            </div>
            {action}
        </div>
    )
);

CardHeader.displayName = "CardHeader";

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, children, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("font-semibold text-foreground leading-none", className)}
            {...props}
        >
            {children}
        </h3>
    )
);

CardTitle.displayName = "CardTitle";

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className, children, ...props }, ref) => (
        <p
            ref={ref}
            className={cn("text-xs text-muted-foreground", className)}
            {...props}
        >
            {children}
        </p>
    )
);

CardDescription.displayName = "CardDescription";

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("", className)}
            {...props}
        >
            {children}
        </div>
    )
);

CardContent.displayName = "CardContent";

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex items-center pt-4 border-t border-border mt-4", className)}
            {...props}
        >
            {children}
        </div>
    )
);

CardFooter.displayName = "CardFooter";

// Aboard Style Widget Card
interface WidgetCardProps extends HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    iconBg?: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

const WidgetCard = forwardRef<HTMLDivElement, WidgetCardProps>(
    ({ className, icon, iconBg = "bg-primary/10", title, subtitle, action, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200",
                className
            )}
            {...props}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    )
);

WidgetCard.displayName = "WidgetCard";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, WidgetCard };
export type { CardProps, WidgetCardProps };
