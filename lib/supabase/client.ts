import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for client-side operations (Client Components)
 * 
 * This client is used in Client Components that need browser features like:
 * - React hooks (useState, useEffect)
 * - Event handlers (onClick, onChange)
 * - Real-time subscriptions
 * 
 * Example usage:
 * ```typescript
 * 'use client'
 * 
 * import { createClient } from '@/lib/supabase/client'
 * import { useEffect, useState } from 'react'
 * 
 * export function UserProfile() {
 *   const [user, setUser] = useState(null)
 *   const supabase = createClient()
 *   
 *   useEffect(() => {
 *     supabase.auth.getUser().then(({ data }) => {
 *       setUser(data.user)
 *     })
 *   }, [])
 *   
 *   return <div>{user?.email}</div>
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
