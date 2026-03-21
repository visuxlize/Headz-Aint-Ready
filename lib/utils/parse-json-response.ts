/** Safe JSON parse for fetch — avoids "Unexpected end of JSON input" on empty/HTML bodies */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`)
    }
    throw new Error('Empty response from server')
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Invalid response from server (not JSON)')
  }
}
