export type CiGateResult = 'pass' | 'retry' | 'escalate'

export function checkCiGate(exitCode: number | null, retryCount: number, maxRetries: number): CiGateResult {
  if (exitCode === 0) return 'pass'
  if (retryCount < maxRetries) return 'retry'
  return 'escalate'
}

export function isCiPending(exitCode: number | null): boolean {
  return exitCode === null
}

export function isCiGreen(exitCode: number | null): boolean {
  return exitCode === 0
}

export function isCiFailing(exitCode: number | null): boolean {
  return exitCode !== null && exitCode !== 0
}
