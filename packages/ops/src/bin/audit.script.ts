#!/usr/bin/env bun
import { routeByUsageCmd, runBinMain } from '../support/lib/cli/dispatch.script'

runBinMain(() =>
  routeByUsageCmd({
    task: 'audit',
    routes: {
      'rogue-refs': ['bun', 'packages/ops/src/governance/policies/rogue_refs.script.ts']
    }
  })
)
