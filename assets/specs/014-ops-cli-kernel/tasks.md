<!-- markdownlint-disable-file -->

# Tasks: Ops CLI kernel (`014`)

**Status**: ✅ Complete (all phases implemented and verified)

**Input**: [`plan.md`](./plan.md), [`spec.md`](./spec.md) (OCK-1…OCK-7)
**Prerequisite**: `013-package-relocation` merged (`packages/ops/src/bin/**`, root `bin/*.script.ts` shims).
**Branch**: `014-ops-cli-kernel`
**Delivery**: One PR. Every task below is **required** for closeout unless listed under [Explicitly NOT in 014](#explicitly-not-in-014).

**Agent rule**: Do not skip phases. Do not add Commander/citty/yargs. Do not re-validate mise `choices` in script code. Run each task’s **Verify** block before marking the checkbox.

---

## Phase 0: Baseline

### OCK-BASE-01 — Branch and feature pointer

**Do**

1. Create branch `014-ops-cli-kernel` from current `main` (or continue on it if already created).
2. Set `.specify/feature.json` `spec_path` (or equivalent active feature field) to `assets/specs/014-ops-cli-kernel`.

**Acceptance criteria**

- `git branch --show-current` prints `014-ops-cli-kernel`.
- `.specify/feature.json` references `assets/specs/014-ops-cli-kernel`.

**Verify**

```sh
git branch --show-current
rg '014-ops-cli-kernel' .specify/feature.json
```

---

### OCK-BASE-02 — Spec gates on 014 artifacts

**Do**

Run SDD gates on this feature directory before code changes.

**Acceptance criteria**

- `mise run spec lint assets/specs/014-ops-cli-kernel` exits **0**.
- `mise run spec gate assets/specs/014-ops-cli-kernel` exits **0**.

**Verify**

```sh
mise run spec lint assets/specs/014-ops-cli-kernel
mise run spec gate assets/specs/014-ops-cli-kernel
```

---

### OCK-BASE-03 — Record metric baselines

**Do**

From repo root, run each command below once. Copy full stdout into `assets/specs/014-ops-cli-kernel/baseline-metrics.txt` (create this file; commit it in the PR).

**Acceptance criteria**

- File `assets/specs/014-ops-cli-kernel/baseline-metrics.txt` exists and contains output for all commands below.

**Verify** (commands to capture)

```sh
rg -l 'function envBool' packages/ops/src --glob '*.ts' | wc -l
rg 'function parseCli' packages/ops/src
rg 'hasCliFlag' packages/ops/src/bin/spec_kit.script.ts
rg "from 'yaml'" packages/ops/src
rg '"yaml"' package.json
rg 'process\.argv' packages/ops/src/bin -c
wc -l packages/ops/src/bin/test.script.ts packages/ops/src/bin/*.script.ts
/usr/bin/time -p mise run catalog validate 2>&1
/usr/bin/time -p mise run test spec-audit 2>&1
/usr/bin/time -p mise run skill list 2>&1
```

---

## Phase 1: Kernel modules (OCK-1, OCK-3, OCK-4)

### OCK-KERN-01 — `text_file.script.ts`

**Do**

1. Create `packages/ops/src/support/lib/shared/text_file.script.ts` exporting:
   - `readTextFile(path: string): Promise<string>`
   - `firstLine(text: string): string` — first line without trailing `\r`
   - `lines(text: string): string[]` — split on `\n`, drop final empty segment if file ends with newline
   - `readTextLines(path, 'first'): Promise<string>` and `readTextLines(path, 'all'): Promise<string[]>` via **function overloads** (or equivalent conditional return type).
2. Create co-located `text_file.script.spec.ts` with at least:
   - `firstLine` on multiline string
   - `lines` on multiline string
   - `readTextLines` overload return types (use temp file under `tmp/` or `Bun.write` in test)

**Acceptance criteria**

- No `any` in public exports.
- Both overloads of `readTextLines` are covered by specs.

**Verify**

```sh
bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts
```

---

### OCK-KERN-02 — `usage_env.script.ts`

**Do**

1. Create `packages/ops/src/support/lib/cli/usage_env.script.ts` exporting:

| Export                                           | Implementation                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `usageFlag(env, name)`                           | `env[\`usage_${name}\`] === 'true'`                                                   |
| `usageOptString(env, name)`                      | `env[\`usage_${name}\`]?.trim() \|\| undefined`                                       |
| `usageCmd(env, fallback?)`                       | `env.usage_cmd?.trim() \|\| fallback?.trim() \|\| ''`                                 |
| `stripUsageEnv(env)`                             | Shallow copy; delete every key starting with `usage_`                                 |
| `copyUsageToChild(strippedEnv, parentEnv, keys)` | For each `keys` entry `k`, set `usage_${k}` on child from `parentEnv` when defined    |
| `rawJsonConflict(raw, json)`                     | Move logic from `spec.script.ts` `rawJsonConflict`; same return type `string \| null` |

2. Module header comment: **mise-trusted** — no TypeBox per-flag validation.
3. Create `usage_env.script.spec.ts` covering: `usageFlag`, `stripUsageEnv` (assert `usage_foo` removed, `PATH` kept), `rawJsonConflict`, `copyUsageToChild`.

**Acceptance criteria**

- `rg 'function rawJsonConflict' packages/ops/src/bin/spec.script.ts` still matches until OCK-BIN-04 removes the duplicate.
- No `zod` / `Value.Check` on individual flags in this module.

**Verify**

```sh
bun test packages/ops/src/support/lib/cli/usage_env.script.spec.ts
```

---

### OCK-KERN-03 — `dispatch.script.ts`

**Do**

1. Create `packages/ops/src/support/lib/cli/dispatch.script.ts` exporting:

| Export                                 | Behaviour                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runBinMain(fn)`                       | If `import.meta.main` or argv[1] not containing `.spec.`: call `configureOpsLogging()` then `fn()`; on rejection log via `getLogger(['kb','ops','dispatch']).error` and `process.exit(1)`                                                                                                                                               |
| `resolveUsageCmd(env, argv, opts?)`    | Return `usageCmd(env)` when non-empty; else first token in `argv` after dropping `opts.dropTokens` (default `[]`)                                                                                                                                                                                                                       |
| `forwardToScript(relativePath, opts?)` | `chdirToRepoRoot()`; build `['bun', 'packages/ops/src/' + relativePath]`; when `opts.passCmd === true`, append `resolveUsageCmd(process.env, process.argv.slice(2), { dropTokens: opts.dropTokens ?? ['skill'] })` then remaining argv positional args not equal to cmd; `spawnInherit` with `stripUsageEnv` applied; **never returns** |
| `routeByUsageCmd(config)`              | `config.task` string for errors; `config.routes: Record<string, string[]>` full argv prefix per route; `cmd = resolveUsageCmd(process.env, process.argv.slice(2))`; on match `spawnInherit(route, root)`; on miss `getLogger(...).error` unknown subcommand and `process.exit(2)`                                                       |

2. Create `dispatch.script.spec.ts` testing `resolveUsageCmd` with fixture env/argv objects (no subprocess).

3. Rewrite these bin files to use `dispatch` (delete local spawn/switch boilerplate):

| File                                   | Target shape                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ops/src/bin/skill.script.ts` | `runBinMain(() => forwardToScript('governance/registries/skill/skill_registry.script.ts', { passCmd: true, dropTokens: ['skill'] }))`                                                                                                                           |
| `packages/ops/src/bin/audit.script.ts` | `runBinMain(() => routeByUsageCmd({ task: 'audit', routes: { 'rogue-refs': ['bun', 'packages/ops/src/governance/policies/rogue_refs.script.ts'] } }))` — `resolveUsageCmd` must accept `argv[2]==='rogue-refs'` when `usage_cmd` empty (spec.script spawn path) |
| `packages/ops/src/bin/hooks.script.ts` | `routeByUsageCmd` with `governance-audit` → `['bun', 'test', '--config', '/dev/null', '.cursor/hooks/governance_audit.core.spec.ts']`                                                                                                                           |

4. Each of the three files above: **≤ 20 lines** excluding shebang and blank lines.

**Acceptance criteria**

- `rg 'Bun\.spawn' packages/ops/src/bin/skill.script.ts` → **0** matches.
- `rg 'console\.' packages/ops/src/bin/{skill,audit,hooks}.script.ts` → **0** matches.
- `mise run skill list` exits **0**.
- `mise run hooks governance-audit` exits **0**.
- `mise run spec audit docs rogue-refs` exits **0**.

**Verify**

```sh
bun test packages/ops/src/support/lib/cli/dispatch.script.spec.ts
wc -l packages/ops/src/bin/skill.script.ts packages/ops/src/bin/audit.script.ts packages/ops/src/bin/hooks.script.ts
mise run skill list
mise run hooks governance-audit
mise run spec audit docs rogue-refs
```

---

### OCK-KERN-04 — Relocate `shim_spawn` test helper

**Do**

1. Create `packages/ops/src/support/lib/testing/spawn_bin.script.ts` with **identical exports** to current `shim_spawn.script.ts`: `REPO_ROOT`, `spawnScript(binPath, env?)`.
2. Move `packages/ops/src/bin/shim_spawn.script.spec.ts` → `packages/ops/src/support/lib/testing/spawn_bin.script.spec.ts`; update imports.
3. Update imports in `packages/ops/src/bin/app.script.spec.ts` and `packages/ops/src/bin/policy.script.spec.ts` to import from `../support/lib/testing/spawn_bin.script`.
4. Delete `packages/ops/src/bin/shim_spawn.script.ts`.

**Acceptance criteria**

- `test -f packages/ops/src/bin/shim_spawn.script.ts` → **false**.
- `rg 'shim_spawn' packages/ops` → **0** matches.

**Verify**

```sh
bun test packages/ops/src/support/lib/testing/spawn_bin.script.spec.ts
bun test packages/ops/src/bin/app.script.spec.ts
bun test packages/ops/src/bin/policy.script.spec.ts
rg 'shim_spawn' packages/ops
```

---

### OCK-KERN-05 — `ops_logging.script.ts`

**Do**

1. Create `packages/ops/src/support/lib/cli/ops_logging.script.ts` exporting `configureOpsLogging(): void`:
   - Idempotent (second call no-op).
   - Uses `@logtape/logtape` `configureSync` + `getConsoleSink` (same pattern as `src/shared/logging/main.config.ts`).
   - Registers logger category `['kb', 'ops']` at lowest level from `LOG_LEVEL` / default verbosity.
2. Create `ops_logging.script.spec.ts` asserting second call does not throw.
3. `dispatch.script.ts` `runBinMain` calls `configureOpsLogging()` before user `fn`.

**Acceptance criteria**

- `rg 'console\.(log|error|warn)' packages/ops/src/support/lib/cli/dispatch.script.ts` → **0**.

**Verify**

```sh
bun test packages/ops/src/support/lib/cli/ops_logging.script.spec.ts
```

---

### OCK-KERN-06 — `catalog_validate` text I/O

**Do**

1. In `packages/ops/src/governance/registries/catalog/catalog_validate.script.ts`:
   - Delete local `readFirstLine` and `readAllLines` (lines ~73–81).
   - Import `readTextFile`, `firstLine`, `lines` from `text_file.script.ts`.
2. In `validateTagPlacement`: for `.feature` files use `lines(await readTextFile(full))`; for `.spec.` files use `firstLine(await readTextFile(full))`.
3. In `collectMembershipTagsInFile`: **one** `readTextFile(full)` per path; branch on extension using `lines(text)` or `firstLine(text)` — do not call `readTextFile` twice for the same `full` path in one invocation.

**Acceptance criteria**

- `rg 'function readFirstLine|function readAllLines' packages/ops/src/governance/registries/catalog/catalog_validate.script.ts` → **0**.
- `collectMembershipTagsInFile` contains exactly **one** `readTextFile` call.

**Verify**

```sh
bun test packages/ops/src/governance/registries/catalog/catalog_validate.script.spec.ts
rg 'readTextFile' packages/ops/src/governance/registries/catalog/catalog_validate.script.ts -c
```

---

### OCK-KERN-07 — `tag.script.ts` and `e2e_metrics.script.ts`

**Do**

1. `packages/ops/src/governance/registries/catalog/tag.script.ts`: replace `text.split('\n')[0]` with `firstLine(text)`; replace `text.split('\n').some(...)` with `lines(text).some(...)` where `text` is already loaded.
2. `packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts`: replace any `split('\n')[0]` first-line read with `firstLine` from `text_file.script.ts`.

**Acceptance criteria**

- `rg "split\\('\\\\n'\\)\\[0\\]" packages/ops/src/governance/registries/catalog/tag.script.ts packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts` → **0** matches (excluding `*.spec.ts`).

**Verify**

```sh
bun test packages/ops/src/governance/registries/catalog/tag.script.spec.ts
bun test packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.spec.ts
```

---

### Phase 1 checkpoint

**Verify**

```sh
bun test packages/ops/src/support/lib
bun test packages/ops/src/governance/registries/catalog
```

Both exit **0**.

---

## Phase 2: Extract domain from `test.script.ts` (OCK-2)

### OCK-TEST-01 — `spec_audit.script.ts`

**Do**

1. Create `packages/ops/src/governance/specs/spec_audit.script.ts` exporting `runSpecAudit(root: string, strict: boolean): void` — move the **entire** implementation from `test.script.ts` lines ~119–155 (constants + `hasSpec` + `isExempt` + glob scan) without behaviour change.
2. Create `spec_audit.script.spec.ts` with at least one test: known exempt file (e.g. `src/core/index.ts` if exempt) is not reported missing.
3. `test.script.ts` imports `runSpecAudit` and calls it from the `spec-audit` branch.

**Acceptance criteria**

- `rg 'function runSpecAudit' packages/ops/src/bin/test.script.ts` → **0** (only import + call remain).
- `rg 'EXEMPT_SUFFIXES' packages/ops/src/bin/test.script.ts` → **0**.

**Verify**

```sh
bun test packages/ops/src/governance/specs/spec_audit.script.spec.ts
mise run test spec-audit
echo $?  # must be 0
```

---

### OCK-TEST-02 — `spec_style.script.ts`

**Do**

1. Create `packages/ops/src/governance/specs/spec_style.script.ts` exporting `runSpecStyle(root: string, strict: boolean, styleFormat: string): Promise<void>` — move implementation from `test.script.ts` lines ~157–278 unchanged in behaviour.
2. Create `spec_style.script.spec.ts` with at least one test on `auditSpec` or `normalizeScope` extracted as pure exports if needed for testing.
3. `test.script.ts` imports and awaits `runSpecStyle` for `spec-style` action.

**Acceptance criteria**

- `rg 'SCOPE_ALIASES' packages/ops/src/bin/test.script.ts` → **0**.
- `mise run test spec-style` stdout still contains `scope:` line.

**Verify**

```sh
bun test packages/ops/src/governance/specs/spec_style.script.spec.ts
mise run test spec-style 2>&1 | rg '^scope:'
```

---

### OCK-TEST-03 — Slim `test.script.ts`

**Do**

1. Replace local `envBool` with `usageFlag(process.env, …)` from `usage_env.script.ts`.
2. Replace `die()` console usage with `getLogger(['kb','ops','test']).error` + `process.exit`.
3. Delete `parseTagCli` argv `for` loop (lines ~55–76). Build tag options **only** from:
   - `usage_list`, `usage_e2e`, `usage_unit`, `usage_json` via `usageFlag`
   - `usage_key`, `usage_slice` via `usageOptString`
   - Positional catalog key / AC slice: `usageOptString` first; when empty and `process.env.usage_cmd === 'tag'`, accept **only** non-flag argv tokens after `tag` that are not in `KNOWN_ACTIONS` (debug `bun bin/test.script.ts tag …` path).
4. Keep `runE2e` logic intact; use `usageFlag` for all `usage_*` e2e flags.
5. Keep semantic mutex: `usage_smoke && usage_regression` → exit **2** with same error message as today.
6. Call `configureOpsLogging()` at start of `main()`.

**Acceptance criteria**

- `rg 'function envBool' packages/ops/src/bin/test.script.ts` → **0**.
- `rg 'process\.argv.*--' packages/ops/src/bin/test.script.ts` → **0**.
- `wc -l packages/ops/src/bin/test.script.ts` ≤ **150**.

**Verify**

```sh
wc -l packages/ops/src/bin/test.script.ts
mise run test tag --list
mise run test e2e --smoke --ci
mise run test spec-audit
mise run test spec-style
```

All exit **0**.

---

### Phase 2 checkpoint

**Verify**

```sh
wc -l packages/ops/src/bin/test.script.ts
test "$(wc -l < packages/ops/src/bin/test.script.ts)" -le 150
```

---

## Phase 3: Bin stubs and `spec.script.ts` (OCK-1, OCK-2)

### OCK-BIN-01 — `app.script.ts`

**Do**

1. Remove local `envBool`; use `usageFlag(process.env, 'quality')` and `usageFlag(process.env, 'policy')`.
2. Use `usageCmd(process.env, process.argv[2])` for `CMD`.
3. Call `configureOpsLogging()` at start of `run()`.
4. Keep exported `selectGates` and `gateSteps` unchanged (pure functions).
5. Replace any `console.*` with logger.

**Acceptance criteria**

- `rg 'function envBool' packages/ops/src/bin/app.script.ts` → **0**.
- `wc -l packages/ops/src/bin/app.script.ts` ≤ **80**.
- `app.script.spec.ts` still passes without modification to `selectGates` / `gateSteps` cases.

**Verify**

```sh
bun test packages/ops/src/bin/app.script.spec.ts
wc -l packages/ops/src/bin/app.script.ts
mise run app gates --quality
```

---

### OCK-BIN-02 — `catalog.script.ts`

**Do**

1. Remove local `envBool` and `parseAction`; use `usageCmd(process.env, 'list')` as action when `usage_cmd` set; when `usage_cmd` empty use `usageCmd(process.env, process.argv[2])` **only** if value is in `VALID_ACTIONS`, else default `'list'`.
2. Read `json`/`raw` via `usageFlag`; `feature`/`key` via `usageOptString`.
3. `configureOpsLogging()` at `main()` start; stderr errors via logger.
4. Do **not** re-list `VALID_ACTIONS` for rejection when `usage_cmd` is set by mise (mise already validated).

**Acceptance criteria**

- `rg 'function envBool|function parseAction' packages/ops/src/bin/catalog.script.ts` → **0**.
- `mise run catalog list` and `mise run catalog validate` exit **0**.

**Verify**

```sh
mise run catalog list
mise run catalog validate
bun test packages/ops/src/bin/catalog.script.spec.ts
```

---

### OCK-BIN-03 — `spec.script.ts` kernel imports

**Do**

1. Delete local `cleanEnv`; import `stripUsageEnv` from `usage_env.script.ts`.
2. Delete exported duplicate if moving: re-export `rawJsonConflict` from `usage_env` **or** keep export in `spec.script.ts` as `export { rawJsonConflict } from '../support/lib/cli/usage_env.script'` — single implementation only.
3. Update `spawnExitCode` to use `stripUsageEnv(process.env)`.
4. In `planAudit` **security** branch: spawn `scan.script.ts` with argv **only** `['bun', 'packages/ops/src/governance/security/scan.script.ts']` — flags come from child env via `copyUsageToChild(stripUsageEnv(process.env), process.env, ['strict','changed_only','base','json'])` passed to `Bun.spawnSync` `env` option in `spawnExitCode` (extend `spawnExitCode` to accept optional env overlay).
5. In `planAudit` **docs rogue-refs** branch: spawn target remains `packages/ops/src/bin/audit.script.ts` with argv `['rogue-refs']` OR set `usage_cmd=rogue-refs` on child env — must exit **0** after OCK-KERN-03.

**Acceptance criteria**

- `rg 'function cleanEnv' packages/ops/src/bin/spec.script.ts` → **0**.
- `rg 'function rawJsonConflict' packages/ops/src/bin/spec.script.ts` → **0** (re-export line allowed).
- `mise run spec audit security --changed-only` exits **0**.
- `mise run spec audit docs rogue-refs` exits **0**.

**Verify**

```sh
bun test packages/ops/src/bin/spec.script.spec.ts
mise run spec audit security --changed-only
mise run spec audit docs rogue-refs
```

---

### OCK-BIN-04 — `spec_kit.script.ts` flags

**Do**

1. Remove `hasCliFlag` function entirely.
2. Replace every `hasCliFlag('loop')` with `usageFlag(env, 'loop')`; same for `dry-run`, `approve`, `json`, `raw` (map to usage keys: `dry_run`, `approve`, `json`, `raw`).
3. In `executeResolvedStep`, read flags only from `env` parameter (caller passes `process.env` after any child env overlay).
4. Update `spec.script.ts` **kit** spawn: pass child env with `copyUsageToChild` for `['dry_run','approve','json','raw','loop']` from parent `process.env` (same pattern as OCK-BIN-03 security).
5. `configureOpsLogging()` at `main()` entry.

**Acceptance criteria**

- `rg 'hasCliFlag' packages/ops/src` → **0**.
- `mise run spec kit help` exits **0**.

**Verify**

```sh
bun test packages/ops/src/bin/spec_kit.script.spec.ts
mise run spec kit help
```

---

### Phase 3 checkpoint

**Verify**

```sh
rg -l 'function envBool' packages/ops/src/bin --glob '*.ts'
# must print nothing
mise run app gates --quality
```

---

## Phase 4: Governance CLI migration (OCK-5)

### OCK-GOV-01 — `skill_registry.script.ts`

**Do**

1. Add pure function `buildSkillCliOptions(env: NodeJS.ProcessEnv, argv: string[]): CliOptions` in `skill_registry.script.ts` (or `skill_registry_cli.script.ts` if file exceeds 400 LOC after refactor).
2. `buildSkillCliOptions` reads booleans/strings from `usage_*` via `usageFlag` / `usageOptString` for every flag declared in `mise.toml` `[tasks.skill]` usage block (`raw`, `json`, `dry_run`, `list_skills`, `verbose`, `type`, `rationale`, `description`, `url`, `skill_id`, etc.).
3. Positional `url` / `skill-id`: use `usageOptString` first; fallback to first non-flag argv remainder only when `action` is `add` or `create` and env positional empty (direct `bun …` debug).
4. Delete `parseCli` and `envBool` functions.
5. `main()` calls `configureOpsLogging()`; errors via logger not `console.error`.

**Acceptance criteria**

- `rg 'function parseCli|function envBool' packages/ops/src/governance/registries/skill/skill_registry.script.ts` → **0**.
- `skill_registry.script.spec.ts` includes test calling `buildSkillCliOptions` with fixture `usage_*` object.
- `mise run skill list` exits **0**.
- `mise run skill validate` exits **0**.

**Verify**

```sh
bun test packages/ops/src/governance/registries/skill/skill_registry.script.spec.ts
mise run skill list
mise run skill validate
```

---

### OCK-GOV-02 — `perf.script.ts`

**Do**

1. Delete `function envBool` in `packages/ops/src/metrics/harnesses/perf/perf.script.ts`.
2. Import `usageFlag`, `usageOptString`, `usageCmd` from `usage_env.script.ts` for all perf flags (`regression_pct`, `warmup`, `iterations`, `no_regression`, `port`, etc.) per `mise.toml` `[tasks.perf]` usage.
3. `configureOpsLogging()` at module entry before dispatch.

**Acceptance criteria**

- `rg 'function envBool' packages/ops/src/metrics/harnesses/perf/perf.script.ts` → **0**.
- `mise run perf workflow-observability --no-regression --warmup 1 --iterations 2` exits **0** (fast smoke of harness).

**Verify**

```sh
mise run perf workflow-observability --no-regression --warmup 1 --iterations 2
bun test packages/ops/src/metrics/harnesses/perf/perf.script.spec.ts
```

---

### OCK-GOV-03 — `scan.script.ts`

**Do**

1. Add exported `readSecurityScanArgs(env, argv: string[]): CliArgs` where `CliArgs` matches existing type.
2. For each field, prefer `usageFlag` / `usageOptString` when parent set `usage_strict`, `usage_changed_only`, `usage_base`, `usage_json` on child env (OCK-BIN-03).
3. When all four usage keys absent on env, parse `argv` exactly as today (`--strict`, `--changed-only`, `--base`, `--json`) for backward compatibility.
4. Delete inline `parseArgs` from `main`; `main` calls `readSecurityScanArgs(process.env, process.argv.slice(2))`.
5. `configureOpsLogging()` at `main()` start.

**Acceptance criteria**

- `rg 'function parseArgs' packages/ops/src/governance/security/scan.script.ts` → **0**.
- `mise run spec audit security --changed-only` exits **0**.
- Co-located spec tests `readSecurityScanArgs` with env-only and argv-only inputs.

**Verify**

```sh
bun test packages/ops/src/governance/security/scan.script.spec.ts
mise run spec audit security --changed-only
```

---

### Phase 4 checkpoint

**Verify**

```sh
rg 'function parseCli' packages/ops/src
rg -l 'function envBool' packages/ops/src --glob '*.ts'
# both must print nothing
```

---

## Phase 5: Remove npm `yaml` dependency (OCK-7)

### OCK-YAML-01 — `allowlist.loader.script.ts`

**Do**

1. In `packages/ops/src/governance/security/allowlist.loader.script.ts`:
   - Remove `import { parse } from 'yaml'`.
   - Replace `parse(text)` with `Bun.YAML.parse(text) as unknown`.
   - Keep `validateAllowlistShape(parsed)` and `HandoffAllowlistError` wrapping unchanged.
2. Create `packages/ops/src/governance/security/allowlist.loader.script.spec.ts` with:
   - **Positive:** write temp YAML file with content `entries:\n  - literal-token\n`, call `loadAllowlist(path)`, expect `{ entries: ['literal-token'] }`.
   - **Negative:** invalid YAML `entries: [` → expect `HandoffAllowlistError` with `instanceof HandoffAllowlistError`.
   - **Negative:** valid YAML but schema fail `foo: bar` → expect `HandoffAllowlistError`.

**Acceptance criteria**

- `rg "from 'yaml'" packages/ops/src/governance/security/allowlist.loader.script.ts` → **0** matches.
- `bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts` exits **0**.

**Verify**

```sh
rg "from 'yaml'" packages/ops/src/governance/security/allowlist.loader.script.ts
bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts
```

---

### OCK-YAML-02 — `resolve_catalog_key.script.ts`

**Do**

1. In `packages/ops/src/governance/specs/resolve_catalog_key.script.ts`:
   - Remove `import { parse as parseYaml } from 'yaml'`.
   - In `collectKeys`, replace `parseYaml(catalogText)` with `Bun.YAML.parse(catalogText) as unknown`.
   - Do not change `catalogKeyFromSlug`, `slugFromFeatureDir`, or warning message strings.
2. Run existing spec unchanged — behaviour must match pre-migration.

**Acceptance criteria**

- `rg "from 'yaml'" packages/ops/src/governance/specs/resolve_catalog_key.script.ts` → **0** matches.
- `bun test packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts` exits **0**.

**Verify**

```sh
rg "from 'yaml'" packages/ops/src/governance/specs/resolve_catalog_key.script.ts
bun test packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts
```

---

### OCK-YAML-03 — Remove root dependency

**Do**

1. Delete the line `"yaml": "^2.9.0"` from `package.json` `dependencies`.
2. Run `bun install` from repo root to update `bun.lock`.
3. Confirm no remaining imports of npm `yaml` under production TypeScript:

```sh
rg "from 'yaml'|from \"yaml\"" packages src --glob '*.ts'
```

**Acceptance criteria**

- `package.json` `dependencies` has **no** `"yaml"` key.
- `rg "from 'yaml'|from \"yaml\"" packages src --glob '*.ts'` → **0** matches.
- After `bun install`, `test ! -e node_modules/yaml` succeeds.
- `bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts` exits **0**.

**Verify**

```sh
rg '"yaml"' package.json
rg "from 'yaml'|from \"yaml\"" packages src --glob '*.ts'
bun install
test ! -e node_modules/yaml
bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts
```

---

### Phase 5 checkpoint

**Verify**

```sh
rg "from 'yaml'|from \"yaml\"" packages/ops/src
test ! -e node_modules/yaml
```

Grep produces no output; `test` exits **0**.

---

## Phase 6: Spawn hygiene and docs (OCK-1)

### OCK-SPAWN-01 — `spawn_inherit.script.ts`

**Do**

1. Update `packages/ops/src/support/lib/shared/spawn_inherit.script.ts`:
   - `runInherit(cmd, cwd, envOverlay?)` merges `stripUsageEnv(process.env)` with `envOverlay`.
   - `spawnInherit` unchanged signature; uses updated `runInherit`.
2. Add assertions in `spawn_inherit.script.spec.ts`: spawn a child that prints `usage_foo` from env — child must **not** receive `usage_foo` when parent had it set.

**Acceptance criteria**

- `spawn_inherit.script.spec.ts` passes.
- `rg 'cleanEnv' packages/ops/src/bin/spec.script.ts` → **0** (uses `stripUsageEnv`).

**Verify**

```sh
bun test packages/ops/src/support/lib/shared/spawn_inherit.script.spec.ts
```

---

### OCK-DOCS-01 — `MISE_GUIDE.md`

**Do**

Add section **§ Ops CLI kernel** to `assets/guides/MISE_GUIDE.md` covering:

1. Mise owns CLI parsing; scripts read `usage_*`.
2. Kernel modules: `usage_env.script.ts`, `dispatch.script.ts`, `text_file.script.ts`, `ops_logging.script.ts`.
3. Bin patterns: forward (`skill`), route table (`audit`, `hooks`), domain dispatch (`catalog`, `test`, `spec`).
4. Semantic validation only: `raw`+`json` mutex, e2e `smoke`+`regression` mutex, domain files.
5. Subprocess rule: `stripUsageEnv` default; `copyUsageToChild` when planner forwards flags.
6. YAML: use `Bun.YAML.parse` / `Bun.YAML.stringify` only — no npm `yaml` package ([`BUN_RUNTIME.md`](../../guides/BUN_RUNTIME.md)).

**Acceptance criteria**

- `rg 'dispatch\.script' assets/guides/MISE_GUIDE.md` → **≥ 1** match.
- `rg 'mise-trusted|usage_\*' assets/guides/MISE_GUIDE.md` → **≥ 1** match.

**Verify**

```sh
rg 'dispatch\.script|usage_\*|mise-trusted' assets/guides/MISE_GUIDE.md
```

---

## Phase 7: Closeout

### OCK-DONE-01 — Quality gate

**Acceptance criteria**

- `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits **0**.

**Verify**

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

### OCK-DONE-02 — README status

**Do**

Update `assets/specs/README.md` row for `014-ops-cli-kernel` status to **In progress** or **Shipped** matching PR state.

**Verify**

```sh
rg '014-ops-cli-kernel' assets/specs/README.md
```

---

### OCK-DONE-03 — Closeout metrics file

**Do**

1. Create `assets/specs/014-ops-cli-kernel/closeout-metrics.txt` with the same commands as OCK-BASE-03 run on the final branch.
2. PR description must include a table: Metric | Baseline | Closeout | Pass (Y/N) for every row in plan § How we measure success.

**Acceptance criteria**

| Metric                                                     | Target                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `function envBool` file count                              | **0**                                                                                 |
| `function parseCli`                                        | **0** matches                                                                         |
| `hasCliFlag`                                               | **0** matches                                                                         |
| `yaml` npm imports in `packages/ops/src`                   | **0** matches                                                                         |
| `"yaml"` in `package.json` dependencies                    | **0** (key absent)                                                                    |
| `test.script.ts` LOC                                       | **≤ 150**                                                                             |
| `process.argv` in bin                                      | **≤ 4** total matches across `packages/ops/src/bin/*.script.ts`                       |
| `catalog validate` / `spec-audit` / `skill list` wall time | each **≤ baseline × 1.05** (compare `baseline-metrics.txt` vs `closeout-metrics.txt`) |
| Fitness commands (plan §5)                                 | all exit **0**                                                                        |

**Verify**

```sh
rg -l 'function envBool' packages/ops/src --glob '*.ts' | wc -l   # expect 0
rg 'function parseCli' packages/ops/src                            # expect no output
rg 'hasCliFlag' packages/ops/src                                   # expect no output
rg "from 'yaml'|from \"yaml\"" packages/ops/src                    # expect no output
rg '"yaml"' package.json                                           # expect no match in dependencies
test ! -e node_modules/yaml                                        # expect 0
wc -l packages/ops/src/bin/test.script.ts                          # expect <=150
mise run policy check
mise run test unit
mise run test spec-audit
mise run test spec-style
mise run catalog validate
mise run skill list
mise run app gates --quality
```

---

### OCK-DONE-04 — Spec gates after implementation

**Acceptance criteria**

- `mise run spec lint assets/specs/014-ops-cli-kernel` exits **0**.
- `mise run spec gate assets/specs/014-ops-cli-kernel` exits **0**.

**Verify**

```sh
mise run spec lint assets/specs/014-ops-cli-kernel
mise run spec gate assets/specs/014-ops-cli-kernel
```

---

## Phase 8: DRY & Safety Refancements (Refactoring) ✓

### OCK-REF-01 — Batch Env Readers in `usage_env.script.ts` [x]

**Do**

1. In `packages/ops/src/support/lib/cli/usage_env.script.ts`, implement and export:
   - `usageFlags<K extends string>(env, keys: K[]): Record<K, boolean>`
   - `usageStrings<K extends string>(env, keys: K[]): Record<K, string | undefined>`
2. Update `usage_env.script.spec.ts` with tests covering batch parsing of multiple boolean and string keys.

**Acceptance criteria**

- Batch env readers map multiple environment variables cleanly.
- Tests pass.

**Verify**

```sh
bun test packages/ops/src/support/lib/cli/usage_env.script.spec.ts
```

---

### OCK-REF-02 — Async-safe `runBinMain` in `dispatch.script.ts` ✓

**Do**

1. Modify `runBinMain(fn)` in `packages/ops/src/support/lib/cli/dispatch.script.ts` to support `fn` returning `Promise<void | number> | void | number`.
2. Ensure it handles rejections cleanly: catches promise rejections, logs them via structured logger, and exits with 1.
3. Update `dispatch.script.spec.ts` to assert that async rejections are caught and handle process exits.

**Acceptance criteria**

- Both synchronous throws and async rejections are cleanly caught by `runBinMain`.
- Tests pass.

**Verify**

```sh
bun test packages/ops/src/support/lib/cli/dispatch.script.spec.ts
```

---

### OCK-REF-03 — Action Map Dispatching in `catalog.script.ts` and `test.script.ts` ✓

**Do**

1. In `packages/ops/src/bin/catalog.script.ts` and `packages/ops/src/bin/test.script.ts`, replace subcommand `switch` blocks with declarative action maps:
   - Configuration type: `Record<string, () => Promise<number | void> | number | void>`.
   - Resolve subcommand, look up in the map, run and exit cleanly.
2. In `catalog.script.ts` and `test.script.ts`, use `runBinMain` to execute the dispatch block, removing custom `main().catch(...)` boilerplate.
3. In both scripts, use `usageFlags` and `usageStrings` to batch read all command flags.

**Acceptance criteria**

- All switch blocks for subcommands are gone.
- `catalog.script.ts` and `test.script.ts` use `runBinMain` and batch env readers.
- All tests pass, and manual runs work identically.

**Verify**

```sh
bun test packages/ops/src/bin/catalog.script.spec.ts
bun test packages/ops/src/bin/test.script.spec.ts
mise run catalog validate
mise run test spec-audit
```

---

### OCK-REF-04 — `neverthrow` Result Integration in support libraries ✓

**Do**

1. In `packages/ops/src/support/lib/shared/text_file.script.ts`, wrap all file reading inside `neverthrow`'s `Result` type:
   - Return `Result<string, Error>` from `readTextFile`.
   - Update `readTextLines` overloads to return `Result` wrappers.
2. Update callers (`catalog_validate.script.ts`, `tag.script.ts`, `e2e_metrics.script.ts`) to handle the `Result` output (e.g., using `neverthrow` methods or safe unwrapping).
3. In `packages/ops/src/governance/security/allowlist.loader.script.ts`, update `loadAllowlist` to return `Result<Allowlist, HandoffAllowlistError | Error>`, mapping any `Bun.YAML.parse` or schema validation error cleanly to `Result.err`.
4. Update `allowlist.loader.script.spec.ts` and other callers to assert on the returned `Result` type.

**Acceptance criteria**

- File reading and allowlist loading have zero raw exception escapes.
- All co-located tests pass.

**Verify**

```sh
bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts
bun test packages/ops/src/governance/security/allowlist.loader.script.spec.ts
```

---

### OCK-REF-05 — Run Quality Gate and closeout metrics ✓

**Do**

1. Run the full quality gate to ensure all refactored code compiles, lints, and passes all 1300+ tests cleanly.
2. Regenerate closeout metrics (`closeout-metrics.txt`) to show LOC decreases and clean runs.

**Acceptance criteria**

- `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits **0**.

**Verify**

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Explicitly NOT in 014

| ID    | Item                                                  | Action                                                   |
| ----- | ----------------------------------------------------- | -------------------------------------------------------- |
| OCK-6 | `policy codegen-usage` / `generated/*_usage.const.ts` | Do not implement                                         |
| —     | `workflow_run.script.ts` argv refactor                | Do not modify except import path fixes required by build |
| —     | Third-party CLI libraries on mise path                | Do not add dependencies                                  |

---

## Dependencies

```text
Phase 0
  → Phase 1 (OCK-KERN-01…07; KERN-03 depends on KERN-02 + KERN-05)
  → Phase 2 (depends on KERN-02)
  → Phase 3 (depends on Phase 2 + KERN-02/03/05)
  → Phase 4 (depends on KERN-02; OCK-GOV-03 depends on OCK-BIN-03)
  → Phase 5 (OCK-YAML; independent of Phase 4 — may run after Phase 1)
  → Phase 6 (OCK-SPAWN-01 after OCK-BIN-03)
  → Phase 7
  → Phase 8 (OCK-REF-01…05 after Phase 7)
```

**Order rule:** Complete Phase 1 checkpoint before starting Phase 2. Complete Phase 3 before OCK-GOV-03. Complete Phase 5 before Phase 7 closeout. Complete Phase 7 before Phase 8 refactoring.
