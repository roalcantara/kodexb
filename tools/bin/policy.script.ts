#!/usr/bin/env bun
const CMD = process.env.usage_cmd ?? process.argv[2] ?? ''

function run(): void {
  if (CMD === 'check') {
    const r = Bun.spawnSync(['mise', 'run', 'policy', 'check'], { stdio: ['inherit', 'inherit', 'inherit'] })
    process.exit(r.exitCode ?? 0)
  }
  console.error(`policy: unknown subcommand "${CMD}"`)
  process.exit(2)
}
run()
