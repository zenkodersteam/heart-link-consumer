'use client';

import { FileText, Lock, Slash } from 'lucide-react';

import { SettingsCard, SettingsGroupLabel, SettingsRow } from './settings-row';

/**
 * Privacy and safety controls, grouped away from day-to-day account settings.
 *
 * A client component even though nothing here is interactive: the rows take an
 * icon component as a prop, and a server component cannot hand a function
 * across that boundary.
 */
export function PrivacySafety() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Privacy &amp; safety</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Control who can reach you, and read how your information is handled.
      </p>

      <SettingsGroupLabel>People</SettingsGroupLabel>
      <SettingsCard>
        <SettingsRow icon={Slash} label="Blocked accounts" href="/blocked" last />
      </SettingsCard>

      <SettingsGroupLabel>Documents</SettingsGroupLabel>
      <SettingsCard>
        <SettingsRow icon={FileText} label="Terms of Service" href="/policy?doc=terms" />
        <SettingsRow icon={Lock} label="Privacy Policy" href="/policy?doc=privacy" last />
      </SettingsCard>

      <p className="mt-7 px-1 text-[12.5px] leading-relaxed text-ink-faint">
        Letters are reviewed by our team before they are posted, and replies are scanned in.
        Facility staff may also read mail under their own rules.
      </p>
    </div>
  );
}
