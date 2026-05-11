// Type-only barrel: the renderer imports the Elysia route type from the main
// process so Eden Treaty can derive request / response signatures at compile
// time. The actual implementation never reaches the renderer bundle because
// the import is `type`-only (verbatimModuleSyntax in tsconfig strips it at
// emit time).
export type { RpcApp } from '../../main/rpc/server'
