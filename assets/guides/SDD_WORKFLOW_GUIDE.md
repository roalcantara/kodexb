<!-- markdownlint-disable-file -->

# SDD workflow guide (kb + Spec Kit)

Canonical operator guide for Spec-Driven Development in kb. The constitution
([`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)) binds
Spec Kit commands; this guide explains **how to run them**.

## Layout

```text
assets/specs/
├── README.md                      # program backlog
├── _templates/                    # intake, handoff (not Companion specs)
├── 001-sync-frecency-persistence/ # greenfield feature folders
└── archive/                       # milestone_01 + completed specs

assets/features/e2e/               # canonical executable Gherkin (@spec:<slug>)
assets/docs/specs/e2e/             # fixture-manifest, step-catalog (shared contracts)
```

**Companion scan:** `.vscode/settings.json` → `"speckit.specDirectories": ["assets/specs/[0-9][0-9][0-9]-*"]`

## Artifact authority

| File                            | Role                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `spec.md`                       | EARS requirements + Measure/Evidence; optional E2e pointer table   |
| `plan.md`                       | Design + **E2e traceability** table (paths only — no Gherkin body) |
| `tasks.md`                      | Ordered work + Done when + Evidence                                |
| `handoff.md`                    | Implementer prompt + AC tracker                                    |
| `assets/features/e2e/*.feature` | **Canonical Gherkin** (CI executes this)                           |

Legacy `requirements.md` / `design.md` under `assets/docs/specs/MILESTONE_*` are
reference only. Parity: `mise run spec import-legacy --feature 001-sync-frecency-persistence`.

## Greenfield flow

1. Paste intake ([`_templates/increment-intake.md`](../specs/_templates/increment-intake.md)).
2. Refine seed Gherkin on `assets/features/e2e/<slug>.feature`.
3. Create Spec → `/speckit-specify` → `assets/specs/<NNN-slug>/spec.md` (EARS only).
4. `/speckit-plan` → `plan.md` + update `.feature` file.
5. `/speckit-clarify`, `/speckit-checklist`, `/speckit-analyze` (advisory).
6. `/speckit-tasks` → `tasks.md` + `handoff.md`.
7. `/speckit-implement` (load `handoff.md`).
8. **`mise run spec gate assets/specs/<NNN-slug>`** → lint + trace + `gate.sh`.

Optional scaffold: `mise run spec feature-init --id 001 --slug my-feature`.

## Deterministic gates (provider-agnostic)

| Command                              | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `mise run spec lint --strict <dir>`  | EARS shape in `spec.md` (`tools/spec/lint.ts`)    |
| `mise run spec trace --strict <dir>` | spec pointer → `.feature` (`tools/spec/trace.ts`) |
| `mise run spec gate <dir>`           | lint + trace + `gate.sh`                          |
| `mise run spec resume`               | `specify workflow resume` after failed workflow   |

LLM checklist/analyze skills are **advisory** — gates above enforce shape.

## Workflows (Companion + YAML)

| Tier          | When                                | Companion workflow                      |
| ------------- | ----------------------------------- | --------------------------------------- |
| **kb-full**   | New feature (pilot 001)             | specify → plan → tasks → implement      |
| **kb-slice**  | Brownfield 002/003 after 001 merged | checklist → analyze → tasks → implement |
| **kb-hotfix** | 1–3 file fix                        | minimal spec → tasks → implement        |

YAML: `.specify/workflows/kb-{full,slice,hotfix}/workflow.yml`
Catalog: `.specify/workflow-catalogs.yml`

## Parallel features (002 + 003)

After **001 is merged to main**:

```bash
mise run spec worktree-add -- 002-task-source-truthfulness
mise run spec worktree-add -- 003-list-tag-facet-performance
```

Branch from **post-001 main**, not in-flight 001 (SQLite schema overlap). Run CRG
impact-radius before parallel implement.

## Commits

- **Chat agents:** commit only when asked ([`GIT_COMMITS_GUIDE.md`](GIT_COMMITS_GUIDE.md)).
- **Operator / Companion:** optional git hooks in `.specify/extensions.yml` (`optional: true`).
- **Authoritative auto-commit off:** `.specify/extensions/git/git-config.yml` → all `auto_commit.*: false`.
- **Workflow shell:** `mise run spec commit` after approved gate (future task).

## Provider routing

Spec Kit integrations installed: **`cursor-agent`** (default) + **`opencode`**.

| Step           | Cursor (Companion)                  | OpenCode (terminal)                 |
| -------------- | ----------------------------------- | ----------------------------------- |
| Specify / plan | `/speckit-specify`, `/speckit-plan` | `/speckit.specify`, `/speckit.plan` |
| Tasks          | `/speckit-tasks`                    | `/speckit.tasks`                    |
| **Implement**  | `/speckit-implement` + `handoff.md` | `/speckit.implement` + `handoff.md` |
| Gate           | `mise run spec gate <dir>`          | same (shell)                        |

### OpenCode setup (one-time)

1. **CLI + auth** — [OpenCode intro](https://opencode.ai/docs): install, then `/connect` in TUI or `opencode providers list`.
2. **Spec Kit commands** — already installed:
   ```bash
   specify integration list    # opencode should show installed
   ls .opencode/commands/speckit.*.md
   ```
3. **Project config** — `opencode.json` (MCP + instructions). Not `.opencode.json` (legacy Cursor-style; removed).
4. **Verify wiring**:
   ```bash
   mise run spec opencode-check
   ```

### Hand off implement (001 example)

```bash
cd /path/to/kb
opencode
# In TUI:
/speckit.kb.preflight
/speckit.implement Read handoff.md for assets/specs/001-sync-frecency-persistence
# After code:
# exit TUI and run:
mise run spec gate assets/specs/001-sync-frecency-persistence
```

Workflow YAML `integration: auto` still resolves to **cursor-agent** unless you pass `--integration opencode` to `specify workflow run`. Companion per-step provider pick remains manual.

### Dual integration note

`cursor-agent` stays the default Spec Kit integration. OpenCode adds parallel `/speckit.*` commands under `.opencode/commands/` without removing Cursor skills.

## Related guides

- [`BDD_GHERKIN_GUIDE.md`](BDD_GHERKIN_GUIDE.md) — Gherkin + Screenplay
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) — bun:test layers
- [`DoD.md`](DoD.md) — ship bar
- [`CI_GUIDE.md`](CI_GUIDE.md) — review.yml
