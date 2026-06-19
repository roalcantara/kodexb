import { getLogger } from '@logtape/logtape'
import { chdirToRepoRoot } from '../shared/repo_root.script'
import { spawnInherit } from '../shared/spawn_inherit.script'
import { configureOpsLogging } from './ops_logging.script'
import { usageCmd } from './usage_env.script'

type MainFn = () => undefined | number | Promise<undefined | number>

export function runBinMain(fn: MainFn): void {
  if (import.meta.main || (process.argv[1] && !process.argv[1].includes('.spec.'))) {
    configureOpsLogging()
    try {
      const result = fn()
      if (result instanceof Promise) {
        result.then(
          (code: number | undefined) => {
            if (code) process.exit(code)
          },
          err => {
            getLogger(['kb', 'ops', 'dispatch']).error(err instanceof Error ? err.message : String(err))
            process.exit(1)
          }
        )
      } else if (result !== undefined && result !== 0) {
        process.exit(result)
      }
    } catch (err) {
      getLogger(['kb', 'ops', 'dispatch']).error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }
}

export function resolveUsageCmd(
  env: Record<string, string | undefined>,
  argv: string[],
  opts?: { dropTokens?: string[] }
): string {
  const cmd = usageCmd(env)
  if (cmd) return cmd
  const drop = new Set(opts?.dropTokens ?? [])
  const first = argv.find(a => !drop.has(a))
  return first ?? ''
}

export function forwardToScript(relativePath: string, opts?: { passCmd?: boolean; dropTokens?: string[] }): never {
  const root = chdirToRepoRoot()
  const argv = ['bun', `packages/ops/src/${relativePath}`]
  if (opts?.passCmd) {
    const cmd = resolveUsageCmd(process.env, process.argv.slice(2), { dropTokens: opts.dropTokens })
    if (cmd) argv.push(cmd)
    const remainingArgs = process.argv.slice(2).filter(a => a !== cmd && !(opts.dropTokens ?? []).includes(a))
    argv.push(...remainingArgs)
  }
  spawnInherit(argv, root)
}

export function routeByUsageCmd(config: { task: string; routes: Record<string, string[]> }): never {
  const root = chdirToRepoRoot()
  const cmd = resolveUsageCmd(process.env, process.argv.slice(2))
  const route = config.routes[cmd]
  if (route) {
    spawnInherit(route, root)
  }
  getLogger(['kb', 'ops', 'dispatch']).error(`${config.task}: unknown subcommand "${cmd}"`)
  process.exit(2)
}
