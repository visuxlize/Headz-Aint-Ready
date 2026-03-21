'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg === 'confirm_email') {
      setInfo('Check your email to confirm your account, then sign in.')
    }
    const err = searchParams.get('error')
    if (err === 'unauthorized') {
      setError(
        'Not on the staff allow list. Your email must be in the staff_allowlist table. Dev fix: Supabase → SQL → run scripts/ensure-staff-allowlist.sql, or npm run seed:dev-users.'
      )
    }
    if (err === 'unavailable') {
      setError(
        "We couldn't reach the shop servers to finish sign-in. Use Try again on the next screen, or wait a moment and open the staff area again."
      )
    }
    if (err === 'inactive') {
      setError('This account has been deactivated. Contact your manager.')
    }
    if (err === 'no_profile') {
      setError(
        'No staff profile is linked to this login. Ask an admin to add your email to the barber roster (or send you an invite), then try again.'
      )
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Wrong information, try again.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Wrong information, try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {info && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-400/40 rounded-lg text-emerald-100 text-sm text-center">
          {info}
        </div>
      )}
      {error && (
        <div className="p-3 bg-headz-red/20 border border-headz-red/50 rounded-lg text-white text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-headz-red focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2 text-white">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-headz-red focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-headz-red hover:bg-headz-redDark disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
