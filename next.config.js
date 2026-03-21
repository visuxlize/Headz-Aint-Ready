/** @type {import('next').NextConfig} */
// Use module.exports (CommonJS) so no "type": "module" needed
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    // Fewer tiny chunks from icon/chart libs — can avoid "__webpack_modules__[moduleId] is not a function" after HMR/cache issues
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'headzaintready.com' },
      { protocol: 'https', hostname: 'seller-brand-assets-f.squarecdn.com' },
    ],
  },
}

module.exports = nextConfig
