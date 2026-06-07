<!-- markdownlint-disable-file -->

# Handoff — Implement `mise run spec audit` (gum-styled)

**Target:** DeepSeek / any implementer agent
**Branch suggestion:** `feat/spec-audit`
**Supersedes:** 003 `speckit.kb.audit` intent (command was never built)

## Agent prompt

```text
# Handoff — Implement `mise run spec audit` (gum-styled)

## Mission

Add a **deterministic, provider-agnostic** SDD readiness command:

```bash
mise run spec audit assets/specs/NNN-slug [--strict] [--json] [--raw]
```

**Purpose:** Post-`/speckit-tasks`, pre-`/speckit-analyze` (tasks pass) gate that
checks the **normative quartet** + **handoff AC table** + **tasks.md hygiene**
+ **orchestrated-handoff phase readiness** — without duplicating EARS lint or
Gherkin trace (those stay in `spec lint` / `spec trace`).

This closes the gap left by branch `003-sync-frecency-preserve` (`speckit.kb.audit`
referenced a command that was never built). Do **not** confuse with
`mise run test spec-audit` (co-located `src/**/*.spec.ts` coverage — keep separate).

---

## Read first (mandatory)

1. `.agents/skills/app-context/SKILL.md`
2. `.agents/skills/app-testing/SKILL.md`
3. `assets/guides/SDD_WORKFLOW_GUIDE.md` § Deterministic gates + orchestrated-handoff
4. `assets/specs/004-orchestrated-handoff/spec.md` (phase model, checklist markers)
5. `tools/governance/specs/PLAN_PUNCHLIST.md` §5 (deterministic gates, not LLM)
6. Gum reference implementation:
   - `tools/support/lib/cli/gum_theme.script.ts`
   - `tools/support/lib/cli/render_mode.script.ts`
   - `tools/governance/registries/skill/skill_output.script.ts` (pretty output pattern)

Reuse existing pure helpers — do **not** fork:
- `parseHandoffAcTable` from `tools/governance/specs/workflow/handoff_generate.script.ts`
- `scanFeatureDir`, `detectPhase` from `tools/governance/specs/workflow/orchestrated_handoff.script.ts`

---

## Command contract

| Flag            | Behavior                                                               |
| --------------- | ---------------------------------------------------------------------- |
| `<feature_dir>` | Required. Must match `assets/specs/[0-9]{3}-<slug>/`                   |
| `--strict`      | Exit `1` if any **error**-level finding                                |
| `--json`        | Machine-readable `{ featureDir, phase, findings[], summary }` — no gum |
| `--raw`         | Plain text (no ANSI); also used when stdout is not a TTY               |

**Exit codes:** `0` pass (or pass-with-warns without `--strict`); `1` failures;
`2` usage / bad feature path.

**Naming:** `mise run spec audit` — NOT under `test` (that namespace is taken).

---

## Audit rules (implement as pure functions + tests)

Implement checks in `tools/governance/specs/audit_core.script.ts`.
Each finding: `{ rule, level: 'error'|'warn', file, line?, message }`.

### Group A — Quartet presence (`quartet.*`)

| Rule              | Level | Check                                                  |
| ----------------- | ----- | ------------------------------------------------------ |
| `quartet.path`    | error | Feature dir exists and matches `assets/specs/NNN-slug` |
| `quartet.spec`    | error | `spec.md` exists                                       |
| `quartet.plan`    | error | `plan.md` exists                                       |
| `quartet.tasks`   | error | `tasks.md` exists                                      |
| `quartet.handoff` | error | `handoff.md` exists                                    |

### Group B — Handoff AC table (`handoff.*`)

Use `parseHandoffAcTable(handoffMd)`.

| Rule                       | Level | Check                                                                            |
| -------------------------- | ----- | -------------------------------------------------------------------------------- |
| `handoff.table`            | error | Table header `ID \| Done when \| Evidence` present                               |
| `handoff.rows`             | error | ≥ 1 data row parsed                                                              |
| `handoff.id-format`        | warn  | Rows with non-empty ID should match `PREFIX-n ACm` (same as `@ac:` parser)       |
| `handoff.done-when`        | error | No row with empty **Done when**                                                  |
| `handoff.evidence`         | error | No row with empty **Evidence**                                                   |
| `handoff.evidence-command` | warn  | Evidence looks like a runnable command (backticks, `bun test`, `mise run`, etc.) |

### Group C — Tasks hygiene (`tasks.*`)

| Rule                | Level | Check                                                                          |
| ------------------- | ----- | ------------------------------------------------------------------------------ |
| `tasks.sample-leak` | error | No `T001`/`SAMPLE TASKS`/“illustration purposes only” template residue         |
| `tasks.checkbox`    | warn  | ≥ 1 `- [ ]` or `- [x]` task line                                               |
| `tasks.id`          | warn  | Task lines use `T###` (or documented kb pattern from tasks-template)           |
| `tasks.phases`      | warn  | ≥ 1 `## Phase` header                                                          |
| `tasks.paths`       | warn  | Task descriptions mention concrete paths (`src/`, `tools/`, `assets/`, `bdd/`) |

