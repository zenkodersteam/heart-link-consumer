import type { Metadata } from 'next';
import { Inter, Bree_Serif } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const breeSerif = Bree_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HeartLink Admin',
  description: 'HeartLink operations dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${breeSerif.variable}`}>
      <body className="bg-canvas text-text font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
