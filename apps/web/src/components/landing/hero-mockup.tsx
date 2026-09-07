import { Mail, ShieldCheck, SlidersHorizontal } from 'lucide-react';

/**
 * Product shot: a browser window with a phone overlapping it, showing the
 * profile screen. Deliberately not a swipe deck — HeartLink is correspondence,
 * so the shot leads with writing a letter rather than judging a photo.
 */
export function HeroMockup() {
  return (
    <div className="relative select-none" aria-hidden>
      {/* Browser window */}
      <div className="ml-auto w-[92%] overflow-hidden rounded-2xl border border-line bg-surface-elevated shadow-[0_30px_60px_rgba(22,5,31,0.18)]">
        <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 flex-1 truncate rounded-md bg-surface-elevated px-3 py-1 text-[11px] text-ink-faint">
            heartlink.app/profiles
          </span>
        </div>

        <div className="p-5 pl-[38%]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-[family-name:var(--font-bree)] text-base text-ink">Profiles</p>
              <p className="text-[11px] text-ink-faint">Verified, ready for letters</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft">
              <SlidersHorizontal className="size-3" /> Filters
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-midnight">
            <div className="aspect-[4/3] bg-gradient-to-br from-[#2e1240] via-[#451a5e] to-[#5a2178]" />
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <ShieldCheck className="size-3" /> Verified
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight to-transparent p-3">
              <p className="font-[family-name:var(--font-bree)] text-sm text-sidebar-text">
                Darnell, 34
              </p>
              <p className="text-[10px] text-sidebar-text/70">Texas · Guitar, writing, faith</p>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white">
            <Mail className="size-3" /> Write a letter
          </div>
        </div>
      </div>

      {/* Phone, overlapping the browser */}
      <div className="absolute -bottom-4 left-0 w-[36%] overflow-hidden rounded-[24px] border-[5px] border-[#1b0826] bg-surface-elevated shadow-[0_24px_48px_rgba(22,5,31,0.28)]">
        <div className="flex justify-center bg-[#1b0826] pb-1.5 pt-1">
          <span className="h-1.5 w-12 rounded-full bg-black/70" />
        </div>
        <div className="p-2.5">
          <p className="mb-2 font-[family-name:var(--font-bree)] text-xs text-ink">Profiles</p>
          <div className="relative overflow-hidden rounded-lg">
            <div className="aspect-[3/4] bg-gradient-to-br from-[#2e1240] via-[#451a5e] to-[#5a2178]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight to-transparent p-2">
              <p className="font-[family-name:var(--font-bree)] text-[11px] text-sidebar-text">
                Darnell, 34
              </p>
            </div>
          </div>
          <div className="mt-2 rounded-full bg-primary py-1 text-center text-[10px] font-semibold text-white">
            Write a letter
          </div>
        </div>
      </div>

      {/* Floating reply, the emotional payoff of the whole product */}
      <div className="absolute -bottom-6 right-0 w-[62%] rounded-xl border border-line bg-surface-elevated p-3 shadow-[0_18px_36px_rgba(22,5,31,0.16)] sm:w-[54%]">
        <div className="flex gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-faint text-[11px] font-bold text-primary">
            M
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink">Monique wrote back</p>
            <p className="text-[11px] leading-snug text-ink-soft">
              &ldquo;Your letter got here Tuesday. I&apos;ve read it twice.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
