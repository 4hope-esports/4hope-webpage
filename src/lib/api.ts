/** Sends a JSON request and returns the parsed body, throwing `data.error` (or a fallback message) on a non-OK response. */
export async function requestJson<T = unknown>(
  url: string,
  options: { method?: 'POST' | 'PATCH'; body?: unknown; fallbackError?: string } = {},
): Promise<T> {
  const { method = 'POST', body, fallbackError = 'Request failed' } = options
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data
}

/** POSTs JSON and returns the parsed body, throwing `data.error` (or a fallback message) on a non-OK response. */
export function postJson<T = unknown>(url: string, body?: unknown, fallbackError?: string): Promise<T> {
  return requestJson<T>(url, { method: 'POST', body, fallbackError })
}
