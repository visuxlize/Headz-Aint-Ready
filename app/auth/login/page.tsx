import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-headz-black">
      <Link
        href="/"
        className="absolute top-4 left-4 text-white/80 hover:text-white text-sm font-medium transition flex items-center gap-1"
      >
        ← Back to site
      </Link>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Staff – Sign in</h1>
          <p className="mt-2 text-white/70">
            Sign in to your account
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-white/10" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-white/70">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-headz-red hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
