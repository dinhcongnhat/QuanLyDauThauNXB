/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // PDF.js contains an optional Node canvas fallback. The OCR renderer runs
  // only in the browser, so keep that native dependency out of the Next.js
  // server/client bundle (important for the node:20-alpine Docker image).
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
