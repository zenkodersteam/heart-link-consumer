import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  eyebrow = 'HeartLink Admin',
  title,
  lede,
  note,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="hl-auth">
      <section className="hl-auth__art" aria-label="HeartLink brand panel">
        <div className="hl-auth__art-image" />
        <Link href="/" className="hl-auth__brand hl-auth__brand--on-art" aria-label="HeartLink admin home">
          <Image src="/heartlink-emblem.png" alt="" width={72} height={62} className="hl-auth__logo" priority />
          <span className="hl-auth__wordmark">
            <span>Heart</span>
            <span>Link</span>
          </span>
        </Link>
        <span className="hl-auth__rule" aria-hidden />
        <div className="hl-auth__statement">
          {/* Kept in step with BRAND_TAGLINE / BRAND_SUBTITLE in
              @heartlink/consumer-content, which the website and phone app read.
              Inlined rather than imported: admin is a staff tool and has no
              other reason to depend on consumer copy. */}
          <p>~ Love Knows No Bounds ~</p>
          <p className="hl-auth__statement-sub">Meaningful connections beyond boundaries.</p>
        </div>
      </section>

      <section className="hl-auth__form" aria-labelledby="heartlink-auth-title">
        <div className="hl-auth__form-inner">
          <Link href="/" className="hl-auth__brand hl-auth__brand--mobile" aria-label="HeartLink admin home">
            <Image src="/heartlink-emblem.png" alt="" width={58} height={49} className="hl-auth__logo" priority />
            <span className="hl-auth__wordmark">
              <span>Heart</span>
              <span>Link</span>
            </span>
          </Link>

          <p className="hl-auth__eyebrow">{eyebrow}</p>
          <h1 id="heartlink-auth-title" className="hl-auth__title">
            {title}
          </h1>
          {lede ? <p className="hl-auth__lede">{lede}</p> : null}

          {children}

          {note ? <p className="hl-auth__note">{note}</p> : null}
        </div>
      </section>
    </main>
  );
}
