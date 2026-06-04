<!-- markdownlint-disable-file -->

# SDD workflow guide (kb + Spec Kit)

Canonical operator guide for Spec-Driven Development in kb. The constitution
([`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)) binds
Spec Kit commands; this guide explains **how to run them**.

## Layout

```text
assets/specs/<NNN-slug>/
├── spec.md, plan.md, tasks.md
├── READ_ORDER.md
└── artifacts/
    ├── spec/checklists/
    ├── plan/           # research.md, data-model.md, contracts/, quickstart.md
    └── tasks/handoff.md

assets/specs/README.md, _templates/, archive/
assets/features/e2e/               # canonical Gherkin (@spec:<slug>)
assets/docs/specs/e2e/             # fixture-manifest, step-catalog
```

**Companion scan:** `.vscode/settings.json` → `"speckit.specDirectories": ["assets/specs/[0-9][0-9][0-9]-*"]`

## Artifact authority

| File                            | Role                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `spec.md`                       | EARS requirements + Measure/Evidence; optional E2e pointer table   |
| `plan.md`                       | Design + **E2e traceability** table (paths only — no Gherkin body) |
| `tasks.md`                      | Ordered work + Done when + Evidence                                |
| `artifacts/tasks/handoff.md`    | Implementer prompt + AC tracker (legacy: `handoff.md` at root)     |
| `assets/features/e2e/*.feature` | **Canonical Gherkin** (CI executes this)                           |

## Empathic requirements (user intent, not engineer brain)

`spec.md` is **not** a place to dump everything a senior dev might think of.
Requirements must track **what the user came for**, including intent they implied
but did not spell out — and **exclude** concerns they never raised.

**Default when the user says:** “When I sync, don’t forget how I use things.”

| Good (user-shaped)                                                 | Bad (engineer extrapolation)                |
| ------------------------------------------------------------------ | ------------------------------------------- |
| List order stays the same for items still in my library after sync | “Orphan cleanup” on `binding_frecency` rows |
| Shortcuts I still have keep feeling familiar after sync            | “WHEN sync removes a binding from YAML…”    |
| Sync finishes and my files show up updated                         | “No frecency row for removed binding id”    |

A competent engineer **knows** orphan cleanup may be needed internally. That does
**not** make it a user story or acceptance criterion unless the user (or PM)
explicitly cares — e.g. privacy, disk size, GDPR. Otherwise move it to
**`plan.md`** (design decision) or **`tasks.md`** (implementation note).

**`/kb` triage bar:** Can you read the requirement aloud to a non-technical
stakeholder without apologizing? If not, rewrite before `/speckit-specify` or
trim during clarify.

**Specify anti-patterns to delete or demote:**

- ACs about rows, tables, or YAML file operations when the user spoke about UX
- “MAY be removed (orphan cleanup)” as headline requirements
- Measures written as arrow chains through internal layers (`visit binding →
  remove from YAML → sync → no row`)

Keep **Measure/Evidence** technical — but the **WHEN/THEN** must stay in user
outcomes. Integration test paths belong in Evidence, not in the requirement
sentence.

## Ask, don’t assume (mandatory clarify)

**Rule:** If the agent would write an acceptance criterion the user did **not**
imply, **ask one question first** — do not silently add it and mark “Open
Questions: None”.

That applies to **`/kb` triage** (before Create Spec) and **`/speckit-clarify`**
(after specify). Skipping clarify when the spec contains extrapolated edge cases
is a **process failure**, even when the main bug is obvious.

### When you MUST ask (at least one question)

| Trigger                                         | Example extrapolation (don’t assume)                           |
| ----------------------------------------------- | -------------------------------------------------------------- |
| User stated a **happy path** only               | Orphan cleanup when items removed from sources                 |
| **Edge cases** have product meaning             | New items after sync: neutral rank vs inherit something        |
| **Two valid UX** interpretations                | Deleted shortcut: gone from UI only vs also purge usage memory |
| Spec adds AC **#2, #3…** beyond the pain report | SF-1/SF-2 orphan rows in 003                                   |

### 003 pilot — questions that should have been asked

User intake: *“When I sync, I want sources in sync and my frecency/usage to stay
the same.”*

**Minimum one question** (pick one or combine):

1. **Removed items:** “If you delete something from your source files and sync,
   should the app forget you ever used it — or is that not important as long as
   things you still have keep their order?”

2. **New items:** “After sync, should brand-new entries start with no usage
   history (not near the top until you open them)?”

3. **Scope check:** “Is the problem only list order and shortcuts, or also
   something else that resets on sync?”

Until answered: keep **one** preservation AC per surface (list + shortcuts).
Demote deleted/new-item behavior to **`plan.md`** as an open design decision —
not shipped ACs.

### `/kb` and Companion behavior

- **`/kb`:** Ask the question in plain language; do not pre-fill orphan/new-item
  ACs in the intake handed to Specify.
- **Specify:** May draft a *candidate* Open Questions table — must not close it
  as “None” while orphan ACs remain.
- **Clarify:** MUST run when Open Questions exist or when checklist flags
  extrapolated ACs; user answers get encoded in `spec.md` before plan.

Legacy `requirements.md` / `design.md` under `assets/docs/specs/MILESTONE_*` are
reference only. Parity: `mise run spec import-legacy --feature 001-sync-frecency-persistence`.

## Greenfield flow

1. Paste intake ([`_templates/increment-intake.md`](../specs/_templates/increment-intake.md)).
2. Refine seed Gherkin on `assets/features/e2e/<slug>.feature`.
3. Create Spec → `/speckit-specify` → `assets/specs/<NNN-slug>/spec.md` (EARS only).
4. `/speckit-clarify` — **required** when spec adds edge-case ACs the user did not
   state (see [Ask, don’t assume](#ask-dont-assume-mandatory-clarify)).
5. `/speckit-checklist` → `/speckit-plan` → `/speckit-tasks` → `/speckit-kb-handoff`.
6. **`mise run spec audit --strict assets/specs/<NNN-slug>`** then **`/speckit-analyze`** (required before implement).
7. `/speckit-implement` (load `handoff.md`; OpenCode: `--integration opencode` on workflow implement step).
8. **`mise run spec gate assets/specs/<NNN-slug>`** → lint + trace + `gate.sh`.
9. **`mise run spec pr-draft assets/specs/<NNN-slug>`** → push + draft PR → **review-draft** CI (see [CI handoff](#ci-handoff)).

Optional scaffold: `mise run spec feature-init --id 001 --slug my-feature`.

## Deterministic gates (provider-agnostic)

| Command                              | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `mise run spec lint --strict <dir>`  | EARS shape in `spec.md` (`tools/spec/lint.ts`)    |
| `mise run spec trace --strict <dir>` | spec pointer → `.feature` (`tools/spec/trace.ts`) |
| `mise run spec audit --strict <dir>` | handoff + task-order + lint (`tasks_audit.ts`)    |
| `mise run spec gate <dir>`           | lint + trace + `gate.sh`                          |
| `mise run spec pr-draft <dir>`       | gate + push + `gh pr create --draft`              |
| `mise run spec resume`               | `specify workflow resume` after failed workflow   |

`/speckit-analyze` is **required before implement** (workflow analyze-gate). `spec audit` shrinks noise before the LLM pass.

## Workflows (Companion + YAML)

| Tier          | When             | Companion workflow                                                               |
| ------------- | ---------------- | -------------------------------------------------------------------------------- |
| **kb-full**   | New feature      | specify → plan → tasks → handoff → audit → analyze → implement → gate → draft PR |
| **kb-slice**  | Brownfield slice | checklist → tasks → handoff → audit → analyze → implement → gate → draft PR      |
| **kb-hotfix** | 1–3 file fix     | minimal spec → tasks → implement → gate                                          |

YAML: `.specify/workflows/kb-{full,slice,hotfix}/workflow.yml`
Catalog: `.specify/workflow-catalogs.yml`

## Pilot 004 (Phase E — provider + CRG)

When starting the next feature after 003 ships:

| Step                           | Owner                                                          | Success metric                                                                           |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Specify + clarify              | Cursor (`cursor-agent`)                                        | User-shaped spec; clarify if edge ACs appear                                             |
| Plan + tasks + audit + analyze | Cursor                                                         | `mise run spec audit --strict` green; analyze 0 CRITICAL                                 |
| Implement                      | OpenCode (`--integration opencode` on workflow implement step) | Same Evidence tests green without re-explaining stack                                    |
| Review                         | CRG MCP + optional code-reviewer                               | At least one CRG query on touched `src/`                                                 |
| Close                          | Operator                                                       | `mise run spec gate` + `mise run spec pr-draft`; `mise run graph usage-report --days 14` |

Use `mise run spec worktree-add -- <NNN-slug>` for isolated experiments.

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

## CI handoff

Draft PRs run **review-draft** jobs in [`review.yml`](../../.github/workflows/review.yml) (HK hygiene, tests, spec gate on touched `assets/specs/NNN-*` dirs). Full Review runs when the PR is marked **ready for review**.

```bash
mise run spec gate assets/specs/003-sync-frecency-preserve
mise run spec pr-draft assets/specs/003-sync-frecency-preserve
```

See [`CI_GUIDE.md`](CI_GUIDE.md) for the full pipeline.

## Spec Kit packaging (integrations, extensions, presets)

| Mechanism        | kb usage                                                              | Docs                                                                                        |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Integrations** | `cursor-agent` (default) + `opencode` for implement                   | [integrations](https://github.com/github/spec-kit/blob/main/docs/reference/integrations.md) |
| **Extensions**   | `git`, `agent-context`, `kb-workflow` (handoff, preflight, pr-draft)  | [extensions](https://github.com/github/spec-kit/blob/main/docs/reference/extensions.md)     |
| **Presets**      | Not used; prefer `.specify/templates/overrides/` over catalog presets | [presets](https://github.com/github/spec-kit/blob/main/docs/reference/presets.md)           |

Template overrides beat presets and core templates. Cursor skills under `.cursor/skills/speckit-*` are separate from preset resolution.

## Provider routing

Spec Kit integrations installed: **`cursor-agent`** (default) + **`opencode`**.

| Step           | Cursor (Companion)                  | OpenCode (terminal)                 |
| -------------- | ----------------------------------- | ----------------------------------- |
| Specify / plan | `/speckit-specify`, `/speckit-plan` | `/speckit.specify`, `/speckit.plan` |
| Tasks          | `/speckit-tasks`                    | `/speckit.tasks`                    |
| **Implement**  | `/speckit-implement` + `handoff.md` | `/speckit.implement` + `handoff.md` |
| Gate           | `mise run spec gate <dir>`          | same (shell)                        |
| Draft PR       | `mise run spec pr-draft <dir>`      | same (shell)                        |

Workflow implement step: `specify workflow run … --integration opencode` when handing off to OpenCode.

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
