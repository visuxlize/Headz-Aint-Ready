export type EffectiveDayMode = 'unavailable' | 'open' | 'custom'

/** When no row in `barber_day_modes`, legacy behavior: rows => custom, none => open. */
export function getEffectiveDayMode(
  modeRow: { mode: string } | undefined,
  intervalRowsForDay: number
): EffectiveDayMode {
  if (modeRow) return modeRow.mode as EffectiveDayMode
  return intervalRowsForDay > 0 ? 'custom' : 'open'
}
