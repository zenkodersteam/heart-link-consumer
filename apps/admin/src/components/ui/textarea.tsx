import * as React from 'react';
import { cn } from '../../lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'hl-control w-full px-3 py-2 text-sm',
        'focus-visible:outline-none',
        'resize-y min-h-[72px]',
        className,
      )}
      {...props}
    />
  );
}
