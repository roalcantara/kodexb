export function fireAndForget<T>(p: Promise<T>): void {
  p.catch(() => undefined)
}
