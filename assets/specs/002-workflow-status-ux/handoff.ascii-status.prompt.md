# Handoff — Workflow status ASCII rebuild (`002-workflow-status-ux` follow-up)

**Parent spec:** [`handoff.prompt.md`](./handoff.prompt.md) (semantics, snapshots, flags — **done**; do not revert)
**Plan:** [`.cursor/plans/ascii_workflow_status_191428cb.plan.md`](../../../.cursor/plans/ascii_workflow_status_191428cb.plan.md)
**Dogfood feature:** `assets/specs/018-architecture-role-taxonomy` (implement phase, 0/10 tasks)
**Fixture sanity:** `packages/ops/src/__tests__/fixtures/workflow_status/implement-mid`

---

## Agent prompt (paste this first)

```text
Implement the Workflow Status ASCII rebuild (002 follow-up). Read this handoff
in full before editing any file.

Load skills: app-context, app-quality-gate.

Goal: Replace gum-based pretty rendering with a pure-ASCII, human-readable
terminal formatter so `mise run spec workflow status` works reliably on 018.

STRICT SCOPE — render + CLI glue only:
- ADD packages/ops/src/governance/specs/workflow_status_ascii.script.ts
- REWRITE pretty path in workflow_status_output.script.ts (remove ALL gum/ansi
  from default terminal output)
- TOUCH workflow_status.script.ts only for: remove gumMuted; force pretty when
  --index/--full on non-TTY
- UPDATE assets/guides/WORKFLOW_SDD_GUIDE.md workflow status subsection

DO NOT TOUCH:
- packages/exec/src/workflow_progress.script.ts (derivation)
- workflow_status_snapshot.script.ts (snapshots)
- workflow_status_html.script.ts (HTML export)
- mermaid / emitMermaid paths
- Existing *.spec.ts files — NO new co-located tests for this handoff

Before claiming done you MUST:
- pass every AC row in the Acceptance criteria tracker (run Evidence commands)
- run bash .agents/skills/app-quality-gate/scripts/gate.sh exit 0 on commit tree
- fill the Structured completion report at the bottom and paste it to the operator
- commit as a single atomic commit (see Commit plan)

Do not commit tools/metrics/workflow-status/*.json unless operator asks.
```

---

## Why this handoff exists

The shipped pretty renderer uses **gum subprocesses** (`gum join`, `gum style`, …).
On real terminals this produces unreadable output (repeated diamond glyphs, missing
task labels) while `--raw` remains correct. Derivation and snapshots are fine;
**only terminal pretty mode is broken**.

This is a **temporary** fix until a post-018 command refactor. Prefer **correct
plain text** over colors, gum, or horizontal column grids.

---

## Baseline (already on branch — do not revert or re-implement)

| Area                                                            | Status | Files                                                           |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `next` status semantics                                         | Done   | `packages/exec/src/workflow_progress.script.ts`                 |
| CLI flags (`--index`, `--record`, `--list`, `--compare-a/b`, …) | Done   | `workflow_status.script.ts`, `mise.toml`, `spec_plan.script.ts` |
| Durable snapshots                                               | Done   | `workflow_status_snapshot.script.ts`                            |
| `--raw`, `--json`, `-o html`, `--format mermaid`                | Done   | keep behavior unchanged                                         |
| Unit tests for derive/snapshot/mermaid/html                     | Done   | do not add new tests                                            |

If any baseline item is missing on your branch, **stop** and ask the operator —
do not fold baseline work into this handoff.

---

## Architecture constraints

- **Pure derivation** stays in `@kb/exec` — no changes in this handoff.
- **New module:** `workflow_status_ascii.script.ts` — pure string formatting, no I/O,
  no subprocesses, no gum, no ANSI escape sequences in output.
- **Logging:** existing `getLogger` in CLI; `console.log`/`console.error` only in
  ops CLI scripts (existing pattern).
