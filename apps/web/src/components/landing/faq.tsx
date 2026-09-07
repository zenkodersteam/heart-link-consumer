'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { FAQS } from '@/components/landing/content';
import { cn } from '@/lib/utils';

export function Faq() {
  // First one open, so the section reads as answers rather than a row of
  // closed bars the visitor has to work for.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-ink">{faq.q}</span>
              <ChevronDown
                className={cn(
                  'size-5 shrink-0 text-ink-faint transition-transform duration-200',
                  isOpen && 'rotate-180 text-primary',
                )}
              />
            </button>
            {/* Grid-rows trick animates to the content's real height, which a
                fixed max-height would either clip or overshoot. */}
            <div
              className={cn(
                'grid transition-all duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{faq.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
