# SDD workflow guide

How kb uses **Spec Kit** and **specification-driven development (SDD)** for in-flight
features. Document authority and layer rules live in
[`DOC_AUTHORITY.md`](DOC_AUTHORITY.md); this guide describes the day-to-day workflow.

**General agent entrypoint (no spec required):** [`README.md`](README.md).

## Spec lifecycle reference

Use this quick lifecycle when routing work:

1. In-flight work uses Spec Kit artifacts for the active feature.
2. Ship-ready behavior is validated through Gherkin and unit/component tests.
3. Shipped feature status is registered in `assets/catalog/catalog.yaml`.

Path policy remains normative in [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md).
Other files may describe paths for usage examples but must not define new
hard rules.

## Where specs live

| Layer                | Path                                                         | When to open                                     |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| **In-flight SDD**    | `assets/specs/NNN-<slug>/`                                   | Only when your task names that slug              |
| **Shipped registry** | `assets/catalog/catalog.yaml`                                | What exists in the product (YAML metadata)       |
| **Gherkin**          | `assets/features/**/*.feature`                               | User-visible behaviour                           |
| **Unit/component**   | `src/**/*.spec.ts(x)`                                        | Implementation contracts                         |
| **Legacy archive**   | See [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) § Document layers | Archaeology after ship — not an agent entrypoint |
| **Process**          | `assets/guides/`                                             | Cross-cutting rules for every PR                 |

Normative files per in-flight feature:

- `spec.md` — EARS requirements with **Measure** and **Evidence**
- `plan.md` — design contract, file touch list, traceability
- `tasks.md` — ordered work and verification
- `handoff.md` — acceptance tracker (`ID | Done when | Evidence` table; part of normative quartet)

Path policy reminder: command examples in this guide use the current default
spec root (`assets/specs/`). In code and tests, do not hardcode specific
feature slugs under that root. Prefer feature-dir inputs, shared loaders, and
fixtures as defined in [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md#in-flight-specs-are-ephemeral).

Backlog index: [`assets/specs/README.md`](../specs/README.md).

Binding principles for Spec Kit commands: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md).

## Spec Kit workspace

kb ships a **vanilla** Spec Kit workspace under `.specify/`:

- Templates: `.specify/templates/`
- Default workflow: `.specify/workflows/speckit/` (full specify → plan → tasks → implement cycle)
- Cursor skills: `.cursor/skills/speckit-*/`
- Agent rule snippet: [`.cursor/rules/specify-rules.mdc`](../../.cursor/rules/specify-rules.mdc)

Companion scans only numbered feature folders:

```json
"speckit.specDirectories": ["assets/specs/[0-9][0-9][0-9]-*"]
```

(VS Code / Cursor: [`.vscode/settings.json`](../../.vscode/settings.json).)

**Registered workflows** (`.specify/workflow-catalogs.yml`):

