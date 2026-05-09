/**
 * Browser-side mock of electrobun/view for the preview server.
 * Each RPC request becomes a POST to /api/<method> on the preview server.
 * Messages (main->renderer push) are ignored; sync progress is native-only.
 */

type Handler = (...args: unknown[]) => unknown
type Schema = { handlers?: { requests?: Record<string, Handler>; messages?: Record<string, Handler> } }

function makeRequestProxy(): Record<string, (params: unknown) => Promise<unknown>> {
  return new Proxy({} as Record<string, (params: unknown) => Promise<unknown>>, {
    get(_, method: string) {
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

  // biome-ignore lint/style/useNamingConvention: mirrors the Electrobun API.
  static defineRPC(_config: Schema) {
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
