import { existsSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script.ts'

const SPECS = 'tools/governance/specs'

function usage(): never {
  console.error('Usage: bun tools/governance/specs/phase.script.ts <feature-dir> [--phase <number>]')
  return process.exit(2)
}

function main(): void {
  const root = chdirToRepoRoot()
  const args = process.argv.slice(2)
  const phaseIdx = args.indexOf('--phase')
  const phaseNo = phaseIdx >= 0 ? (args[phaseIdx + 1] ?? '') : ''

  const featureDir = args.find((a): a is string => !a.startsWith('--') && a !== phaseNo)

  if (!featureDir) usage()

  if (!existsSync(path.join(featureDir, 'spec.md'))) {
    console.error(`spec phase: no spec.md found in ${featureDir}`)
    process.exit(1)
  }

  const t0 = performance.now()

  const fixResult = Bun.spawnSync(['hk', 'check', '--profile', 'fix'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit'
  })
  if (fixResult.exitCode !== 0) {
    console.error('spec phase: hk check --profile fix failed')
    process.exit(fixResult.exitCode ?? 1)
  }

  const lintResult = Bun.spawnSync(['bun', `${SPECS}/lint.script.ts`, '--strict', featureDir], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  if (lintResult.exitCode !== 0) {
    console.error('spec phase: spec lint --strict failed')
    process.exit(lintResult.exitCode ?? 1)
  }

  const tasksExists = existsSync(path.join(featureDir, 'tasks.md'))
  if (tasksExists) {
    const traceResult = Bun.spawnSync(['bun', `${SPECS}/trace.script.ts`, '--strict', featureDir], {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit'
    })
    if (traceResult.exitCode !== 0) {
      console.error('spec phase: spec trace --strict failed')
      process.exit(traceResult.exitCode ?? 1)
    }
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
  const phaseLabel = phaseNo ? ` (phase ${phaseNo})` : ''
  console.log(`spec phase${phaseLabel}: OK (${elapsed}s)`)
  process.exit(0)
}

try {
  main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
