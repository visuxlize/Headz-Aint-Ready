/** @type {import('next').NextConfig} */
// Vercel: use module.exports (CommonJS) so no "type": "module" needed
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'headzaintready.com' },
      { protocol: 'https', hostname: 'seller-brand-assets-f.squarecdn.com' },
    ],
  },
}

module.exports = nextConfig
