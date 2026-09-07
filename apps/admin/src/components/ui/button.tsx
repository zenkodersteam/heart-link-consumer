import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[14px] font-semibold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:-translate-y-px',
        success: 'bg-success text-white shadow-soft hover:bg-success/90 hover:-translate-y-px',
        warning: 'bg-warning text-white shadow-soft hover:bg-warning/90 hover:-translate-y-px',
        danger: 'bg-danger text-white shadow-soft hover:bg-danger/90 hover:-translate-y-px',
        outline: 'border border-border bg-background text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:border-border-strong hover:bg-surface',
        ghost: 'bg-transparent text-text hover:bg-surface/80',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        md: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-[13px]',
        xs: 'h-7 px-2.5 text-xs',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
