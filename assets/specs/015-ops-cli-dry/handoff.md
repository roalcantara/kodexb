# Handoff — `015-ops-cli-dry`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
| OCD-1 AC1 | `spec_kit.script.ts` wraps entry in `runBinMain` | `grep -n "runBinMain" packages/ops/src/bin/spec_kit.script.ts` |
| OCD-1 AC2 | Switch-case block in `spec_kit.script.ts` is replaced by a declarative `actionMap` | `grep -n "actionMap" packages/ops/src/bin/spec_kit.script.ts` |
| OCD-1 AC3 | Flags like `--dry-run`, `--approve`, `--loop`, `--json`, and `--raw` are parsed using `usageFlags` and `usageStrings` | `mise run spec kit next --dry-run` |
| OCD-2 AC1 | Linter, tracer, and macOS installer scripts use `usage_env` helpers to parse options | `grep -n "usageFlags" packages/ops/src/governance/specs/lint.script.ts` |
| OCD-2 AC2 | Standard execution fallbacks parse positional parameters when run directly in shell | `bun packages/ops/src/governance/specs/lint.script.ts assets/specs/015-ops-cli-dry --strict` |
| OCD-2 AC3 | Logging inside `macos_app.script.ts` is migrated from `console` to `getLogger` | `grep -n "getLogger" packages/ops/src/bin/macos_app.script.ts` |
| OCD-3 AC1 | Positions `$1` and `$@` in spec/catalog tasks inside `mise.toml` are migrated to standard usage configurations | `git diff mise.toml` |
| OCD-4 AC1 | `text_file.script.ts` implements and exports synchronous Results-wrapped reader functions | `bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts` |
| OCD-4 AC2 | `audit_core.script.ts`, `resolve_catalog_key.script.ts`, and `catalog_paths.util.ts` use Result-based functional reads | `bun test packages/ops/src/governance/specs/audit_core.script.spec.ts` |
| OCD-5 AC1 | `@kb/shared` is initialized under `packages/shared/` and exported | `bun test` |
| OCD-5 AC2 | Workspace packages import central logging from `@kb/shared/logging` | `grep -rn "@kb/shared/logging" packages/exec/ packages/ops/` |
| OCD-5 AC3 | Diagnostic `console` logging is migrated to LogTape `getLogger` | `bun packages/ops/src/bin/spec_kit.script.ts analyze assets/specs/015-ops-cli-dry --pass plan` |
