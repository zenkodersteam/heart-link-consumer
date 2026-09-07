import {
  PLACEHOLDER_NOTICE,
  PRIVACY_SECTIONS,
  PRIVACY_VERSION,
  TERMS_SECTIONS,
  TERMS_VERSION,
} from '@heartlink/consumer-content';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

type Search = Promise<{ doc?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const { doc } = await searchParams;
  return {
    title: doc === 'privacy' ? 'Privacy Policy · HeartLink' : 'Terms of Service · HeartLink',
  };
}

/**
 * Terms of Service and Privacy Policy, one page for both via `?doc=`.
 *
 * Public: someone deciding whether to sign up has to be able to read these
 * first, and the app stores require the links to work for a signed-out
 * reviewer too. It is a server component — the text is static, so there is no
 * reason to ship it through JavaScript.
 */
export default async function PolicyPage({ searchParams }: { searchParams: Search }) {
  const { doc } = await searchParams;
  const isPrivacy = doc === 'privacy';

  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const version = isPrivacy ? PRIVACY_VERSION : TERMS_VERSION;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to HeartLink
      </Link>

      <h1 className="mt-6 font-[family-name:var(--font-bree)] text-3xl text-ink">{title}</h1>
      <p className="mt-1.5 text-[13px] text-ink-faint">Version {version}</p>

      <p className="mt-5 flex gap-2.5 rounded-2xl border border-gold bg-gold-faint p-4 text-[13px] leading-relaxed text-ink-soft">
        <Info className="mt-0.5 size-4 shrink-0 text-gold" />
        {PLACEHOLDER_NOTICE}
      </p>

      <div className="mt-8 space-y-7">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-[family-name:var(--font-bree)] text-xl text-ink">
              {section.heading}
            </h2>
            <p className="mt-2 text-[15px] leading-7 text-ink-soft">{section.body}</p>
          </section>
        ))}
      </div>

      <Link
        href={isPrivacy ? '/policy?doc=terms' : '/policy?doc=privacy'}
        className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Read the {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
