import { Elysia } from 'elysia'
import { rpcLogger } from './rpc.middleware'
import { rpcErrorContract } from './rpc_error.contract'

// Order matters: `rpcLogger.onError` logs without returning a value, so
// Elysia's onError chain proceeds to `rpcErrorContract.onError`, which
// converts the error to the `{ error: string }` / HTTP 500 envelope. If we
// mounted `rpcErrorContract` first, the contract would return a response
// and short-circuit the logger's error hook before the error was recorded.
export const rpcCommonPlugins = new Elysia({ name: 'kb-rpc-common' }).use(rpcLogger).use(rpcErrorContract).as('global')
