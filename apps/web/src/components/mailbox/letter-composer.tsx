'use client';

import type { LetterLengthLimit } from '@heartlink/consumer-api';
import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { countWords } from './lib';

/**
 * The box a letter is written in — the reply at the foot of a thread and the
 * body of a brand-new letter are the same control, so they behave the same.
 *
 * `onSend` resolves true when the letter actually went, which is what clears
 * the box; a refusal (out of letters, over the limit) leaves the text where it
 * is rather than throwing away what someone just wrote.
 */
export function LetterComposer({
  placeholder,
  limit,
  onSend,
  tall,
  disabled,
  disabledReason,
}: {
  placeholder: string;
  limit: LetterLengthLimit | null | undefined;
  onSend: (body: string) => Promise<boolean>;
  tall?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const words = countWords(body);
  const wordLimit = limit?.wordLimit ?? null;
  const overLimit = wordLimit !== null && words > wordLimit;
  const empty = body.trim().length === 0;

  async function submit() {
    if (empty || sending || overLimit || disabled) return;
    setSending(true);
    try {
      if (await onSend(body.trim())) setBody('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        // Cmd/Ctrl+Enter sends, so a long letter does not need a trip to the
        // mouse; plain Enter stays a paragraph break, which is what a letter
        // is mostly made of.
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit();
        }}
        className={cn(
          'w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 text-ink outline-none placeholder:text-ink-faint disabled:opacity-60',
          tall ? 'min-h-[38dvh]' : 'min-h-28',
        )}
      />
      <div className="flex items-center justify-between gap-3 px-2 pt-1">
        <span
          className={cn('text-xs', overLimit ? 'font-semibold text-danger' : 'text-ink-faint')}
        >
          {wordLimit === null
            ? words > 0
              ? `${words} words`
              : ''
            : `${words} / ${wordLimit} words${overLimit ? ` · ${words - wordLimit} over` : ''}`}
        </span>
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={empty || sending || overLimit || disabled}
          title={disabled ? disabledReason : undefined}
        >
          {sending ? (
            <Spinner size="sm" className="border-white/40 border-t-white" />
          ) : (
            <Send className="size-4" />
          )}
          Send letter
        </Button>
      </div>
    </div>
  );
}