- `speckit` — vanilla upstream cycle.
- `orchestrated-handoff` — kb extension with dual `analyze` passes and a documented
  handoff-emit seam between analyze-tasks and implement (see
  [§ orchestrated-handoff workflow](#orchestrated-handoff-workflow) below).

**Still deferred:** `orchestrated-sliced` and `orchestrated-hotfix`. Track in
[`tools/governance/specs/PLAN_PUNCHLIST.md`](../../tools/governance/specs/PLAN_PUNCHLIST.md).

## Starting a feature

1. **Scaffold** (optional — copies templates):

   ```bash
   mise run spec init --id <NNN> --slug <slug>
   ```

2. **Branch** — use conventional feature branch naming (`feat/004-my-feature`).

3. **Specify** — run `/speckit-specify` in Cursor (or write `spec.md` from
   `.specify/templates/spec-template.md`).

4. **Clarify / plan / tasks** — `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks` (or brainstorm-first authoring; see [Brainstorm-first path](#brainstorm-first-path) below).

5. **Normalize** — `mise run spec conform` (or `mise run spec audit --fix`) scaffolds handoff, task IDs, and analyze checklists.

6. **Implement** — `/speckit-implement`; code under `src/` with co-located specs.
   After each green phase, record work with **`mise run spec ready --phase Cn --commit`**
   (messages and pathspecs come from **`## Commit plan`** in `tasks.md`).

7. **Quality passes** (advisory) — `/speckit-checklist`, `/speckit-analyze`.

Git auto-commit hooks are **mostly disabled** in `.specify/extensions/git/git-config.yml`;
**`after_implement`** is **enabled** for the Spec Kit CLI but does **not** run HK
commit-message policy or `app-quality-gate`. Use **`mise run spec ready --phase … --commit`**
(incremental) or **`/commit-all`** (ad-hoc) for plan-driven atomic commits.
Cursor `/speckit-implement` does not invoke Speckit hooks unless you run through the
`specify` CLI with `auto_execute_hooks: true`.

## Commit plan (tasks.md)

Author **`## Commit plan`** in `tasks.md` during `/speckit-tasks` (one `### C#` chunk per
logical phase). Each chunk lists **Paths**, **Subject**, **Body**, and optional **Tasks**
/ **Phase** links. Mirror subjects on task lines with `*commit:* \`type(scope): Subject\``.

`mise run spec conform` scaffolds an empty Commit plan when implementation tasks exist.

**Incremental** (one chunk, gate + HK per chunk, no catalog promote):

```bash
mise run spec ready --phase C1 --commit
mise run spec ready -p 1 --commit          # same chunk by index
mise run spec ready -p A --commit          # same chunk by phase letter
```

Optional `-c` / `--commit-message` must **match** the plan entry (not a freeform override).

**Closeout flush** (remaining dirty chunks, then ship gate):

```bash
mise run spec ready --commit
mise run spec closeout assets/specs/NNN-slug --commit   # audit + evidence + flush + promote
```

**Mid-authoring checkpoint** (lint/trace only, no git):

```bash
mise run spec ready --phase 1
```

## Brainstorm-first path

Use `brainstorming` / `writing-plans` when exploring alternatives before committing to a spec shape. That workflow often lands `spec.md`, `plan.md`, and `tasks.md` without Spec Kit analyze artifacts.

After the quartet content is written:

1. Run **`mise run spec conform`** (or **`mise run spec audit --fix`**) to scaffold `handoff.md`, renumber task IDs to **`T101+`**, and create stub `checklists/analyze-*.md`.
2. Run **`/speckit-analyze`** twice (plan pass, then tasks pass) to replace generic checklist stubs and refine handoff “Done when” prose.
3. Continue with implement / gate as usual.

Task IDs use **`T101`, `T102`, …** (not `T001`) so audit hygiene passes without tripping the tasks-template sample-leak check.

## Deterministic gates (authoritative)

LLM skills advise; these commands **enforce**:

```bash
# EARS shape + spec hygiene
mise run spec lint assets/specs/NNN-slug --strict

# Cross-file traceability (spec ↔ plan ↔ features)
mise run spec trace assets/specs/NNN-slug --strict

# Quartet + handoff + tasks readiness (post-tasks, pre-analyze; autodetects active feature)
mise run spec audit --strict
mise run spec audit assets/specs/NNN-slug --strict

# Brainstorm → speckit bridge (scaffold handoff, T101+ task IDs, analyze checklists)
mise run spec conform
mise run spec conform assets/specs/NNN-slug

# Apply audit fixes only (dry-run first)
mise run spec audit --fix --dry-run
mise run spec audit assets/specs/NNN-slug --fix --strict

# lint + trace + spec audit + full app quality gate
mise run spec gate assets/specs/NNN-slug

# deterministic security subgate (standalone or as part of spec gate)
mise run spec audit security --strict

# deterministic security subgate (changed-files mode for local hook)
mise run spec audit security --changed-only --strict --base <sha>
```

Implementation: [`tools/governance/specs/`](../../tools/governance/specs/).

Run `mise run spec lint --strict` (omit `[feature]` to lint every numbered spec) before a release that touches multiple specs.

## Executable traceability

Every normative requirement must map to executable evidence before ship:

| Evidence                      | Owner                                                 |
| ----------------------------- | ----------------------------------------------------- |
| User-visible behaviour        | Gherkin — line-1 `@<catalog_key>` on `.feature` files |
| Algorithms, utils, components | Co-located `*.spec.ts(x)` under `src/`                |
| Cross-cutting repo rules      | Guides + tool configs (Biome, ast-grep, etc.)         |

E2e step contracts (when declared): `assets/features/e2e/contracts/`.

Catalog membership: [`assets/catalog/catalog.yaml`](../catalog/catalog.yaml) + `mise run catalog validate`.

## Spec Kit command map

| Phase          | Cursor skill             | Primary artifact                   |
| -------------- | ------------------------ | ---------------------------------- |
| Constitution   | `/speckit-constitution`  | `.specify/memory/constitution.md`  |
| Specify        | `/speckit-specify`       | `spec.md`                          |
| Clarify        | `/speckit-clarify`       | `spec.md` updates                  |
| Plan           | `/speckit-plan`          | `plan.md`                          |
| Tasks          | `/speckit-tasks`         | `tasks.md`                         |
| Implement      | `/speckit-implement`     | `src/` + tests                     |
| Review handoff | `app-review-handoff`     | chat report + `tmp/reviews/` audit |
| Checklist      | `/speckit-checklist`     | `checklists/`                      |
| Analyze        | `/speckit-analyze`       | consistency report                 |
| Issues         | `/speckit-taskstoissues` | GitHub issues (optional)           |

Resume an interrupted workflow: `mise run spec workflow resume <runId>`.

## orchestrated-handoff workflow

`orchestrated-handoff` is the kb extension of the vanilla speckit cycle. It
adds **dual `analyze` passes** (after `plan`, after `tasks`) and a documented
handoff-emit seam between `analyze-tasks` and `implement` so Gherkin/BDD work
can be delegated to a worker (v1: opencode) without losing executable
traceability.

### Phase order

```text
specify → clarify → checklist → plan
  → analyze (plan pass)     ← advisory; catches plan/traceability gaps
  → tasks                   → tasks.md + handoff.md
  → analyze (tasks pass)    ← advisory; catches task/handoff/Evidence drift
  → handoff-generate        ← Bun script (orchestrator, NOT in workflow YAML)
  → implement
  → review-handoff          ← app-review-handoff skill (AC + Evidence; advisory)
  → review                  ← mise run spec gate (deterministic EARS)
```

Both analyze passes use the same `speckit.analyze` command. The
`.specify/workflows/orchestrated-handoff/workflow.yml` **includes both analyze
steps** so `specify workflow run orchestrated-handoff` can drive the cycle
end-to-end. Completion is also tracked via checklist artifacts so the
orchestrator's `--next` works when the operator mixes `mise` and manual
`speckit.*` invocations:

- `checklists/analyze-plan.md` — written after plan-pass analyze
- `checklists/analyze-tasks.md` — written after tasks-pass analyze
- `checklists/implement-done.md` — written after `speckit.implement`, review-handoff
  APPROVE, and unit checks pass; signals `--next` to advance to `mise run spec gate`

### Commands (post-011)

```bash
# Drive the workflow via Spec Kit (canonical):
specify workflow run orchestrated-handoff

# Or use the local orchestrator (positional [feature], --dry-run for next step):
mise run spec workflow run assets/specs/NNN-slug
mise run spec workflow run assets/specs/NNN-slug --dry-run
mise run spec workflow handoff generate assets/specs/NNN-slug --focus gherkin
mise run spec workflow resume <runId>
```

`--dry-run` prints the canonical next command for the active workflow transition
table in this guide. For XML subtask manifests, use workflow bench or legacy
`--manifest` on the workflow runner script (see package docs).

Legacy names removed in 011: `spec workflow orchestrated-handoff`, `--next`,
`--feat`, top-level `mise run audit`, `spec feature-init`, `app gates --all`.

### Workflow status (`mise run spec workflow status`)

Shows a six-column SDD pipeline view (Intent · Design · Breakdown · Dispatch ·
Build · Ship), artifact debt, the **NEXT** command, and — during implement —
the T### task checkboxes and Commit plan chunks for the active feature.

```bash
mise run spec workflow status                      # active feature, gum pretty
mise run spec workflow status assets/specs/NNN-slug
mise run spec workflow status --json               # stable JSON (no ANSI)
mise run spec workflow status --raw                # plain text, no gum
mise run spec workflow status --format mermaid     # rail-only flowchart LR
mise run spec workflow status --format mermaid --subgraph  # columns + artifact stacks
mise run spec workflow status -o /tmp/status.html  # self-contained HTML grid
```

- **NEXT banner** — verbatim from `detectPhase()`
  (`packages/exec/src/orchestrated_handoff.script.ts`), the normative phase
  detector. Files on disk do **not** advance the pipeline: a `tasks.md` that
  exists before `checklists/analyze-plan.md` is shown as **artifact debt** (⊘),
  not as a done stage.
- **Dispatch column** — `skipped` (⊝) when the subtask manifest does not
  require a `gherkin-bdd-handoff` (no operator smoke / Gherkin in plan).
- Narrow terminals (<115 cols) render NEXT + artifact index only.

### When to use opencode worker handoff vs primary implement

- **Primary implement (Cursor / opencode / `speckit.implement`)** — code under
  `src/` with co-located `.spec.ts(x)`. Use when the next slice is unit work
  with clear file paths in `plan.md`.
- **Opencode worker handoff** — emit `tmp/handoffs/opencode-{slug}-{focus}.md`
  and dispatch it to opencode (v1 only). Use when:
  - The slice is Gherkin/BDD under `assets/features/**/*.feature` +
    `bdd/unit/` or `bdd/e2e/`, OR
  - `plan.md` traceability declares scenarios not yet reflected in
    `handoff.md` Evidence, OR
  - The spec has an operator-smoke AC (e.g. UI-driven verification).

### --focus taxonomy

- `gherkin` — generate AC tags, slice ids, bdd/unit + bdd/e2e instructions.
- `catalog` — emphasise `mise run catalog validate` and `RESERVED_RUN_TAGS`.
- `e2e-fix` — focus on Playwright @e2e scenarios under `bdd/e2e/` only.

The emitted file lands under `tmp/handoffs/opencode-{slug}-{focus}.md`. v1
dispatches only to opencode (per [opencode CLI docs](https://opencode.ai/docs/cli/),
`opencode run [message..]`). v2 multi-provider dispatch (codex / claude /
deepseek) is deferred — handoff files for other providers are not generated.

### Dispatch

```bash
mise run spec workflow handoff generate assets/specs/NNN-slug --focus gherkin --dispatch
# or
ORCHESTRATED_HANDOFF_DISPATCH=1 mise run spec workflow handoff generate assets/specs/NNN-slug --focus gherkin
```

The file is always written to `tmp/handoffs/` first. If opencode is not on
`$PATH`, the script warns on stderr and exits 0 (file-only mode). If
`opencode run` fails, its exit code propagates.

`spec workflow handoff generate` invokes `spec workflow handoff scrub` on the rendered prompt body
before file write/dispatch. On scrub failure, generation exits 1 and does not
write or dispatch.

### Runs CLI — event inspection

Workflow events are written as newline-delimited JSONL under
`tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson`. The `runs` subcommand
inspects and manages them:

```bash
# Show the 20 most recent runs with slug/phase/duration/result
mise run spec workflow runs list

# Stream all events for a specific run (byte-identical to disk)
mise run spec workflow runs show <run_id>

# Stream the most recent run for today (blocking on EOF)
mise run spec workflow runs tail

# Remove all runs older than 30 days
mise run spec workflow runs prune
```

Retention: `prune` removes date directories older than 30 days. `list` also
triggers a best-effort lazy prune as a side effect (silent — does not fail
if the directory is locked or missing).

Implementation: [`tools/governance/specs/workflow/runs_cli.script.ts`](../../tools/governance/specs/workflow/runs_cli.script.ts).

### Review handoff — post-implement verification

After **implement** (primary agent or opencode worker), verify the deliverable
against the handoff contract before `mise run spec gate` and commit.

**Skill:** [`.agents/skills/app-review-handoff/SKILL.md`](../../.agents/skills/app-review-handoff/SKILL.md)

| Step | Action                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------- |
| 1    | Load `app-context` + `app-review-handoff`                                                         |
| 2    | `mise run spec review-handoff prepare assets/specs/NNN-slug --json` (optional deterministic prep) |
| 3    | Open feature `handoff.md` AC tracker (or `tmp/handoffs/opencode-*` / `review-*`)                  |
| 4    | Run each row's **Evidence** command; record pass/fail                                             |
| 5    | Map `git diff BASE..HEAD` to AC rows and `plan.md` touch list                                     |
| 6    | Emit **chat** report (failures-first; no tables) + patch `tmp/reviews/review-{slug}-{sha}.md`     |
| 7    | On REQUEST_CHANGES: `tmp/handoffs/review-{slug}-{focus}-{sha}.md` fix handoff                     |
| 8    | Operator runs `bash .agents/skills/app-quality-gate/scripts/gate.sh` before commit                |

**CLI (deterministic extractors — do not replace the skill verdict):**

```bash
mise run spec review-handoff classify [--base SHA] [--head SHA] [--json]
mise run spec review-handoff extract-evidence assets/specs/NNN-slug [--json]
mise run spec review-handoff prepare assets/specs/NNN-slug [--base SHA] [--head SHA] [--json]
mise run spec review-handoff scaffold-audit assets/specs/NNN-slug [--base SHA] [--head HEAD] [--json]
```

Implementation: `tools/governance/specs/workflow/review_handoff.script.ts`.

**Inline (operator):** same Cursor session — ask to review the handoff on the
current branch.

**Dispatch (reviewer subagent):** fresh session with handoff prompt + SHAs only;
read-only, no code edits.

**Not a substitute for:**

- `/speckit-analyze` (pre-implement spec/plan/tasks consistency)
- `mise run spec lint/trace/gate` (normative spec documents)
- `app-quality-gate` (lint + src tests + DoD)

**Review skill routing** (same cap rule as plan routing — max 4 skills including
`app-context`):

| Review touches…           | Load                                       |
| ------------------------- | ------------------------------------------ |
| `src/shell/app`, RPC      | `app-rpc`                                  |
| `src/shell/renderer`, CSS | `STYLING_GUIDE.md`                         |
| Specs / BDD / `bdd/`      | `app-testing` + BDD/TESTING guides         |
| `tools/governance/`       | `mise-tasks`                               |
| Electrobun main / config  | `electrobun-best-practices` + routed skill |
| Blast radius              | CRG MCP (see [`CRG.md`](CRG.md))           |

Governance handoffs often require
`bun test --config /dev/null tools/governance/specs/workflow/` — `gate.sh` does
not run those tests by default.

After review-handoff **APPROVE** and a green quality gate:

```bash
touch assets/specs/NNN-slug/checklists/implement-done.md
mise run spec workflow run assets/specs/NNN-slug --dry-run
```

### Review-spec gate — deterministic EARS check

LLM advisory skills (`speckit.clarify`, `speckit.checklist`, `speckit.analyze`)
are advisory only. Before approving plan, run `mise run spec lint <featureDir>
--strict` — **deterministic EARS gate**; checklist and analyze are advisory only.

The orchestrator lint path (OHW-6 AC1) delegates to the same script:

```bash
mise run spec lint assets/specs/NNN-slug --strict
```

It returns `lint.script.ts`'s exit code. Do **not** weaken the linter to make a
spec pass — fix the spec instead. See
[`tools/governance/specs/PLAN_PUNCHLIST.md`](../../tools/governance/specs/PLAN_PUNCHLIST.md)
§1 and §5 for the rationale.

### Plan skill routing

Loading every skill in `SKILLS.yaml` floods plan context with irrelevant
material. The planner SHOULD load **at most 4 skills** (the operator may
explicitly expand scope), chosen from the table below.

| Plan touches…                       | Load skills (read each `SKILL.md`)                    |
| ----------------------------------- | ----------------------------------------------------- |
| `src/shell/app`, RPC                | `app-context`, `app-rpc`                              |
| `src/shell/renderer`, CSS           | `app-context`, plus `STYLING_GUIDE.md` reference      |
| Gherkin / BDD (`assets/features/`)  | `app-context`, `app-testing`, `BDD_GUIDE.md`          |
| `tools/governance/` only            | `app-context`, `mise-tasks`                           |
| Electrobun / main process / windows | `electrobun-best-practices` + routed Electrobun skill |

**Cap rule:** Maximum 4 skills unless operator explicitly expands scope. Never
"load all skills from `SKILLS.yaml`" — that's the anti-pattern this rule blocks.

Out of scope: automatic skill CLI install and LLM-based skill classification
(both v2). The upstream `speckit-plan` skill is **not** forked in this repo;
this section is the kb-side compatibility note (per OHW-7 AC2).

### Review skill routing

Same **cap rule** as plan routing: load **at most 4 skills** including
`app-context`. Full table and terse output rules:
[`.agents/skills/app-review-handoff/SKILL.md`](../../.agents/skills/app-review-handoff/SKILL.md).

Never load every skill in `SKILLS.yaml` for a review pass.

### Normative quartet

**Normative quartet:** `spec.md`, `plan.md`, `tasks.md`, `handoff.md`. These
are the only files Spec Kit treats as authoritative for in-flight features.

**Optional satellites** (`research.md`, `data-model.md`, `contracts/`,
`quickstart.md`) are feature-scoped and SHOULD be created **only** when:

- `plan.md` Technical Context has unresolved `NEEDS CLARIFICATION` markers, or
- The feature crosses module contracts that need a dedicated `contracts/`
  directory.

Rules (enforced by review, not lint):

- `plan.md` and `tasks.md` SHALL NOT copy EARS AC text. Reference requirement
  IDs (`OHW-n`, `SF-n`) instead.
- `plan.md` SHALL NOT duplicate Gherkin scenario bodies. Use the traceability
  table and link the `.feature` file.
- `checklists/` and `speckit.analyze` outputs are **advisory snapshots**, not
  second specs.

## Shipping

1. Gherkin + unit coverage for every requirement line (`enforced_by: none` is a ship blocker).
2. All `tasks.md` T### checkboxes `[x]` before `checklists/implement-done.md` (enforced by `tasks.incomplete` at gate).
3. **`mise run spec closeout assets/specs/NNN-slug`** — agent-agnostic closeout: `spec audit --strict`, replay handoff Evidence commands (operator-smoke skipped unless `--include-smoke`), flush remaining **Commit plan** chunks when `--commit` is passed (before final gate), then tag/catalog/HK/gate/**`catalog promote`**. Use **`mise run spec ready --commit`** when evidence was run manually and you only need flush + ship.
4. **`mise run spec ready assets/specs/NNN-slug`** — gate + HK + catalog promote without replaying handoff Evidence (use when evidence was run manually).
5. `mise run catalog ship <key>` — readiness check only; **`mise run catalog promote <key>`** writes `status: shipped` after gate passes
6. After merge: archive legacy SDD per [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) § Shipping

## Precedence on conflicts

**[`assets/guides/`](.) > [`CLAUDE.md`](../../CLAUDE.md) > [constitution](../../.specify/memory/constitution.md) > Spec Kit templates**

If this guide and the constitution disagree, fix the constitution in the same PR that updates
the guide.

## Related guides

- [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) — document layers, catalog governance, shipping
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) — bun:test, Gherkin, no-mock rule
- [`DoD.md`](DoD.md) — definition of done
