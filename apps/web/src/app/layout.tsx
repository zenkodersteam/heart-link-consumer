import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Bree_Serif } from 'next/font/google';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/query-provider';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">
      <html lang="en" className={`${inter.variable} ${bree.variable}`}>
        <body className="min-h-dvh antialiased">
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="top-center" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
