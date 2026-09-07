'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Dropdown built on Radix Select rather than a native `<select>`.
 *
 * The previous version turned off the native chrome and drew its own chevron,
 * which fixed the closed state but not the open one: the list a browser opens
 * is the operating system's, so on macOS a filter row rendered HeartLink's
 * blush-and-purple control and then dropped a grey system menu out of it, in
 * the system font, at the system width, ignoring the app's radii and its
 * selected-row colour. Long facility lists were worst - the native menu
 * overflows the viewport and scrolls its own way.
 *
 * Radix gives us a listbox we style end to end while keeping the behaviour
 * that makes a native select worth having: type-ahead, arrow keys, Home/End,
 * Escape, correct ARIA roles, and focus returning to the trigger on close.
 *
 * Two details are ours rather than Radix's:
 *
 * - Radix reserves the empty string to mean "cleared", so an item may not use
 *   it. Nearly every filter here has a real, selectable "All" option whose
 *   value is `''` - that is what clears the query param. Where such an option
 *   exists, values are mapped onto a sentinel on the way in and back on the way
 *   out, so callers keep passing `''` and never see the sentinel.
 *
 * - Radix's own form integration would submit that sentinel. Where a `name` is
 *   given we render our own visually hidden native select carrying the real
 *   values, which also keeps `required` working for form posts.
 */

/** Stands in for `''`, which Radix reserves. Never leaves this module. */
const EMPTY_VALUE = '__hl_empty__';

/** Keeps the mirrored native select focusable, which `display: none` does not. */
const VISUALLY_HIDDEN: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
};

const triggerVariants = cva(
  [
    'hl-control group flex w-full items-center justify-between gap-2 text-left',
    'focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'data-[state=open]:border-primary/35',
    // A select is never empty, so the placeholder is greyed via Radix's
    // attribute rather than ::placeholder, which does not apply here.
    'data-[placeholder]:text-text-muted',
  ].join(' '),
  {
    variants: {
      size: {
        md: 'min-h-[38px] px-3 py-2 text-sm',
        sm: 'hl-control-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends VariantProps<typeof triggerVariants> {
  options: SelectOption[];
  /** Controlled value. Use `defaultValue` for uncontrolled selects. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown greyed out while nothing is selected. */
  placeholder?: string;
  id?: string;
  /** Submits with the surrounding form via a hidden native select. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  /** Applied to the popover, e.g. to widen it past the trigger. */
  contentClassName?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  id,
  name,
  required,
  disabled,
  size,
  className,
  contentClassName,
  'aria-label': ariaLabel,
}: SelectProps) {
  // Only swap in the sentinel when `''` is a real, selectable option. Radix
  // reads `''` on the root as "nothing chosen yet" and renders the
  // placeholder, which is exactly what a `''` with no matching item means.
  const hasEmptyOption = options.some((o) => o.value === '');
  const toRadix = (v: string | undefined) =>
    hasEmptyOption && v === '' ? EMPTY_VALUE : v;
  const fromRadix = (v: string) => (v === EMPTY_VALUE ? '' : v);

  // The hidden native select mirrors whatever the listbox settles on, so an
  // uncontrolled Select still posts the right value.
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '');
  const submitted = value ?? uncontrolled;

  const handleChange = (next: string) => {
    const real = fromRadix(next);
    setUncontrolled(real);
    onValueChange?.(real);
  };

  return (
    <>
      <SelectPrimitive.Root
        value={toRadix(value)}
        defaultValue={toRadix(defaultValue)}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          className={cn(triggerVariants({ size }), className)}
        >
          <span className="min-w-0 flex-1 truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            {/* `data-state` lives on the trigger, so the rotation keys off the group. */}
            <ChevronDown className="size-4 shrink-0 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'hl-popover z-[70] overflow-hidden rounded-[14px] border border-border bg-background shadow-card',
              'max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)]',
              contentClassName,
            )}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-background text-text-muted">
              <ChevronUp className="size-3.5" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={toRadix(option.value) as string}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-[10px] py-2 pl-2.5 pr-8 text-sm text-text outline-none',
                    'data-[highlighted]:bg-primary-tint data-[highlighted]:text-text',
                    'data-[state=checked]:font-medium',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
                    <Check className="size-4 text-primary" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-background text-text-muted">
              <ChevronDown className="size-3.5" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {name ? (
        // Real values, so `required` and FormData behave as they did with a
        // native select. Kept out of the tab order - the trigger above is the
        // control a keyboard or screen reader user operates - but clipped
        // rather than `display: none`, because a hidden required control that
        // has no layout makes the browser refuse to submit the form with
        // "an invalid form control is not focusable" and no visible cause.
        <select
          name={name}
          required={required}
          disabled={disabled}
          value={submitted}
          onChange={() => {}}
          aria-hidden="true"
          tabIndex={-1}
          style={VISUALLY_HIDDEN}
        >
          {/* Lets a placeholder-only state post empty and so trip `required`. */}
          {options.some((o) => o.value === '') ? null : <option value="" />}
          {options.map((option) => (
            <option key={option.value} value={option.value} />
          ))}
        </select>
      ) : null}
    </>
  );
}
