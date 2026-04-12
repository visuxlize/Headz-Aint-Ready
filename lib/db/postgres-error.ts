/**
 * Drizzle often wraps the real `PostgresError` in `error.cause`, while `error.message` is a generic
 * "Failed query: …" string — matchers must walk the chain.
 */
/** Exported for legacy-column matchers (Drizzle wraps `PostgresError` in `cause`). */
export function postgresErrorText(e: unknown): string {
  const parts: string[] = []
  let cur: unknown = e
  for (let i = 0; i < 10 && cur != null; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message)
      cur = cur.cause
    } else {
      parts.push(String(cur))
      break
    }
  }
  return parts.join('\n')
}

/** Older DBs without `pos_transactions.source`. */
export function isMissingPosSourceColumnError(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return /pos_transactions\.["']?source["']? does not exist|column .*source.*does not exist|\b42703\b.*source/i.test(
    msg
  )
}

/** Until `scripts/add-barbers-ticket-display-columns.sql` is applied. */
export function isMissingTicketDisplayColumnError(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return /ticket_display_name|ticket_display_avatar/i.test(msg) && /does not exist/i.test(msg)
}

/** Until `scripts/add-pos-barber-profile-id.sql` is applied on `pos_transactions`. */
export function isMissingBarberProfileIdColumnError(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return /barber_profile_id/i.test(msg) && /does not exist/i.test(msg)
}

/** `barber_id` is still NOT NULL but we insert roster-only tickets with null `barber_id` — run same DDL as add-pos-barber-profile-id.sql. */
export function isBarberIdNotNullViolation(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return (
    /\b23502\b/.test(msg) ||
    /null value in column ["']barber_id["']/i.test(msg) ||
    (/barber_id/i.test(msg) && /not null/i.test(msg) && /violat/i.test(msg))
  )
}

export function needsPosManualTicketDdls(e: unknown): boolean {
  return isMissingBarberProfileIdColumnError(e) || isBarberIdNotNullViolation(e)
}
