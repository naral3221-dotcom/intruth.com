import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-60 disabled:saturate-50',
          'active:scale-[0.98]',
          {
            'bg-linear-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 focus-visible:ring-blue-500':
              variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md focus-visible:ring-gray-500':
              variant === 'secondary',
            'border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md focus-visible:ring-gray-500':
              variant === 'outline',
            'hover:bg-gray-100 focus-visible:ring-gray-500':
              variant === 'ghost',
            'bg-linear-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-600/30 focus-visible:ring-red-500':
              variant === 'destructive',
          },
          {
            'h-8 px-3 text-sm gap-1.5': size === 'sm',
            'h-10 px-5 text-[15px] gap-2': size === 'md',
            'h-12 px-7 text-base gap-2.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
