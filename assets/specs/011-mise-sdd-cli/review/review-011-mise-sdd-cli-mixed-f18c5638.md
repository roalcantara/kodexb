# Fix handoff — 011-mise-sdd-cli (mixed) — review f18c5638

**Branch:** `feature/011-mise-sdd-cli`
**Prior:** `assets/specs/011-mise-sdd-cli/review/review-011-mise-sdd-cli-mixed-b1221747.md`
**Normative:** `assets/specs/011-mise-sdd-cli/{spec,plan,tasks,handoff}.md`

Load: **app-context** + **mise-tasks** + **app-testing**

Do not commit unless asked.

---

## Agent prompt

Complete 011 after re-review `f18c5638`. P0-3 and P0-6 landed; P0-1/2 partial; P0-4/5 open. **Do not merge** until handoff Evidence passes and phases 5–7 close.

### Operator CLI conventions (mandatory — 00–07)

**00 — `spec` root flags only**

- Remove `--feature` from spec task root and **every** subcommand in `mise.toml`.
- Keep only global `--raw` and `--json` at spec root.
- `--raw` and `--json` mutually exclusive (mise or dispatch guard + unit tests).
- Unit tests: every subcommand respects `--raw` / `--json` where applicable (`spec.script.spec.ts`).

**01 — `spec lint`**

- Remove `--all`, `--feature`, `--root`.
- Optional positional `[feature]` (cmd or 1st arg); omitted → lint all `assets/specs/NNN-*/spec.md`.

**02 — `spec trace`**

- Remove `--feature`.
- Optional `[feature]`; omitted → ignored or all-specs per plan (match dispatch).

**03 — `spec gate`**

- Remove `--feature`.
- Optional `[feature]`; omitted → `resolveActiveFeatureDir()`.

**04 — `spec ready`**

- Remove `--feature`.
- Optional `[feature]`; omitted → infer active feature.

**05 — `spec test`**

- Remove `--feature`.
- Optional `[feature]` after `[scope]` or as sole positional when scope omitted; omitted → run all governance unit tests (+ e2e when catalog key exists per plan).
- Drop `--feat` everywhere (script + docs).

**06 — `spec workflow handoff`**

- Remove `--feature` on `generate` and `scrub`.
- Optional `[feature]` positional; omitted → infer.

**07 — `app gates`**

- Remove `--all` flag from `mise.toml` `app gates` usage.
- **Default:** when neither `--quality` nor `--policy` is passed, run **both** quality gate and policy gate (today’s `--all` behavior).
- `--quality` only → quality; `--policy` only → policy; both flags → both (explicit).
- Update handoff MSC-7 Evidence to `mise run app gates && mise run policy check` (no `all`, no `--all`).
- Unit test or spec.script/app.script test for default-dual behavior.

**Cross-cutting**

- Shared helper: `resolveSpecFeatureDir({ positional?, usage_feature? })` — positional wins; no redundant flags when positional present.
- Positional preferred over flags in dispatch (`spec.script.ts`, `spec_test.script.ts`, `app.script.ts` if gates moved).
- Sync `handoff.md` AC + Verify to final invocations; unblock status; remove wait-for-010 step.

**Unit tests required**

- `spec_test.script.spec.ts` — scope matrix, feature inference/positional, smoke → `workflow run` (not trivial import-only).
- `spec.script.spec.ts` — positional vs inference per subcmd; `--raw`/`--json` mutual exclusion.
- `task_runner.script.spec.ts` — TTY pretty path if MSC-1 requires gum spin; else update spec Evidence.

**Phases 5–7 (unchanged from b1221747)**

- Docs migration; `policy check --strict` allowlist; dogfood MSC-8/9; closeout checkboxes honest in `tasks.md`.

---

## P0 — blockers

| ID | Task |
| --- | --- |
| P0-1 | Implement operator rules **00–06**: refactor `mise.toml` spec usage + `spec.script.ts` + `spec_test.script.ts` for positional `[feature]` only |
| P0-2 | Implement operator rule **07**: `app gates` default dual-run; remove `--all`; update `mise.toml` bash + tests |
| P0-3 | Expand `spec_test.script.spec.ts` (MSC-TEST-04): scopes, positional feature, not import-only |
| P0-4 | Update `handoff.md`: positional Evidence strings; MSC-7 `mise run app gates`; audit `feature` subcmd; drop `--feat` |
| P0-5 | `policy check --strict` exit 0 (EXPECTED_PACKAGE_SCRIPTS / public-task-surface) |
| P0-6 | MSC-8/9: real workflow dry-run stage plan + full run with archived run id |

---

## Verify (re-review gate)

```sh
bun test --config /dev/null tools/support/lib/cli/task_runner.script.spec.ts
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun test --config /dev/null tools/governance/specs/spec_test.script.spec.ts
mise run spec test unit assets/specs/011-mise-sdd-cli
mise run spec audit feature assets/specs/011-mise-sdd-cli --strict
mise run spec ready assets/specs/011-mise-sdd-cli --key workflows
mise run app gates
mise run policy check --strict
mise run spec workflow run assets/specs/011-mise-sdd-cli --dry-run
mise run spec workflow run assets/specs/011-mise-sdd-cli
mise run spec lint assets/specs/011-mise-sdd-cli
mise run spec gate assets/specs/011-mise-sdd-cli
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Out of scope

- 010 package work
- Manual `catalog.yaml` registration (workflow dogfood only)
