import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { isSquireConfigured } from '@/lib/squire/config'
import { SQUIRE } from '@/lib/squire-config'
import { SquirePOSStatus } from '@/components/pos/SquirePOSStatus'

const PLACEHOLDER_TXNS = [
  {
    id: '1',
    date: 'Apr 7, 2026 · 2:15 PM',
    barber: 'Marcus J.',
    service: 'Adult haircut + lineup',
    amount: '$45.00',
    status: 'Paid' as const,
  },
  {
    id: '2',
    date: 'Apr 7, 2026 · 11:40 AM',
    barber: 'David R.',
    service: 'Kids cut',
    amount: '$28.00',
    status: 'Paid' as const,
  },
  {
    id: '3',
    date: 'Apr 6, 2026 · 4:05 PM',
    barber: 'Anthony L.',
    service: 'Beard trim',
    amount: '$18.00',
    status: 'Pending' as const,
  },
]

export default function AdminSquirePosPage() {
  const connected = isSquireConfigured()

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16 pt-2 sm:pt-4">
      <div className="flex flex-col gap-4 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-headz-black">Squire POS Terminal</h1>
          <p className="mt-2 max-w-xl text-sm text-headz-gray">
            Take payments with Squire. Use the web POS for day-to-day checkout; API keys power in-app terminal
            checkout from staff devices.
          </p>
        </div>
        <SquirePOSStatus connected={connected} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-headz-black to-[#1a1a1a] p-6 text-white shadow-lg ring-1 ring-headz-red/20">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-headz-red">Status</h2>
          <p className="mt-4 text-sm text-white/75">
            {connected
              ? 'SQUIRE_API_KEY is set on the server. Terminal requests will be sent to Getsquire.'
              : 'Add SQUIRE_API_KEY (and related vars) in your host environment, then redeploy.'}
          </p>
          <a
            href={SQUIRE.adminAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-headz-red px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-headz-redDark"
          >
            Launch Terminal
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <p className="mt-4 text-xs text-white/45">Opens Squire in a new tab.</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-headz-red">Setup</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-headz-gray">
            <li>
              <a
                href={SQUIRE.adminAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-headz-red hover:underline"
              >
                Squire admin
              </a>{' '}
              — terminal and shop settings in Getsquire.
            </li>
            <li>
              Webhook URL:{' '}
              <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs text-headz-black">/api/squire/webhook</code>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-headz-red">Recent transactions</h2>
        <p className="mt-1 text-xs text-headz-gray">Placeholder data — wire to Squire or your DB when ready.</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-headz-gray">
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Barber</th>
                <th className="pb-3 pr-4 font-medium">Service</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_TXNS.map((t) => (
                <tr key={t.id} className="border-b border-black/5 text-headz-black">
                  <td className="py-3 pr-4 tabular-nums text-headz-gray">{t.date}</td>
                  <td className="py-3 pr-4">{t.barber}</td>
                  <td className="py-3 pr-4">{t.service}</td>
                  <td className="py-3 pr-4 font-semibold text-headz-red tabular-nums">{t.amount}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        t.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
