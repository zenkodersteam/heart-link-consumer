'use client';

import {
  POPULAR_QUESTIONS,
  SUPPORT_TOPICS,
  type SupportTopic,
} from '@heartlink/consumer-content';
import {
  ChevronRight,
  LifeBuoy,
  Mail,
  PenLine,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { isBuilt } from '@/lib/routes';
import { cn } from '@/lib/utils';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

const TOPIC_ICONS: Record<string, LucideIcon> = {
  letters: Mail,
  billing: LifeBuoy,
  safety: ShieldCheck,
};

/**
 * The help centre: search, three topics, and the answers behind each.
 *
 * Which topic is open lives in the query string, so browser-back leaves a topic
 * rather than the whole screen, and an answer can be linked to directly.
 */
export function Support() {
  const router = useRouter();
  const params = useSearchParams();
  const topicKey = params.get('topic');
  const [query, setQuery] = useState('');

  const topic = SUPPORT_TOPICS.find((candidate) => candidate.key === topicKey) ?? null;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return SUPPORT_TOPICS.flatMap((candidate) =>
      candidate.faqs
        .filter(
          (faq) =>
            faq.q.toLowerCase().includes(needle) || faq.a.toLowerCase().includes(needle),
        )
        .map((faq) => ({ topic: candidate, faq })),
    );
  }, [query]);

  if (topic) return <TopicPage topic={topic} />;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <section className="relative overflow-hidden rounded-[20px] bg-sidebar px-6 py-11 text-center">
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(420px_240px_at_85%_0%,color-mix(in_srgb,var(--color-primary)_40%,transparent),transparent_60%),linear-gradient(160deg,#1b0826,#2e1240_55%,#451a5e)]"
        />
        <div className="relative">
          <h1 className="font-[family-name:var(--font-bree)] text-3xl text-sidebar-text">
            How can we help?
          </h1>
          <p className="mt-1.5 text-sm text-sidebar-text/80">Real people, within 24 hours.</p>

          <label className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-[--radius-pill] bg-surface-elevated py-1 pl-4 pr-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type your question here…"
              aria-label="Search support"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary">
              <Search className="size-4 text-on-primary" />
            </span>
          </label>
        </div>
      </section>

      {query.trim() ? (
        <div className="mt-7">
          {matches.length === 0 ? (
            <p className="rounded-[--radius-card] border border-line bg-surface-elevated p-8 text-center text-sm text-ink-soft">
              No answers match &ldquo;{query.trim()}&rdquo;. Try fewer words, or contact support.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
              {matches.map(({ topic: match, faq }) => (
                <li key={match.key + faq.q}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      router.push(`/support?topic=${match.key}`);
                    }}
                    className="flex w-full items-center gap-3 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-muted"
                  >
                    <span className="flex-1 text-sm text-ink">{faq.q}</span>
                    <ChevronRight className="size-4 shrink-0 text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {SUPPORT_TOPICS.map((candidate) => {
              const Icon = TOPIC_ICONS[candidate.key] ?? LifeBuoy;
              return (
                <Link
                  key={candidate.key}
                  href={`/support?topic=${candidate.key}`}
                  className="rounded-[--radius-card] border border-line bg-surface-elevated p-5 shadow-[0_2px_12px_rgba(22,5,31,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_14px_30px_rgba(22,5,31,0.14)]"
                >
                  <span className="grid size-11 place-items-center rounded-full border border-gold bg-gold-faint">
                    <Icon className="size-5 text-gold" />
                  </span>
                  <h2 className="mt-4 font-[family-name:var(--font-bree)] text-lg text-ink">
                    {candidate.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                    {candidate.cardBlurb}
                  </p>
                </Link>
              );
            })}
          </div>

          <h2 className="mb-3 mt-9 font-[family-name:var(--font-bree)] text-xl text-ink">
            Popular questions
          </h2>
          <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
            {POPULAR_QUESTIONS.map((popular) => (
              <li key={popular.q}>
                <Link
                  href={`/support?topic=${popular.topic}`}
                  className="flex items-center gap-3 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-muted"
                >
                  <span className="flex-1 text-sm text-ink">{popular.q}</span>
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Support answers the app; Support Circle answers the blank page. */}
          {isBuilt('/circle') ? (
            <Link
              href="/circle"
              className="mt-6 flex items-center gap-2.5 text-sm text-ink-soft hover:text-ink"
            >
              <PenLine className="size-4 shrink-0 text-primary" />
              Stuck on what to write? Support Circle has guided prompts and letter-writing help.
            </Link>
          ) : null}

          <StillStuck className="mt-7" />
        </>
      )}
    </div>
  );
}

function TopicPage({ topic }: { topic: SupportTopic }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-[13px] text-ink-faint">
        <Link href="/support" className="font-semibold text-primary hover:underline">
          Support
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-ink">{topic.title}</span>
      </p>

      <h1 className="mt-4 font-[family-name:var(--font-bree)] text-3xl text-ink">{topic.title}</h1>
      <p className="mt-1.5 text-sm text-ink-soft">{topic.blurb}</p>

      <div className="mt-7 overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {topic.faqs.map((faq, index) => {
          const isOpen = open === index;
          return (
            <div key={faq.q} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-primary-faint/40"
              >
                <span
                  className={cn(
                    'flex-1 text-sm font-semibold',
                    isOpen ? 'text-primary' : 'text-ink',
                  )}
                >
                  {faq.q}
                </span>
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    isOpen ? 'rotate-90 text-primary' : 'text-ink-faint',
                  )}
                />
              </button>
              {isOpen ? (
                <p className="px-5 pb-5 text-[14.5px] leading-7 text-ink-soft">{faq.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <StillStuck className="mt-7" />
    </div>
  );
}

/**
 * The way to reach a person.
 *
 * Without a support address configured the button is disabled rather than
 * opening an empty mail composer, which looks like the app is broken.
 */
function StillStuck({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-[--radius-card] border border-line bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div>
        <p className="font-[family-name:var(--font-bree)] text-lg text-ink">Still stuck?</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {SUPPORT_EMAIL
            ? 'Real people, within 24 hours.'
            : 'Our support address is being set up. Please try again shortly.'}
        </p>
      </div>
      {SUPPORT_EMAIL ? (
        <Button asChild>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail className="size-4" />
            Contact support
          </a>
        </Button>
      ) : (
        <Button disabled>
          <Mail className="size-4" />
          Contact support
        </Button>
      )}
    </div>
  );
}
