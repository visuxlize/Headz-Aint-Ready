import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            SaaS Starter Kit
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Production-ready Next.js + Supabase + Drizzle ORM
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/auth/login"
            className="p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Login →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to your account
            </p>
          </Link>

          <Link
            href="/auth/signup"
            className="p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Sign Up →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create a new account
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Dashboard →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              View your dashboard (requires login)
            </p>
          </Link>

          <a
            href="https://github.com/yourusername/saas-starter-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Documentation →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Learn how to use this starter kit
            </p>
          </a>
        </div>

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Copy .env.example to .env.local and add your Supabase credentials</li>
            <li>Run npm install to install dependencies</li>
            <li>Run npm run db:generate to create initial migration</li>
            <li>Run npm run db:migrate to apply migration</li>
            <li>Run npm run dev to start the development server</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
