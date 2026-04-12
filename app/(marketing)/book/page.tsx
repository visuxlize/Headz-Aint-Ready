import { redirect } from 'next/navigation'
import { SQUIRE } from '@/lib/squire-config'

export const metadata = {
  title: "Book | Headz Ain't Ready",
}

export default function BookPage() {
  redirect(SQUIRE.bookingUrl)
}
