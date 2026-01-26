import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-all duration-300',
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-6', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-bold text-gray-900', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-7', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
