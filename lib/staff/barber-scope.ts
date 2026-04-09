import { NextResponse } from 'next/server'

/** Result of requireStaffApi / requireBarberApi when authorized */
export type ScopedStaffAuth = {
  user: { id: string }
  dbUser: { role: string }
}

/**
 * Admins may act for any barber. Non-admins may only use their own `users.id`
 * (same as `appointments.barber_id` / `pos_transactions.barber_id`).
 */
export function requireBarberUserId(
  auth: ScopedStaffAuth,
  barberUserId: string
): NextResponse | null {
  if (auth.dbUser.role === 'admin') return null
  if (auth.user.id !== barberUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
