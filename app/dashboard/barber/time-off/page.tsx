import Link from 'next/link'
import { SQUIRE } from '@/lib/squire-config'

export default function BarberTimeOffPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <Link href="/dashboard/barber" className="text-sm font-medium text-headz-gray hover:text-headz-black">
        ← Back to My Day
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Time Off</h1>
        <p className="mt-3 text-headz-gray leading-relaxed">
          Time off requests are submitted and approved in Squire.
        </p>
      </div>
      <a
        href={SQUIRE.adminAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md hover:bg-headz-redDark"
      >
        Request Time Off in Squire
      </a>
    </div>
  )
}
