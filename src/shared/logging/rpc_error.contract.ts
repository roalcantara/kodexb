import { Elysia } from 'elysia'

const HTTP_INTERNAL_ERROR = 500

export const rpcErrorContract = new Elysia({ name: 'rpc-error' }).onError({ as: 'global' }, ({ error, set }) => {
  const message = error instanceof Error ? error.message : String(error)
  set.status = HTTP_INTERNAL_ERROR
  return { error: message }
})
