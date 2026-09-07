'use client';

/**
 * Last resort: a failure in the root layout itself, which the dashboard
 * boundary cannot catch because it lives inside that layout.
 *
 * Replaces the whole document, so it carries its own html and body and cannot
 * rely on any styling the app would normally provide — hence the inline styles.
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
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF1EB',
          color: '#2E1240',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>HeartLink Admin could not start</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6E5C80', margin: '0 0 20px' }}>
            Something failed before the page could be drawn. Reloading usually clears it.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '10px 20px',
              background: '#E91E73',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ fontSize: 11, color: '#8C769A', marginTop: 20 }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
