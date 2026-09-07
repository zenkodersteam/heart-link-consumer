'use client';

import { colors } from '@heartlink/design-tokens';

/**
 * Last resort: only fires when the root layout itself throws, which is why it
 * has to ship its own <html>/<body> and cannot use the app's fonts or styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: 'system-ui, sans-serif',
          background: '#fbf1eb',
          color: '#2e1240',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>HeartLink is temporarily unavailable</h1>
        <p style={{ color: '#6e5c80', margin: 0 }}>Please try again in a moment.</p>
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            height: 44,
            padding: '0 24px',
            borderRadius: 999,
            border: 'none',
            background: colors.primary,
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        {/* The digest is the only handle support has on which failure this
            was, so it is shown rather than swallowed. */}
        {error.digest ? (
          <p style={{ color: '#9c8cae', fontSize: 12, margin: 0 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
