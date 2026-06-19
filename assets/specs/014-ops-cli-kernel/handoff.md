# Handoff — `014-ops-cli-kernel`

**Spec:** `assets/specs/014-ops-cli-kernel/`

| ID | Done when | Evidence |
| --- | --- | --- |
| OCK-1 AC1 | No `process.argv` scans in migrated bin files | `rg 'process\.argv.*--' packages/ops/src/bin/{app,catalog,skill,test}.script.ts` |
| OCK-1 AC2 | `usageFlag` maps boolean strings without schemas | `bun test packages/ops/src/support/lib/cli/usage_env.script.spec.ts` |
| OCK-1 AC3 | Invalid enum rejected by mise before script run | `mise run test e2e --scope bogus` |
| OCK-1 AC4 | `usage_*` environment variables stripped from children | `bun test packages/ops/src/support/lib/shared/spawn_inherit.script.spec.ts` |
| OCK-1 AC5 | Fallback to `process.argv[2]` when run directly | `bun test packages/ops/src/support/lib/cli/usage_env.script.spec.ts` |
| OCK-2 AC1 | Spec audit/style delegated from `test.script.ts` | `bun test packages/ops/src/governance/specs/spec_audit.script.spec.ts` |
| OCK-2 AC2 | Bin stubs stubs are slim (≤80 LOC, test ≤150 LOC) | `wc -l packages/ops/src/bin/{app,catalog,skill,test}.script.ts` |
| OCK-2 AC3 | `planCatalog` and `planTest` are pure functions | `bun test packages/ops/src/bin/catalog.script.spec.ts` |
| OCK-3 AC1 | shared `readTextLines` helper implemented and tested | `bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts` |
| OCK-3 AC2 | Single read for both first-line and full-line scans | `cat packages/ops/src/governance/registries/catalog/catalog_validate.script.ts` |
| OCK-3 AC3 | `tag` and `e2e_metrics` adopt shared helper | `rg "split\\('\\\\n'\\)\\[0\\]" packages/ops/src/` |
| OCK-4 AC1 | `getLogger` used in migrated files instead of `console.*` | `rg 'console\.' packages/ops/src/bin/{app,catalog,skill,test}.script.ts` |
| OCK-4 AC2 | Raw/JSON machine output emitted to stdout unchanged | `bun test packages/ops/src/governance/registries/catalog/catalog_validate.script.spec.ts` |
| OCK-5 AC1 | `skill_registry.script.ts` migrated to `usage_env` | `bun test packages/ops/src/governance/registries/skill/skill_registry.script.spec.ts` |
| OCK-5 AC2 | `perf.script.ts` uses `usage_env` instead of local `envBool` | `mise run perf workflow-observability --no-regression --warmup 1 --iterations 2` |
| OCK-5 AC3 | `scan.script.ts` limits argv parsing for mise flags | `bun test packages/ops/src/governance/security/scan.script.spec.ts` |
| OCK-5 AC4 | `spec_kit` duplicate env reads replaced | `bun test packages/ops/src/bin/spec_kit.script.spec.ts` |
| OCK-7 AC1 | `Bun.YAML.parse` used instead of `yaml` npm package | `rg "from 'yaml'" packages/ops/src/` |
| OCK-7 AC2 | `"yaml"` npm dependency removed | `rg '"yaml"' package.json` |
| OCK-7 AC3 | allowlist and catalog key resolution behavior matches | `bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts` |
| OCK-7 AC4 | Parsing errors wrap native errors in `HandoffAllowlistError` | `bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts` |