### Group D — Phase readiness (`phase.*`)

Use `scanFeatureDir` + `detectPhase`.

| Rule                        | Level | Check                                                                                                                                     |
| --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `phase.detect`              | info  | Report current `detectPhase().phase` + suggested command (always emit as summary, not failure)                                            |
| `phase.analyze-plan`        | warn  | If `plan.md` exists but no `checklists/analyze-plan.md` → “run plan-pass analyze first”                                                   |
| `phase.analyze-tasks-ready` | error | When quartet complete: phase should be `analyze-tasks` or later; if stuck on `tasks` with handoff missing columns → error with focus hint |
| `phase.implement-premature` | warn  | If `implement` suggested but `checklists/analyze-tasks.md` missing                                                                        |

**Important:** `detectPhase` is advisory context — do not reimplement its table.

### Group E — Cross-artifact hints (`xref.*`) — warn only

| Rule                 | Level | Check                                                                          |
| -------------------- | ----- | ------------------------------------------------------------------------------ |
| `xref.handoff-spec`  | warn  | Handoff AC IDs (e.g. `WOBS-1 AC1`) appear somewhere in `spec.md` or `tasks.md` |
| `xref.tasks-handoff` | warn  | `handoff.md` mentions feature slug or spec path                                |

Do **not** call `lint.script.ts` or `trace.script.ts` inline (avoid double output).
Optional footer hint: “Run `mise run spec lint … --strict` for EARS enforcement.”

---

## File layout (artifact suffix pattern)

```text
tools/governance/specs/
  audit_core.script.ts          # pure audit logic + exported runAudit()
  audit_core.script.spec.ts
  audit_output.script.ts        # gum pretty + raw + json renderers
  audit_output.script.spec.ts   # snapshot or string asserts on json/raw
  audit.script.ts               # CLI entry (argv, exit codes)
  audit.script.spec.ts          # integration via mkdtemp fixtures

tools/bin/spec.script.ts        # add case 'audit'
mise.toml                       # add cmd "audit" under [tasks.spec]
```

Follow existing dispatch pattern in `spec.script.ts` (envBool for `--strict`, etc.).

---

## Gum UX (pretty mode — match skill registry quality)

Use `chooseRenderer({ json, raw, isTty: process.stdout.isTTY })`.

**Pretty layout** (when gum available via `gumAvailable()`):

```text
Spec audit · 005-workflow-observability          ← gumTitle
assets/specs/005-workflow-observability/         ← gumSubtitle (muted)

▸ Summary                                        ← gumSection
  ✓ 12 checks   ✗ 2 errors   ⚠ 3 warnings       ← gumOk / gumFail / gumWarn badges

▸ Phase                                          ← gumSection
  analyze-tasks → speckit.analyze                ← gumInfo command line

▸ Findings                                       ← gumSection (skip if clean)
  | Rule | Sev | File | Message |                ← gumTable
  …

Next steps                                       ← gumNextSteps
  → mise run spec lint assets/specs/… --strict
  → /speckit-analyze  (tasks pass)
```

- **Clean run (0 errors):** one-line `gumOk('✓ Spec audit clean — <dir>')` after banner OR compact summary — operator should feel the same polish as `mise run skill validate`.
- **Severity colors:** error → `gumFail`, warn → `gumWarn`, info → `gumMuted`.
- **Fallback:** when `!gumAvailable()` or `NO_COLOR`, use raw renderer (plain `✓/✗` like `lint.script.ts` but structured).

Reference: `tools/governance/registries/skill/skill_output.script.ts` — copy patterns, not code.

---

## Mise wiring

In `mise.toml` under `"spec"` usage block, add:

```toml
cmd "audit" {
  flag "--strict" help="Exit non-zero on error-level findings"
  flag "--json" help="Machine-readable JSON output"
  flag "--raw" help="Plain text output (no gum styling)"
  arg "<feature_dir>" help="Feature dir e.g. assets/specs/005-workflow-observability"
}
```

In `tools/bin/spec.script.ts`:

```ts
case 'audit': {
  const args: string[] = [process.env.usage_feature_dir ?? '']
  if (envBool('usage_strict')) args.push('--strict')
  if (envBool('usage_json')) args.push('--json')
  if (envBool('usage_raw')) args.push('--raw')
  spawnInherit(['bun', `${SPECS}/audit.script.ts`, ...args.filter(Boolean)], root)
  break
}
```

