'use client';

import {
  MAILROOM_RULES,
  MOMENTS,
  PLAN_WORD_LIMITS,
  PRE_SEND_CHECKLIST,
  TOTAL_PROMPT_COUNT,
  findMoment,
  findPrompt,
  type Moment,
  type MomentIconKey,
  type Prompt,
} from '@heartlink/consumer-content';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  Lock,
  Mail,
  Repeat,
  Send,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Support Circle: a private, guided writing surface for outside members —
 * prompts grouped by the moment you are writing in, plus the practical
 * letter-writing support that keeps a letter deliverable.
 *
 * Content comes from `@heartlink/consumer-content`, shared with the phone app.
 * Nothing here is a network call, a write path, or visible to another member:
 * this is HeartLink-authored editorial, private to whoever is reading it.
 *
 * Four levels, held in local state rather than the URL — the phone app behaves
 * the same way, and a prompt is somewhere you read rather than somewhere you
 * link to.
 */

type Level =
  | { kind: 'home' }
  | { kind: 'moment'; momentKey: string }
  | { kind: 'prompt'; momentKey: string; promptId: string }
  | { kind: 'letters' };

/** The shared icon vocabulary, drawn with this surface's icon set. */
const MOMENT_ICONS: Record<MomentIconKey, LucideIcon> = {
  mail: Mail,
  repeat: Repeat,
  clock: Clock,
  'cloud-rain': CloudRain,
  sun: Sun,
  calendar: Calendar,
};

export function SupportCircle() {
  const [view, setView] = useState<Level>({ kind: 'home' });

  const moment =
    view.kind === 'moment' || view.kind === 'prompt' ? findMoment(view.momentKey) : null;
  const prompt = view.kind === 'prompt' ? findPrompt(view.momentKey, view.promptId) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      {prompt && moment ? (
        <PromptPage
          moment={moment}
          prompt={prompt}
          onBack={() => setView({ kind: 'moment', momentKey: moment.key })}
        />
      ) : moment ? (
        <MomentPage
          moment={moment}
          onBack={() => setView({ kind: 'home' })}
          onOpen={(p) => setView({ kind: 'prompt', momentKey: moment.key, promptId: p.id })}
        />
      ) : view.kind === 'letters' ? (
        <LettersPage onBack={() => setView({ kind: 'home' })} />
      ) : (
        <Home
          onOpenMoment={(m) => setView({ kind: 'moment', momentKey: m.key })}
          onOpenLetters={() => setView({ kind: 'letters' })}
        />
      )}
    </div>
  );
}

// ---- Level 1 ----

