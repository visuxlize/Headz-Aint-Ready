import { redirect } from 'next/navigation'

/** Card payments use Square Terminal — settings live under Devices. */
export default function AdminPosRedirectPage() {
  redirect('/dashboard/settings/devices')
}