- **Naming:** snake_case dot segments per [`assets/guides/CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md).

---

## Normative output contract (default pretty)

Default `mise run spec workflow status [feature]` MUST print a **single vertical
document**. No horizontal column join. No gum. No ANSI color codes in stdout.

### Document structure (required sections, in order)

1. **Title line:** `Spec workflow · {slug}`
2. **Path line:** two-space indent + absolute `featureDir`
3. **Blank line**
4. **Phase line:** `Phase: {currentPhase}`
5. **NEXT line:** `NEXT:  {next.command}` (+ optional `  # {focusHint}` on same line)
6. **Optional meta lines** (only when applicable, each two-space indent):
   - `Catalog: {key} ({status})`
   - `Lifecycle: mismatch (shipped but not at gate)`
   - `Debt: {n} blocked artifact(s)`
7. **Blank line**
8. **Column sections** — one block per pipeline column (always all six), in order:
   intent → design → breakdown → dispatch → build → ship
9. **Blank line**
10. **Tasks line** (when `report.tasks.length > 0`):
    `Tasks: {done}/{total} done`
11. **Next task line** (when an incomplete T### exists):
    `Next task: {id} {text}` (first incomplete by id order)
12. **Commit plan block** (when chunks exist): header + one line per chunk
13. **Blank line**
14. **Footer:** `Next step: {next.command}`

### Column section format

Each column block:

```text
── {title} ──{active? " (active)" : ""} ─────────────────
  [{token}]  {label}
  ...
```

- `{title}` is `col.title` verbatim (e.g. `5 · Build`).
- `(active)` suffix when this column contains the single `next` node (rail or stack).
- Header rule: `──` + title + optional ` (active)` + ` ──` + enough `-` to reach **72**
  characters total line width (truncate rule chars if title is long).

### Status tokens (ASCII only — mandatory)

| `NodeStatus` | Token    | Must appear as                                           |
| ------------ | -------- | -------------------------------------------------------- |
| `next`       | `[next]` | Exactly **one** row in the entire document               |
| `done`       | `[done]` |                                                          |
| `pending`    | `[todo]` | Tasks use `[todo]` even when long                        |
| `skipped`    | `[skip]` | Append ` (skipped)` after label                          |
| `debt`       | `[debt]` |                                                          |
| `current`    | —        | Must **never** appear (reserved; not assigned by derive) |

**Forbidden in pretty stdout:** Unicode status glyphs `⏺`, `▶`, `○`, `⊝`, `⊘`, `◉`,
`◇`, gum-style boxes, ANSI `\x1b[` sequences.

### Row format

```text
  [{token}]  {label}
```

- Two spaces before `[`.
- One space after `]`.
- `{label}` is `node.label` verbatim from the report (no gum truncation to empty).

### Label truncation rule

- Max **70** visible characters per label (excluding token).
- If truncated, append `…` (ASCII ellipsis U+2026 is OK; prefer `...` if unsure).
- For task nodes (`kind === 'task'`): **never truncate before the task id** —
  the line MUST contain `T###` (e.g. `T101`) when the label includes it.

### Kind prefix (`--index` and `--full` only)

When `--index` or `--full` is set, prefix each row label with a kind tag:

| `node.kind` | Prefix   |
| ----------- | -------- |
| `command`   | `cmd: `  |
| `artifact`  | `file: ` |
| `task`      | `task: ` |
| `mise`      | `mise: ` |
| other       | `node: ` |

Example index row:

```text
  [next]  cmd: /speckit-implement
  [todo]  task: T101 Pure classification core (role_conformance_core.script.ts)
```

**Default pretty (no flags):** no kind prefix — status token + label only.

### `--index` vs `--full` vs default

| Mode               | Behavior                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Default (no flags) | Normative document above; **no** kind prefixes                                                          |
| `--index`          | Same vertical document **with** kind prefixes on every node row                                         |
| `--full`           | **Identical output to `--index`** in this handoff (vertical layout is already complete; no second grid) |

### `--raw` (unchanged)

Do **not** change `renderRaw()` output shape. Pretty and raw are distinct modes.

### Reference example (018 implement, abbreviated)

```text
Spec workflow · architecture-role-taxonomy
  /Users/roalcantara/Work/bun/kb/assets/specs/018-architecture-role-taxonomy

Phase: implement
NEXT:  speckit.implement

── 1 · Intent ─────────────────────────────────────────────
  [done]  /speckit-specify
  [done]  spec.md

── 5 · Build (active) ─────────────────────────────────────
  [next]  /speckit-implement
  [todo]  T101 Pure classification core (`role_conformance_core.script.ts`) — *gate:* ROLE-1 AC1/AC2 core
  [todo]  T102 IO runner: scan + `buildReport` + report.md — *gate:* ROLE-1 AC1
  ...

Tasks: 0/10 done
Next task: T101 Pure classification core (`role_conformance_core.script.ts`) — *gate:* ROLE-1 AC1/AC2 core

Next step: speckit.implement
```

---

## Implementation checklist

Execute in order. Check each box in the completion report.

### Phase 1 — ASCII formatter module

- [ ] **WSU-A.1** Create `workflow_status_ascii.script.ts` with exported
  `formatWorkflowStatusAscii(report, flags): string`.
- [ ] **WSU-A.2** Implement status token map exactly as normative contract table.
- [ ] **WSU-A.3** Implement column sections for all six columns, `(active)` suffix logic.
- [ ] **WSU-A.4** Implement task-id-safe truncation (never hide `T###`).
- [ ] **WSU-A.5** Implement kind prefixes when `flags.showIndex === true`.
- [ ] **WSU-A.6** Module is pure: no `console.*`, no `Bun.spawn`, no imports from
  `gum_theme.script.ts` or `ansi_theme.script.ts`.

### Phase 2 — Replace pretty renderer

- [ ] **WSU-A.7** `renderPretty()` calls `formatWorkflowStatusAscii` + `console.log`.
- [ ] **WSU-A.8** Remove from pretty path: `gumJoinHorizontal`, `gumJoinVertical`,
  `gumSection`, `gumBold`, `gumMuted`, `gumBadge`, `gumNextSteps`, `gumAccent`,
  `gumWarn`, `renderColumnsGrid`, `renderSectionedIndex`, narrow-terminal gate
  (`wide >= 115`).
- [ ] **WSU-A.9** Keep `renderRaw`, `renderMermaid`, `emitMermaid`, `renderWorkflowStatus`
  json branch unchanged.

### Phase 3 — CLI glue

- [ ] **WSU-A.10** Replace `gumMuted(...)` in `workflow_status.script.ts` with plain
  strings (`snapshot written: …`, mermaid notes).
- [ ] **WSU-A.11** When `--index` or `--full`: use pretty mode even if stdout is not a
  TTY (do not fall back to raw and drop index).

### Phase 4 — Docs

- [ ] **WSU-A.12** Update [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md)
  § Workflow status: describe ASCII layout, tokens, remove gum/narrow-terminal/grid
  claims; fix snapshot path to `tools/metrics/workflow-status/` if still wrong.

---

## Acceptance criteria tracker

All rows required. **Pass** only when Evidence command output matches **Pass criteria**
exactly. If any row fails, handoff is **not** complete.

| ID         | Done when                                             | Evidence                                                                                                                                                                                                                    | Pass criteria (all must hold)                                                                                                                                                                |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WSU-A AC1  | Default pretty on 018 is human-readable               | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy 2>&1 \| tee /tmp/ws018.txt`                                                                                                                      | File contains literal substrings `T101`, `T102`, `T110`, `/speckit-implement`, `Phase: implement`, `NEXT:  speckit.implement`. File does **not** match regex `[◇◉⏺▶○⊝⊘]` nor contain `\x1b[` |
| WSU-A AC2  | Exactly one next row; implement rail next; tasks todo | Same file + `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --raw 2>&1`                                                                                                                          | Pretty: exactly one line matching `^\s+\[next\]` . Raw: build rail shows `▶` or `[build]` with implement label; T101 line shows pending/todo not next                                        |
| WSU-A AC3  | Conform node done on 018                              | `/tmp/ws018.txt`                                                                                                                                                                                                            | Contains `[done]` line with `mise run spec conform` OR raw shows conform as done (`⏺` in raw only)                                                                                           |
| WSU-A AC4  | `--index` adds kind prefixes                          | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --index 2>&1 \| tee /tmp/ws018-index.txt`                                                                                                        | Contains `cmd: /speckit-implement` and at least one `task: T101`. Exit 0                                                                                                                     |
| WSU-A AC5  | `--full` equals `--index` output                      | `diff /tmp/ws018-index.txt <(mise run spec workflow status assets/specs/018-architecture-role-taxonomy --full 2>&1)`                                                                                                        | Empty diff (identical stdout)                                                                                                                                                                |
| WSU-A AC6  | Non-TTY `--index` works                               | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --index 2>&1 \| head -5`                                                                                                                         | First lines are pretty ASCII (starts with `Spec workflow ·`), not `Columns:` raw block                                                                                                       |
| WSU-A AC7  | No gum in pretty code path                            | `rg 'gum(Join\|Section\|Bold\|Muted\|NextSteps\|Accent\|Warn\|Badge)' packages/ops/src/governance/specs/workflow_status_output.script.ts`                                                                                   | Zero matches in functions used by pretty mode (mermaid path may still import gum if pre-existing — pretty path must not call gum)                                                            |
| WSU-A AC8  | `--raw` unchanged for scripting                       | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --raw 2>&1 \| head -3`                                                                                                                           | Still prints `Spec workflow ·`, `Phase:`, `NEXT:` in raw layout (same as before this handoff)                                                                                                |
| WSU-A AC9  | Snapshots still work                                  | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --record 2>&1` then `mise run spec workflow status --list architecture-role-taxonomy 2>&1`                                                       | Record prints path under `tools/metrics/workflow-status/`. List exit 0, shows ≥1 row                                                                                                         |
| WSU-A AC10 | Compare via mise                                      | `A=tools/metrics/workflow-status/architecture-role-taxonomy/<latest>.status.json` (two paths); `mise run spec workflow status --compare-a "$A" --compare-b "$A" --raw 2>&1`                                                 | Output starts with `Comparing:` . Exit 0. Does **not** print `Spec workflow ·` feature status                                                                                                |
| WSU-A AC11 | Fixture implement-mid sanity                          | `mise run spec workflow status packages/ops/src/__tests__/fixtures/workflow_status/implement-mid --refresh 2>&1`                                                                                                            | Contains `[next]  /speckit-implement`. At least one `[done]` row whose label starts with `T101` (from `tasks.md`, not stale snapshot cache). Exit 0                                          |
| WSU-A AC12 | Existing tests still pass                             | `bun test --config /dev/null packages/exec/src/workflow_progress.script.spec.ts packages/ops/src/governance/specs/workflow_status.script.spec.ts packages/ops/src/governance/specs/workflow_status_snapshot.script.spec.ts` | Exit 0. No test file edits required                                                                                                                                                          |
| WSU-A AC13 | Quality gate                                          | `bash .agents/skills/app-quality-gate/scripts/gate.sh`                                                                                                                                                                      | Exit 0 on commit tree                                                                                                                                                                        |
| WSU-A AC14 | SDD guide accurate                                    | `rg 'gum pretty' assets/guides/WORKFLOW_SDD_GUIDE.md`                                                                                                                                                                       | Zero matches. Guide describes ASCII tokens `[done]`/`[next]`/`[todo]`                                                                                                                        |

---

## Negative acceptance (automatic fail)

Any of the following → **REQUEST_CHANGES**, do not claim done:

- Pretty stdout contains Unicode status glyphs or ANSI color escapes.
- Build column shows repeated glyph-only rows with no `T101` text on 018.
- More than one `[next]` row in pretty output.
- Any task row uses `[next]` (tasks are always `[todo]` or `[done]`).
- `packages/exec/src/workflow_progress.script.ts` modified.
- New `.spec.ts` file added for ASCII formatter.
- `--raw` output format changed (breaking scripting).
- `--record` / `--list` / `--compare-a` regression.
- Quality gate red on commit tree.

---

## Quality gates (run before commit)

```bash
# 1. Manual AC evidence (capture /tmp/ws018.txt as above)
mise run spec workflow status assets/specs/018-architecture-role-taxonomy
mise run spec workflow status assets/specs/018-architecture-role-taxonomy --index
mise run spec workflow status assets/specs/018-architecture-role-taxonomy --raw

# 2. Regression tests (must stay green — do not edit unless broken by your diff)
bun test --config /dev/null \
  packages/exec/src/workflow_progress.script.spec.ts \
  packages/ops/src/governance/specs/workflow_status.script.spec.ts \
  packages/ops/src/governance/specs/workflow_status_snapshot.script.spec.ts

# 3. Full gate on commit tree
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

**Gate policy:** If gate fails, fix and re-run. Do not commit red. Do not add
`biome-ignore` without maintainer approval.

**Local pitfall:** Untracked `tools/metrics/workflow-status/*.json` may fail biome.
Do not commit them; delete or gitignore before gate if needed.

**Fixture pitfall:** Stale snapshots under `tools/metrics/workflow-status/implement-mid/`
replay pre-derive task IDs (`T001`…). Use `--refresh` for AC11 evidence, or delete
that directory before manual smoke so `tasks.md` `T101+` rows appear in the build column.

---

## Commit plan

Single atomic commit (≤50-char subject):

| Subject                                   | Paths                                                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `fix(spec): ASCII workflow status output` | `workflow_status_ascii.script.ts` (new), `workflow_status_output.script.ts`, `workflow_status.script.ts`, `WORKFLOW_SDD_GUIDE.md` |

Run `gate.sh` immediately before commit.

---

## Files touched

| File                                                                                                                                                | Change                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [`packages/ops/src/governance/specs/workflow_status_ascii.script.ts`](../../../packages/ops/src/governance/specs/workflow_status_ascii.script.ts)   | **new** — pure ASCII formatter         |
| [`packages/ops/src/governance/specs/workflow_status_output.script.ts`](../../../packages/ops/src/governance/specs/workflow_status_output.script.ts) | pretty path → ASCII; remove gum grid   |
| [`packages/ops/src/governance/specs/workflow_status.script.ts`](../../../packages/ops/src/governance/specs/workflow_status.script.ts)               | drop gumMuted; force pretty on --index |
| [`assets/guides/WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md)                                                                         | ASCII docs                             |

---

## Out of scope (do not implement)

- HTML export changes
- Mermaid terminal rendering changes
- Derivation / `next` semantics changes
- New unit or snapshot tests for ASCII output
- Gum budget / ANSI theme / horizontal column grid
- Replacing gum in other `mise run spec` commands
- Orchestrator auto-record hook
- Committing dogfood snapshot JSON under `tools/metrics/`

---

## Structured completion report (implementer fills this)

```markdown
## Workflow status ASCII — completion report

**Agent:** <name/model>
**Branch:** <branch>
**Commit:** <SHA> fix(spec): ASCII workflow status output
**Date:** <ISO date>

### Acceptance criteria

| ID         | Pass? | Evidence (one line: command → result) |
| ---------- | ----- | ------------------------------------- |
| WSU-A AC1  | ☐     |                                       |
| WSU-A AC2  | ☐     |                                       |
| WSU-A AC3  | ☐     |                                       |
| WSU-A AC4  | ☐     |                                       |
| WSU-A AC5  | ☐     |                                       |
| WSU-A AC6  | ☐     |                                       |
| WSU-A AC7  | ☐     |                                       |
| WSU-A AC8  | ☐     |                                       |
| WSU-A AC9  | ☐     |                                       |
| WSU-A AC10 | ☐     |                                       |
| WSU-A AC11 | ☐     |                                       |
| WSU-A AC12 | ☐     |                                       |
| WSU-A AC13 | ☐     |                                       |
| WSU-A AC14 | ☐     |                                       |

### Quality gate

```
bash .agents/skills/app-quality-gate/scripts/gate.sh
→ exit code:
```

### Checklist phases

- [ ] Phase 1 — ASCII formatter module
- [ ] Phase 2 — Replace pretty renderer
- [ ] Phase 3 — CLI glue
- [ ] Phase 4 — Docs

### Sample output (018 default pretty — paste first 30 lines)

```
<paste from /tmp/ws018.txt>
```

### Deviations / follow-ups

- <none>

### Operator sign-off

Ready for review: **YES / NO**
```

---

## Handoff evaluation rubric (for reviewer)

| Score           | Criteria                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Pass**        | All WSU-A AC1–AC14 Pass; gate exit 0; single commit; completion report with pasted sample; no negative criteria triggered |
| **Conditional** | ≤1 AC gap with documented operator-approved deviation                                                                     |
| **Fail**        | Any negative criterion; 018 pretty unreadable; gum still in pretty path; raw/snapshot regression                          |

Reviewer command bundle:

```bash
mise run spec workflow status assets/specs/018-architecture-role-taxonomy 2>&1 | tee /tmp/ws018-review.txt
rg 'T101|T102|/speckit-implement|\[next\]' /tmp/ws018-review.txt
rg '[\x1b◇⏺▶]' /tmp/ws018-review.txt && echo FAIL || echo OK
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Use [`app-review-handoff`](../../../.agents/skills/app-review-handoff/SKILL.md) with
this file as the handoff source (`--handoff assets/specs/002-workflow-status-ux/handoff.ascii-status.prompt.md`).
