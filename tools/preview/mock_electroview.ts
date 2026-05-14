/**
 * Browser-side mock of electrobun/view for the preview server.
 *
 * Renderer code calls `Electroview.defineRPC` and then either:
 *   - request.rpcCall({ path, method, body, headers }) — the Eden Treaty
 *     bridge used by the renderer client. Mock turns it into a real
 *     `fetch(path, init)` against the preview HTTP server.
 *   - request.<legacyMethod>(params) — pre-Eden manual call, kept until
 *     the renderer migration finishes.
 *
 * Messages (main -> renderer push) are ignored in preview — sync progress is
 * a native-only signal in this environment.
 */

type Handler = (...args: unknown[]) => unknown
type Schema = { handlers?: { requests?: Record<string, Handler>; messages?: Record<string, Handler> } }

type RpcCallParams = {
  path: string
  method?: string
  body?: string
  headers?: Record<string, string>
}

type RpcCallResponse = { status: number; body: string }

async function rpcCallViaFetch(params: RpcCallParams): Promise<RpcCallResponse> {
  const method = params.method ?? 'POST'
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(params.headers ?? {})
  }
  const init: RequestInit = { method, headers, body: params.body }
  const res = await fetch(params.path, init)
  return { status: res.status, body: await res.text() }
}

function makeRequestProxy(): Record<string, (params: unknown) => Promise<unknown>> {
  return new Proxy({} as Record<string, (params: unknown) => Promise<unknown>>, {
    get(_, method: string) {
      if (method === 'rpcCall') {
        return (params: unknown) => rpcCallViaFetch(params as RpcCallParams)
      }
      return (params: unknown) =>
        fetch(`/api/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params ?? {})
        }).then(r => r.json())
    }
  })
}

export class Electroview {
  readonly rpc: unknown

  static ['defineRPC'](_config: Schema) {
    return {
      request: makeRequestProxy(),
      setTransport: () => undefined,
      send: {}
    }
  }

  constructor(config: { rpc: unknown }) {
    this.rpc = config.rpc
  }
}
