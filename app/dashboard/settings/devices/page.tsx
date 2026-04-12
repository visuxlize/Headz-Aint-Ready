import { redirect } from 'next/navigation'
import { SQUIRE } from '@/lib/squire-config'

export default function DevicesRedirectPage() {
  redirect(SQUIRE.adminAppUrl)
}
