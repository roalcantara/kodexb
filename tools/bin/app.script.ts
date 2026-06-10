#!/usr/bin/env bun
const CMD = process.env.usage_cmd ?? process.argv[2] ?? ''
const miscArgs = process.argv.slice(2).filter(a => a !== CMD)

function run(): void {
  if (CMD === 'gates') {
    const subcmd = process.env.usage_subcmd ?? miscArgs[0] ?? 'all'
    if (subcmd === 'quality' || subcmd === 'all') {
      const r = Bun.spawnSync(['bash', '.agents/skills/app-quality-gate/scripts/gate.sh'], {
        stdio: ['inherit', 'inherit', 'inherit']
      })
      process.exit(r.exitCode ?? 0)
    }
    console.error(`app gates: unknown subcommand "${subcmd}"`)
    process.exit(2)
  }
  const r = Bun.spawnSync(['mise', 'run', 'app', CMD, ...miscArgs], { stdio: ['inherit', 'inherit', 'inherit'] })
  process.exit(r.exitCode ?? 0)
}
run()
