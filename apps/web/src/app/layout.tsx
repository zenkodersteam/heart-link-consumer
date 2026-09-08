import type { Metadata } from 'next';
import { Inter, Bree_Serif } from 'next/font/google';


import { SessionProvider } from '@/components/auth/session-provider';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/providers/query-provider';
import { hasSessionCookie } from '@/lib/session';
import './globals.css';

// next/font self-hosts these, so there is no render-blocking request to Google
// and no flash of fallback text.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const bree = Bree_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HeartLink',
  description:
    'A calm, private place to write to people inside. Real letters, honest conversations, and trust that builds over time.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read here rather than in the provider so an anonymous visitor never makes
  // a refresh call: with no cookie there is nothing to refresh.
  const hasSession = await hasSessionCookie();

  return (
    <html lang="en" className={`${inter.variable} ${bree.variable}`}>
      <body className="min-h-dvh antialiased">
        {/* Inside <body>, not around <html>. The root layout has to render the
            document itself, and a provider placed above it ends up outside the
            tree that hydrates — so every `useSession` below found no provider
            and the page rendered as an error boundary. */}
        <SessionProvider hasSession={hasSession}>
          <QueryProvider>{children}</QueryProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