function Home({
  onOpenMoment,
  onOpenLetters,
}: {
  onOpenMoment: (m: Moment) => void;
  onOpenLetters: () => void;
}) {
  return (
    <>
      <header className="overflow-hidden rounded-[--radius-card] bg-gradient-to-br from-[#1B0826] via-sidebar to-[#451A5E] p-8">
        <h1 className="font-[family-name:var(--font-bree)] text-3xl text-sidebar-text">
          Support Circle
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-sidebar-text/75">
          Guided prompts and practical help for writing to someone inside. Written by HeartLink,
          private to you.
        </p>
      </header>

      <h2 className="mt-8 font-[family-name:var(--font-bree)] text-xl text-ink">
        Where are you right now?
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {TOTAL_PROMPT_COUNT} prompts, grouped by the moment you are writing in.
      </p>

      <ul className="mt-4 overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {MOMENTS.map((m, i) => {
          const Icon = MOMENT_ICONS[m.icon];
          return (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => onOpenMoment(m)}
                aria-label={`${m.title}, ${m.prompts.length} prompts`}
                className={cn(
                  'group flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-surface-muted',
                  i > 0 ? 'border-t border-line' : null,
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-faint">
                  <Icon className="size-[17px] text-gold" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{m.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">
                    {m.blurb}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-ink-faint">{m.prompts.length}</span>
                <ChevronRight className="size-[17px] shrink-0 text-ink-faint transition-colors group-hover:text-primary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onOpenLetters}
        className="mt-5 flex w-full items-center gap-4 rounded-[--radius-card] border border-line bg-surface-elevated p-5 text-left transition-shadow hover:shadow-[0_12px_30px_rgba(46,18,64,0.09)]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-bree)] text-lg text-ink">
            Before you send
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
            What facility mailrooms reject, how long your letter can be on your plan, and a
            checklist to run before it goes out. The part that protects whether your words actually
            arrive.
          </span>
        </span>
        <ArrowRight className="size-[18px] shrink-0 text-primary" aria-hidden />
      </button>

      <section className="mt-6 rounded-[--radius-card] border border-line bg-surface-muted p-5">
        <span className="inline-block rounded-[--radius-pill] border border-gold bg-gold-faint px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
          Later
        </span>
        <h3 className="mt-3 font-[family-name:var(--font-bree)] text-lg text-ink">
          Moderated supporter groups
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          One day, small topic-scoped groups where supporters can hear from each other: first-time
          letter writers, families at a distance, people preparing for someone coming home. Every
          contribution reviewed before it appears, never an open board, and never a way for members
          to contact each other directly.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          We will open it when there is a team to moderate it properly, and not before. There is
          nothing to sign up for yet.
        </p>
      </section>

      <p className="mt-6 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Support Circle is private to you. Nothing here is shared with other members, and nothing you
        read here is visible to anyone else.
      </p>

      <Link
        href="/resources"
        className="mt-4 inline-block text-[13px] text-ink-faint underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Looking for counseling, reentry, or legal organizations? Those live in Resources.
      </Link>
    </>
  );
}

// ---- Level 2: a moment ----

function MomentPage({
  moment,
  onBack,
  onOpen,
}: {
  moment: Moment;
  onBack: () => void;
  onOpen: (p: Prompt) => void;
}) {
  const Icon = MOMENT_ICONS[moment.icon];
  return (
    <>
      <Crumb onBack={onBack} trail="Support Circle" current={moment.title} />

      <header className="mb-5">
        <h1 className="flex items-center gap-2.5 font-[family-name:var(--font-bree)] text-[26px] text-ink">
          <Icon className="size-[19px] text-gold" aria-hidden />
          {moment.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{moment.intro}</p>
      </header>

      <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {moment.prompts.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p)}
              className={cn(
                'group flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-surface-muted',
                i > 0 ? 'border-t border-line' : null,
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{p.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-soft">
                  {p.body}
                </span>
              </span>
              <ChevronRight className="size-[17px] shrink-0 text-ink-faint transition-colors group-hover:text-primary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- Level 3: one prompt, as a page of stationery ----

function PromptPage({
  moment,
  prompt,
  onBack,
}: {
  moment: Moment;
  prompt: Prompt;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function copy() {
    navigator.clipboard
      ?.writeText(prompt.body)
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard permission denied: leave the label alone rather than
        // claiming a copy that did not happen.
      });
  }

  return (
    <>
      <Crumb onBack={onBack} trail={moment.title} current={prompt.title} />

      <article className="rounded-[--radius-card] border border-line bg-surface-elevated p-7">
        <div className="mb-5 h-px w-12 bg-gold" aria-hidden />
        <h1 className="font-[family-name:var(--font-bree)] text-[26px] leading-tight text-ink">
          {prompt.title}
        </h1>
        <p className="mt-4 text-[15px] leading-[1.75] text-ink">{prompt.body}</p>

        <div className="mt-6 rounded-[14px] bg-surface-muted p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-gold">
            Why this works
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{prompt.why}</p>
        </div>
      </article>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={copy} aria-label="Copy this prompt">
          {copied ? 'Copied' : 'Copy prompt'}
        </Button>
        <p className="text-[13px] text-ink-faint">
          Paste it wherever you draft. Nothing is sent from here.
        </p>
      </div>
    </>
  );
}

// ---- Level 2: letter-writing support ----

function LettersPage({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Crumb onBack={onBack} trail="Support Circle" current="Before you send" />

      <header className="mb-6">
        <h1 className="flex items-center gap-2.5 font-[family-name:var(--font-bree)] text-[26px] text-ink">
          <Send className="size-[19px] text-gold" aria-hidden />
          Before you send
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Every facility mailroom reviews incoming mail and sets its own rules. These are the
          patterns that get letters returned most often, and the habits that keep yours moving.
        </p>
      </header>

      <GroupHeading>What gets a letter rejected</GroupHeading>
      <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {MAILROOM_RULES.map((r, i) => (
          <li
            key={r.avoid}
            className={cn('flex flex-col gap-1.5 p-4', i > 0 ? 'border-t border-line' : null)}
          >
            <span className="flex gap-2.5">
              <X className="mt-0.5 size-[15px] shrink-0 text-danger" aria-hidden />
              <span className="text-[14px] text-ink">{r.avoid}</span>
            </span>
            <span className="flex gap-2.5">
              <Check className="mt-0.5 size-[15px] shrink-0 text-success" aria-hidden />
              <span className="text-[14px] text-ink-soft">{r.instead}</span>
            </span>
          </li>
        ))}
      </ul>

      <GroupHeading>How long your letter can be</GroupHeading>
      <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {PLAN_WORD_LIMITS.map((p, i) => (
          <li
            key={p.key}
            className={cn(
              'flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4',
              i > 0 ? 'border-t border-line' : null,
            )}
          >
            <span className="text-[15px] font-semibold text-ink">{p.plan}</span>
            <span className="text-[13px] font-semibold text-primary">{p.words} words</span>
            <span className="w-full text-[13px] text-ink-soft">{p.feels}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-faint">
        The limit keeps every letter printing cleanly as one piece of mail, which is one less reason
        for a mailroom to hold it.
      </p>

      <GroupHeading>Run this before it goes out</GroupHeading>
      <ul className="overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated">
        {PRE_SEND_CHECKLIST.map((item, i) => (
          <li
            key={item}
            className={cn('flex gap-2.5 p-4', i > 0 ? 'border-t border-line' : null)}
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            <span className="text-[14px] leading-relaxed text-ink">{item}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-7 px-1 text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">
      {children}
    </h2>
  );
}

function Crumb({
  onBack,
  trail,
  current,
}: {
  onBack: () => void;
  trail: string;
  current: string;
}) {
  return (
    <nav className="mb-5 text-[13px]" aria-label="Breadcrumb">
      <button type="button" onClick={onBack} className="text-ink-soft transition-colors hover:text-ink">
        {trail}
      </button>
      <ChevronRight className="mx-1 inline size-3 text-ink-faint" aria-hidden />
      <span className="font-semibold text-ink">{current}</span>
    </nav>
  );
}
