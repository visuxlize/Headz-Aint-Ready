import { SquareClient, SquareEnvironment } from 'square'
import { v4 as uuidv4 } from 'uuid'

let _client: SquareClient | null = null

export function getSquareClient(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) return null
  if (!_client) {
    _client = new SquareClient({
      token,
      environment:
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    })
  }
  return _client
}

export function requireSquareClient(): SquareClient {
  const c = getSquareClient()
  if (!c) throw new Error('Square is not configured (SQUARE_ACCESS_TOKEN missing)')
  return c
}

export const toCents = (dollars: number): bigint => BigInt(Math.round(dollars * 100))

export const fromCents = (cents: bigint | number | string | undefined | null): number => {
  if (cents === undefined || cents === null) return 0
  const n = typeof cents === 'bigint' ? Number(cents) : Number(cents)
  return Number.isFinite(n) ? n / 100 : 0
}

export const newIdempotencyKey = (): string => uuidv4()
