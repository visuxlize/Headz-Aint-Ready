import Link from 'next/link'

export default function BarberAvailabilityPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <Link href="/dashboard/barber" className="text-sm font-medium text-headz-gray hover:text-headz-black">
        ← Back to My Day
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Availability</h1>
        <p className="mt-3 text-headz-gray leading-relaxed">
          Your working hours and availability are managed in Squire. Changes take effect immediately in the booking flow.
        </p>
      </div>
      <a
        href="https://app.getsquire.com/availability"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl bg-headz-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md hover:bg-headz-redDark"
      >
        Edit My Availability in Squire
      </a>
    </div>
  )
}
