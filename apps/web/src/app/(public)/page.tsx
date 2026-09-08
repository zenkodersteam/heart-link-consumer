import {
  BadgeCheck,
  BookOpen,
  Clock,
  Hand,
  HeartHandshake,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { Faq } from '@/components/landing/faq';
import { HeroMockup } from '@/components/landing/hero-mockup';
import { SiteNav } from '@/components/landing/site-nav';
import {
  LETTER_THREAD,
  SHOWCASE_POINTS,
  STEPS,
  TRUST_ITEMS,
  VALUE_PROPS,
} from '@/components/landing/content';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Verified profiles' },
  { icon: Lock, label: 'Private letters' },
  { icon: Hand, label: 'Safety first' },
  { icon: HeartHandshake, label: 'Real support' },
];

const POINT_ICONS = { lock: Lock, clock: Clock, sparkles: Sparkles, book: BookOpen } as const;
const TRUST_ICONS = { 'badge-check': BadgeCheck, lock: Lock, 'heart-handshake': HeartHandshake } as const;

export default function LandingPage() {
  return (
    <>
      <SiteNav />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:gap-10 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-faint px-3 py-1.5 text-xs font-semibold text-primary">
              <Mail className="size-3.5" /> Private, supported correspondence
            </span>

            <h1 className="mt-5 font-[family-name:var(--font-bree)] text-[2.5rem] leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              Thoughtful connection,{' '}
              <span className="text-primary">beyond every wall.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
              HeartLink is a calm, private place to write to people inside. Real letters, honest
              conversations, and trust that builds over time. No swiping, no pressure, support
              whenever you need it.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">Create account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">Log in</Link>
              </Button>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {TRUST_CHIPS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface-elevated px-3 py-2 text-xs font-medium text-ink-soft sm:justify-start"
                >
                  <Icon className="size-3.5 text-gold" /> {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="pb-8 lg:pb-0">
            <HeroMockup />
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
            How HeartLink works
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-bree)] text-3xl text-ink sm:text-4xl">
            Three steps to your first letter
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            No swiping, no games. A clear, supported path from hello to a correspondence that lasts.
          </p>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-card border border-line bg-surface-elevated p-6"
              >
                <span className="font-[family-name:var(--font-bree)] text-3xl text-primary/35">
                  {step.n}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-bree)] text-xl text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── The letter experience ────────────────────────────────────── */}
        <section className="bg-surface-muted/50 py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
                The letter experience
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-bree)] text-3xl text-ink sm:text-4xl">
                Conversations that take their time.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-soft">
                A calm, secure inbox built for words that matter. No pressure and no read-receipt
                anxiety, just a place to be thoughtful with someone who is being thoughtful back.
              </p>

              <ul className="mt-7 space-y-3">
                {SHOWCASE_POINTS.map((point) => {
                  const Icon = POINT_ICONS[point.icon];
                  return (
                    <li key={point.text} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary-faint">
                        <Icon className="size-4 text-primary" />
                      </span>
                      <span className="text-sm leading-relaxed text-ink">{point.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-card border border-line bg-surface-elevated p-5 shadow-[0_20px_44px_rgba(22,5,31,0.10)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-[family-name:var(--font-bree)] text-lg text-ink">Darnell, 34</p>
                <span className="text-[11px] text-ink-faint">3-page letter this week</span>
              </div>

              <div className="space-y-3">
                {LETTER_THREAD.map((msg) => (
                  <div
                    key={msg.from}
                    className={
                      msg.mine
                        ? 'rounded-xl bg-primary p-3.5 text-white'
                        : 'rounded-xl bg-surface-muted p-3.5'
                    }
                  >
                    <p
                      className={
                        msg.mine
                          ? 'text-[11px] font-semibold text-white/85'
                          : 'text-[11px] font-semibold text-primary'
                      }
                    >
                      {msg.from}
                    </p>
                    <p
                      className={
                        msg.mine
                          ? 'mt-1 text-sm leading-relaxed text-white/95'
                          : 'mt-1 text-sm leading-relaxed text-ink-soft'
                      }
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-3">
                <Send className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="text-[11px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">
                    Letter queued through HeartLink mailroom.
                  </span>{' '}
                  Letters travel by post, not live messages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Value props ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="rounded-card border border-line bg-surface-elevated p-5"
              >
                <h3 className="font-[family-name:var(--font-bree)] text-lg text-ink">
                  {prop.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{prop.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust & safety ───────────────────────────────────────────── */}
        <section className="bg-midnight py-16 text-sidebar-text">
          <div className="mx-auto max-w-6xl px-5">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gold-bright">
              <ShieldCheck className="size-3.5" /> Trust &amp; safety
            </p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-bree)] text-3xl sm:text-4xl">
              Safety is the foundation of every connection.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-sidebar-text/70">
              We built HeartLink to make sincere connection feel calmer, clearer, and more
              intentional.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {TRUST_ITEMS.map((item) => {
                const Icon = TRUST_ICONS[item.icon];
                return (
                  <div
                    key={item.title}
                    className="rounded-card border border-white/10 bg-white/[0.04] p-6"
                  >
                    <span className="grid size-10 place-items-center rounded-full border border-gold/40 bg-gold-faint">
                      <Icon className="size-5 text-gold-bright" />
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-bree)] text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-sidebar-text/70">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-center font-[family-name:var(--font-bree)] text-3xl text-ink sm:text-4xl">
            Questions, answered
          </h2>
          <div className="mt-8">
            <Faq />
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-[#3a164f] via-[#2e1240] to-[#241033] py-20 text-center text-sidebar-text">
          <div className="mx-auto max-w-2xl px-5">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary">
              <HeartHandshake className="size-6 text-white" />
            </span>
            <h2 className="mt-6 font-[family-name:var(--font-bree)] text-3xl sm:text-4xl">
              Somewhere, someone is waiting to hear from you.
            </h2>
            <p className="mt-4 text-base text-sidebar-text/70">
              Creating your account is free and takes about a minute. The first letter is the
              hardest, and the best.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/sign-up">Create your free account</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-sidebar-text/60">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold text-gold-bright hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10 text-center">
        <Wordmark />
        <p className="mt-3 text-sm text-gold">~ Love Knows No Bounds ~</p>
        <p className="mt-1 text-xs text-ink-faint">
          © {new Date().getFullYear()} HeartLink. Meaningful connections beyond boundaries.
        </p>
      </footer>
    </>
  );
}
