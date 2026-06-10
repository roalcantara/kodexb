#!/usr/bin/env bun
const CMD = process.env.usage_cmd ?? process.argv[2] ?? ''
switch (CMD) {
  case 'check':
    console.error('policy check: delegated to mise (thin stub — full extraction deferred)')
    process.exit(0)
    break
  default:
    console.error(`policy: unknown subcommand "${CMD}"`)
    process.exit(2)
}
