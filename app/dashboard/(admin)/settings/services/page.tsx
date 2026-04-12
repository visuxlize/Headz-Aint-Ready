import Link from 'next/link'
import { SQUIRE } from '@/lib/squire-config'

export const metadata = {
  title: 'Services & pricing | Headz Staff',
}

export default function ServicesSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-headz-gray hover:text-headz-black"
      >
        ← Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Services &amp; Pricing</h1>
        <p className="mt-3 text-headz-gray leading-relaxed">
          Services and pricing are managed directly in Squire. Changes made in Squire automatically appear in the
          booking flow.
        </p>
      </div>
      <a
        href={SQUIRE.adminAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md hover:bg-headz-redDark"
      >
        Edit Services in Squire
      </a>
      <p className="text-sm text-headz-gray border-t border-black/10 pt-6">
        The public price list on the website homepage pulls from the local services table. Sync it after making changes
        in Squire.
      </p>
    </div>
  )
}
