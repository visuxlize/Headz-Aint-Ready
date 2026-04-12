import { randomBytes } from 'node:crypto'

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Cryptographically random password for new staff (meets typical min-length rules). */
export function generateTemporaryPassword(length = 20): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[bytes[i]! % ALPHANUM.length]!
  }
  return out
}
