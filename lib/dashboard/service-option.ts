/** Active service row for admin ticket / POS pickers (serializable from server). */
export type ServiceOption = {
  id: string
  name: string
  /** Numeric string from DB, e.g. "45.00" */
  price: string
  priceDisplayOverride: string | null
}
