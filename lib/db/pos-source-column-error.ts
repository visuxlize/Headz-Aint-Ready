/** Postgres/Drizzle error when `pos_transactions.source` has not been migrated yet. */
export function isMissingPosSourceColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /source.*does not exist|column.*source/i.test(msg)
}
