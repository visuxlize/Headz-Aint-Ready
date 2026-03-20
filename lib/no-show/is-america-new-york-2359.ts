/**
 * True when `date` is 23:59 (11:59 PM) in America/New_York.
 * Used with an hourly UTC cron so the job runs at the correct local time year-round (DST-safe).
 */
export function isAmericaNewYork2359(date: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false
  return hour === 23 && minute === 59
}
