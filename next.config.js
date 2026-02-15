/** @type {import('next').NextConfig} */
const connectSrc = [
  "'self'",
  process.env.TURSO_DATABASE_URL?.startsWith('libsql://') ? 'https://*.turso.io' : '',
  process.env.STORAGE_PROVIDER !== 'local' ? 'https://*.vercel-storage.com' : '',
].filter(Boolean).join(' ');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://unpkg.com",
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
