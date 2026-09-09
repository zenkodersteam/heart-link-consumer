/**
 * pdf.js's worker, copied into `public/` as this config is evaluated.
 *
 * It used to be copied only by the `build` and `dev` npm scripts, and the file
 * is gitignored because it is generated — so a host that runs `next build`
 * directly (Vercel's default for a Next.js project) deployed without it. The
 * request for /pdf.worker.min.mjs then returned the app's own HTML with a 200,
 * pdf.js failed to start its worker, and every document in intake review said
 * "Custom render unavailable".
 *
 * Doing it here means it happens for any command that loads this config, which
 * is all of them. Failures are logged rather than thrown: a missing worker
 * costs the reviewer the inline preview, and is not worth failing a deploy that
 * would otherwise be fine.
 */
try {
  require('./scripts/copy-pdf-worker').copyPdfWorker();
} catch (error) {
  console.warn('[next.config] could not copy the pdf.js worker:', error);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@heartlink/ui',
    '@heartlink/auth',
    '@heartlink/domain',
    '@heartlink/api-client',
    '@heartlink/api-contract',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
