'use client'

import { AdminOverviewTab } from '@/components/dashboard/AdminOverviewTab'

export function AdminDashboardClient() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="bg-[#FAFAF8] min-h-[60vh] -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 rounded-xl">
        <AdminOverviewTab />
      </div>
    </div>
  )
}
