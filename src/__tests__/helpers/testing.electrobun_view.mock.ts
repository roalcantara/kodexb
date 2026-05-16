import { mock } from 'bun:test'

export type RpcCallParams = {
  path: string
  method?: string
  body?: string
  headers?: Record<string, string>
}

export type RpcCallResponse = { status: number; body: string }

const messageHandlers: Record<string, (payload: unknown) => void> = {}

let rpcCallHandler: (params: RpcCallParams) => Promise<RpcCallResponse> = async () => ({
  status: 500,
  body: JSON.stringify({ error: 'rpcCall mock not configured' })
})

/** Override the Electrobun bridge used by `src/shell/renderer/rpc/client.ts` in tests. */
export function setRpcCallHandler(handler: (params: RpcCallParams) => Promise<RpcCallResponse>): void {
  rpcCallHandler = handler
}

/** Handlers registered by `Electroview.defineRPC` in `client.ts` (sync push messages). */
export function getElectrobunMessageHandler(name: string): ((payload: unknown) => void) | undefined {
  return messageHandlers[name]
}

function defineElectrobunRpc(config: { handlers?: { messages?: Record<string, (payload: unknown) => void> } }) {
  const messages = config.handlers?.messages ?? {}
  for (const [name, handler] of Object.entries(messages)) {
    messageHandlers[name] = handler
  }
  return {
    request: {
      rpcCall: (params: RpcCallParams) => rpcCallHandler(params)
    },
    send: {},
    setTransport: () => undefined
  }
}

const ELECTROVIEW_DEFINE_RPC = 'defineRPC' as const

class ElectroviewMock {
  readonly rpc: unknown

  constructor(config: { rpc: unknown }) {
    this.rpc = config.rpc
  }
}

Object.assign(ElectroviewMock, { [ELECTROVIEW_DEFINE_RPC]: defineElectrobunRpc })

mock.module('electrobun/view', () => ({
  Electroview: ElectroviewMock
}))
