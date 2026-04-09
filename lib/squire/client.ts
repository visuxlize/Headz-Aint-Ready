const SQUIRE_API_BASE = 'https://api.getsquire.com/v1'

export function requireSquireApiKey(): string {
  const key = process.env.SQUIRE_API_KEY?.trim()
  if (!key) {
    throw new Error('SQUIRE_API_KEY is not configured')
  }
  return key
}

/** Authenticated request to Squire HTTP API. */
export async function squireFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = requireSquireApiKey()
  const url = path.startsWith('http') ? path : `${SQUIRE_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}
