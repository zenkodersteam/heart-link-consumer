import type { NextConfig } from 'next';

/**
 * Hosts `next/image` is allowed to fetch and optimise.
 *
 * Profile photos are presigned links served by the API, so the host is
 * whatever `NEXT_PUBLIC_API_BASE_URL` points at — localhost in development, the
 * deployed API in production. Derived rather than hardcoded so the same build
 * works in every environment, and so a new environment does not silently fall
 * back to serving 4 MB originals into a 44px circle.
 *
 * If storage ever moves to S3 (`STORAGE_PROVIDER=s3` on the API), presigned
 * URLs will come from the bucket's host instead and it has to be added here, or
 * every photo 400s through the optimiser.
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
