/** @type {import('next').NextConfig} */
// Use module.exports (CommonJS) so no "type": "module" needed
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.getsquire.com https://getsquire.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://getsquire.com https://*.getsquire.com https://widget.getsquire.com https://app.getsquire.com;",
  },
]

function buildResponseHeaders() {
  /** HSTS only on real HTTPS origins (not localhost). */
  const h =
    process.env.VERCEL_ENV === 'production'
      ? [
          ...securityHeaders,
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ]
      : securityHeaders
  return h
}

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{ source: '/:path*', headers: buildResponseHeaders() }]
  },
  // ESLint warnings should not block CI deploys.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Fewer tiny chunks from icon/chart libs — can avoid "__webpack_modules__[moduleId] is not a function" after HMR/cache issues
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'headzaintready.com' },
      { protocol: 'https', hostname: 'seller-brand-assets-f.squarecdn.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.tenor.com' },
    ],
  },
}

module.exports = nextConfig
