/**
 * Runs once when the Node.js runtime starts (before any app code).
 * Force IPv4 for DNS so the direct Supabase DB connection works on Netlify (and other serverless hosts)
 * without needing the paid connection pooler (avoids ENETUNREACH over IPv6).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('node:dns')
    dns.setDefaultResultOrder('ipv4first')
  }
}
