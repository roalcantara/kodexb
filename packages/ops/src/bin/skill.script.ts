#!/usr/bin/env bun
import { forwardToScript, runBinMain } from '../support/lib/cli/dispatch.script'

runBinMain(() =>
  forwardToScript('governance/registries/skill/skill_registry.script.ts', { passCmd: true, dropTokens: ['skill'] })
)
