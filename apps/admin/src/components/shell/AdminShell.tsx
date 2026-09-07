'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { Sidebar } from '../intake/Sidebar';
import { useNavCounts } from '../intake/NavCountsProvider';

const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Responsive admin shell. The deep-purple rail stays pinned on desktop; below
 * the lg breakpoint it collapses into a dismissible drawer opened from the
 * mobile header, so the working surface keeps full width down to 390px.
 */
export function AdminShell({
  children,
  userSlot,
}: {
  children: ReactNode;
  userSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { counts } = useNavCounts();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const waiting = counts
    ? counts.intake + counts.profiles + counts.payments + counts.moderation
    : 0;

  /** Dismiss without navigating: hand focus back to the control that opened it. */
  const dismiss = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Growing past the desktop breakpoint makes the drawer redundant; drop it so
  // it cannot reappear mid-session when the viewport shrinks again.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Escape to close, Tab cycles inside the panel while it is open.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismiss]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      <Sidebar className="hidden lg:flex" />

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim. Keyboard dismissal is handled by Escape and the panel's X. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={dismiss}
            className="animate-scrim-in absolute inset-0 h-full w-full cursor-default bg-overlay"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            id="admin-nav-drawer"
            className="animate-drawer-in absolute inset-y-0 left-0 flex w-[276px] max-w-[86vw] shadow-card"
          >
            <Sidebar
              className="w-full"
              onNavigate={() => setOpen(false)}
              onClose={dismiss}
              closeRef={closeRef}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls={open ? 'admin-nav-drawer' : undefined}
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-border bg-background text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors hover:border-border-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
          >
            <Menu className="size-5" />
            {waiting > 0 ? (
              <>
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
                />
                <span className="sr-only">
                  {waiting} {waiting === 1 ? 'item' : 'items'} waiting across queues
                </span>
              </>
            ) : null}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-gold">
              HeartLink operations
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
              <ShieldCheck className="size-4 shrink-0 text-accent-gold" />
              <span className="truncate">
                <span className="lg:hidden">Intake, trust, and activation.</span>
                <span className="hidden lg:inline">
                  Calm, premium tooling for intake, trust, and activation workflows.
                </span>
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-border bg-background px-1.5 py-1 shadow-soft">
            {userSlot}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