Verify mise env var names match existing conventions (`usage_feature_dir` vs positional — mirror `trace` / `gate` patterns).

---

## Tests (required)

Use `mkdtempSync` fixtures under `tools/governance/specs/workflow/workflow_test_helpers.script.ts` style.

Minimum cases:

1. Fully populated feature dir (copy 005 or minimal kit) → 0 errors
2. Missing `handoff.md` → `quartet.handoff` error
3. Handoff table with empty Evidence → `handoff.evidence` error
4. tasks.md with sample template leak → `tasks.sample-leak` error
5. `--strict` exit code 1 vs 0 without strict on warnings-only
6. `--json` output schema stable keys
7. `audit_output` pretty mode does not throw when gum missing (mock or skip if no gum)

Run:

```bash
bun test --config /dev/null tools/governance/specs/audit*.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Documentation updates (same PR)

1. **`assets/guides/SDD_WORKFLOW_GUIDE.md`** — add to § Deterministic gates:

   ```bash
   # Quartet + handoff + tasks readiness (post-tasks, pre-analyze)
   mise run spec audit assets/specs/NNN-slug --strict
   ```

   Position: **after** tasks/handoff exist, **before** `/speckit-analyze` tasks pass.
   Clarify distinction from `test spec-audit`.

2. **`.cursor/skills/speckit-tasks/SKILL.md`** — Completion Report next-step:
   `mise run spec audit <dir> --strict` then `/speckit-analyze`.

3. **`.cursor/skills/speckit-analyze/SKILL.md`** — replace lint+trace pre-step hint with:
   `mise run spec audit <dir> --strict` (optional: lint/trace before analyze for ship).

4. **Optional:** `.specify/memory/constitution.md` step 6 footnote:
   “`mise run spec audit` enforces quartet/handoff/tasks readiness deterministically.”
   Patch version bump + SYNC IMPACT if constitution touched.

---

## Explicit OUT OF SCOPE

- `kb-workflow` Spec Kit extension / hooks (wire later if desired)
- `mise run spec pr-draft`
- Calling `gate.sh` inside audit (that's `spec gate`)
- EARS parsing (that's `spec lint`)
- `@spec:` Gherkin trace (that's `spec trace`)
- Gum in `lint.script.ts` / `runs_cli` (separate refactor)
- Production `src/` changes

---

## Branch & commits

```bash
git checkout main && git pull
git checkout -b feat/spec-audit
```

Suggested commits:

1. `feat(spec): Add audit core checks`
2. `feat(spec): Add gum-styled audit output`
3. `docs(sdd): Document spec audit gate`

---

## Definition of done

- [ ] `mise run spec audit assets/specs/004-orchestrated-handoff --strict` exits 0
- [ ] Pretty output uses gum theme when TTY + gum installed
- [ ] `--json` / `--raw` work in CI
- [ ] Co-located specs for all new `tools/governance/specs/audit*.ts` files
- [ ] SDD guide + speckit skill hints updated
- [ ] No reference to nonexistent `tools/spec/lint.ts`
- [ ] `gate.sh` green
- [ ] PR notes: supersedes 003 `speckit.kb.audit` intent; distinct from `test spec-audit`

---

## Verification commands

```bash
mise run spec audit assets/specs/005-workflow-observability
mise run spec audit assets/specs/005-workflow-observability --strict
mise run spec audit assets/specs/005-workflow-observability --json | jq .summary
bun test --config /dev/null tools/governance/specs/audit_core.script.spec.ts
bun test --config /dev/null tools/governance/specs/audit_output.script.spec.ts
bun test --config /dev/null tools/governance/specs/audit.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
rg 'mise run spec audit' assets/guides/SDD_WORKFLOW_GUIDE.md .cursor/skills/speckit-*.md
```

---

## Design rationale (for PR description)

| Command           | When                  | Enforces                                |
| ----------------- | --------------------- | --------------------------------------- |
| `spec audit`      | After tasks + handoff | Quartet, AC table, tasks hygiene, phase |
| `spec lint`       | Anytime               | EARS shape in spec.md                   |
| `spec trace`      | Pre-ship              | spec ↔ plan ↔ `.feature` links          |
| `spec gate`       | Pre-merge             | lint + trace + quality gate             |
| `test spec-audit` | CI / src changes      | co-located unit specs in `src/`         |
```

**Note:** This handoff is implementation-ready without a full `assets/specs/006-*` quartet. If you want SDD traceability, add a slim spec first (`SAUD-1` requirements for the rules table above) and link Evidence to the audit spec files.
