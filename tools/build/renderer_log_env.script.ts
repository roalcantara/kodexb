import type { BunPlugin } from 'bun'

const NEW_LOCAL_FILTER = /renderer_build_env\.ts$/

/**
 * Replaces `process.env.LOG_LEVEL` / `NODE_ENV` in `renderer_build_env.ts` with
 * string literals when the Electrobun view bundle is built. CEF has no `process`
 * at runtime; Bun's default browser build does not always inline env without
 * `--env=inline`.
 */
export function rendererLogEnvPlugin(): BunPlugin {
  return {
    name: 'kb-renderer-log-env',
    setup(build) {
      build.onLoad({ filter: NEW_LOCAL_FILTER }, async args => {
        const logLevel = process.env.LOG_LEVEL ?? ''
        const nodeEnv = process.env.NODE_ENV ?? ''
        let contents = await Bun.file(args.path).text()
        contents = contents.replaceAll('process.env.LOG_LEVEL', JSON.stringify(logLevel))
        contents = contents.replaceAll('process.env.NODE_ENV', JSON.stringify(nodeEnv))
        return { contents, loader: 'ts' }
      })
    }
  }
}
