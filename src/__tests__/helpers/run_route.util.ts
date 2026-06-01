export async function runRoute<T>(fn: () => Promise<Response>): Promise<{ status: number; data: T }> {
  const res = await fn()
  const text = await res.text()
  let data: unknown
  if (text.length === 0) {
    data = undefined
  } else {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return {
    status: res.status,
    data: data as T
  }
}
