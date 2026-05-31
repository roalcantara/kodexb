/** Default status for expected route failures the renderer handles (toast), not global 500. */
export const INVOKE_ROUTE_DEFAULT_FAILURE_STATUS = 422

export type InvokeRouteOptions = {
  failureStatus?: number
}

/**
 * Run an RPC handler body with explicit failure mapping.
 *
 * Unhandled throws still reach `rpcErrorContract` (HTTP 500). Use this when a
 * route intentionally maps App/shell failures to a non-500 status and
 * `{ error: string }` — handoff, user-recoverable shell actions, etc.
 */
export async function invokeRoute<T>(
  set: { status?: number | string },
  run: () => T | Promise<T>,
  options: InvokeRouteOptions = {}
): Promise<T | { error: string }> {
  const failureStatus = options.failureStatus ?? INVOKE_ROUTE_DEFAULT_FAILURE_STATUS
  try {
    return await run()
  } catch (e) {
    set.status = failureStatus
    return { error: String(e) }
  }
}
