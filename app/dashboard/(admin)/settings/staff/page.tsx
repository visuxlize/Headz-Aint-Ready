import { StaffAccountsClient } from '@/components/dashboard/StaffAccountsClient'

export default function StaffAccountsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Staff accounts</h1>
        <p className="text-sm text-headz-gray mt-1">
          Manage login emails, names, and phones for admins and barbers. Marketing-site barber names and photos follow
          these accounts.
        </p>
      </div>
      <StaffAccountsClient />
    </div>
  )
}
