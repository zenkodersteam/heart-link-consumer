'use client';

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Overflow menu, for the actions a row has that will not fit beside it.
 *
 * Built on Radix for the behaviour a hand-rolled menu almost never gets right:
 * arrow keys and type-ahead, Escape, closing on an outside click, focus
 * returning to the trigger, and the ARIA roles a screen reader needs. It also
 * portals to the body, so a menu opening from inside a card is not clipped by
 * that card's `overflow-hidden`.
 */
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

/** The usual trigger: a vertical-dots button that reads as "more actions". */
export function DropdownMenuIconTrigger({
  label = 'More actions',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <DropdownPrimitive.Trigger
      aria-label={label}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-text-muted transition-colors',
        'hover:border-border hover:bg-surface hover:text-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'data-[state=open]:border-border data-[state=open]:bg-surface data-[state=open]:text-text',
        className,
      )}
    >
      <MoreVertical className="size-4" />
    </DropdownPrimitive.Trigger>
  );
}

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'hl-popover z-[70] min-w-[10rem] overflow-hidden rounded-[12px] border border-border bg-background p-1 shadow-card',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] text-text outline-none transition-colors',
        'focus:bg-surface data-[highlighted]:bg-surface',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-danger focus:bg-danger-tint data-[highlighted]:bg-danger-tint',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <DropdownPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} />
  );
}
