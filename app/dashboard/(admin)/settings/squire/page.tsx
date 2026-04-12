import { redirect } from 'next/navigation'
import { SQUIRE } from '@/lib/squire-config'

export const metadata = {
  title: 'Squire | Headz Staff',
}

export default function SquireSettingsRedirectPage() {
  redirect(SQUIRE.adminAppUrl)
}
