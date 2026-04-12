import { redirect } from 'next/navigation'
import { SQUIRE } from '@/lib/squire-config'

export default function TimeOffPage() {
  redirect(SQUIRE.adminAppUrl)
}
