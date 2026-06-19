#!/usr/bin/env bun
import { routeByUsageCmd, runBinMain } from '../support/lib/cli/dispatch.script'

runBinMain(() =>
  routeByUsageCmd({
    task: 'hooks',
    routes: {
      'governance-audit': ['bun', 'test', '--config', '/dev/null', '.cursor/hooks/governance_audit.core.spec.ts']
    }
  })
)
