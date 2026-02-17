import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
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
          <h1 className="text-3xl font-bold text-white">Staff – Create account</h1>
          <p className="mt-2 text-white/70">
            Get started with your staff account
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-white/70">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-headz-red hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
