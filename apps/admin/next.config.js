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
