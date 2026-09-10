import type { NextConfig } from 'next';

/**
 * Hosts `next/image` is allowed to fetch and optimise.
 *
 * Kept, but nothing routes through it today: profile photos are presigned
 * links whose signature changes on every issue, which makes them uncacheable
 * by the optimiser, so `ProfilePhoto` renders them `unoptimized` instead. The
 * comment there has the full reasoning.
 *
 * The warning this comment used to carry turned out to be the bug: storage did
 * move to S3, presigned URLs started coming from the bucket's host rather than
 * the API's, and every photo 400d through the optimiser. Deriving the host from
 * `NEXT_PUBLIC_API_BASE_URL` is still right for anything the API itself serves,
 * which is what this stays here for.
 */
function imageHost(): { protocol: 'http' | 'https'; hostname: string; port: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol === 'http:' ? 'http' : 'https',
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    return null;
  }
}

const host = imageHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [{ protocol: host.protocol, hostname: host.hostname, port: host.port, pathname: '/**' }]
      : [],
  },
};

export default nextConfig;
