#!/usr/bin/env bun
const CMD = process.env.usage_cmd ?? process.argv[2] ?? ''
switch (CMD) {
  case 'start':
  case 'styles':
  case 'gates':
  case 'lifecycle':
    console.error(`app ${CMD}: delegated to mise (thin stub — full extraction deferred)`)
    process.exit(0)
    break
  default:
    console.error(`app: unknown subcommand "${CMD}"`)
    process.exit(2)
}
