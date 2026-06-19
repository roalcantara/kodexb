import { getLogger } from '@logtape/logtape'
import { acTagFromSliceId, isAcSliceId } from '../../../governance/registries/catalog/tag.script'
import { runInherit, spawnInherit } from '../shared/spawn_inherit.script'
import { usageCmd, usageFlag, usageFlags, usageStrings } from './usage_env.script'

export const KNOWN_ACTIONS = new Set(['unit', 'ci', 'spec-audit', 'spec-style', 'e2e-preview', 'e2e', 'tag'])
const METRICS = 'packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts'

export function parseTagCli(): {
  list: boolean
  e2e: boolean
  unit: boolean
  json: boolean
  catalogKeys: string[]
  acTag?: string
} {
  const { list, e2e, unit, json } = usageFlags(process.env, ['list', 'e2e', 'unit', 'json'])
  const catalogKeys: string[] = []
  let acTag: string | undefined
  const { key, slice } = usageStrings(process.env, ['key', 'slice'])
  if (key) {
    if (isAcSliceId(key)) acTag = acTagFromSliceId(key) ?? undefined
    else catalogKeys.push(key)
  }
  if (slice && isAcSliceId(slice)) {
    acTag = acTagFromSliceId(slice) ?? undefined
  }
  if (usageCmd(process.env) === 'tag') {
    for (const arg of process.argv.slice(2)) {
      if (arg === 'tag' || KNOWN_ACTIONS.has(arg) || arg.startsWith('--')) continue
      if (isAcSliceId(arg)) acTag = acTagFromSliceId(arg) ?? undefined
      else catalogKeys.push(arg)
    }
  }
  return { list, e2e, unit, json, catalogKeys, acTag }
}

export function runE2e(root: string): void {
  const { ci, smoke, regression, debug } = usageFlags(process.env, ['ci', 'smoke', 'regression', 'debug'])
  const metricsReport = usageFlag(process.env, 'metrics_report') || usageFlag(process.env, 'metrics-report')
  const metricsCompare = usageFlag(process.env, 'metrics_compare') || usageFlag(process.env, 'metrics-compare')
  const writeBaseline = usageFlag(process.env, 'write_baseline') || usageFlag(process.env, 'write-baseline')
  if (smoke && regression) {
    getLogger(['kb', 'ops', 'test']).error('test e2e: --smoke and --regression are mutually exclusive')
    process.exit(2)
  }
  if (ci) {
    process.env.CI = 'true'
    process.env.NODE_ENV = 'test'
  }
  if (writeBaseline) spawnInherit(['bun', METRICS, 'write-baseline'], root)
  const runSuite = smoke || regression || debug || (!metricsReport && !metricsCompare && !writeBaseline)
  if (runSuite) {
    const suiteCmd = smoke
      ? ['bun', 'run', 'e2e:smoke']
      : regression
        ? ['bun', 'run', 'e2e:regression']
        : debug
          ? ['bun', 'run', 'e2e:bddgen']
          : ['bun', 'run', 'e2e']
    const suiteCode = runInherit(suiteCmd, root)
    if (suiteCode !== 0) process.exit(suiteCode)
  }
  if (metricsReport) {
    const c = runInherit(['bun', METRICS, 'report'], root)
    if (c !== 0) process.exit(c)
  }
  if (metricsCompare) spawnInherit(['bun', METRICS, 'compare'], root)
  if (!runSuite && !metricsReport && !metricsCompare && !writeBaseline) {
    getLogger(['kb', 'ops', 'test']).error(
      'test e2e: pass --smoke, --regression, --metrics-report, or another e2e flag'
    )
    process.exit(2)
  }
}
