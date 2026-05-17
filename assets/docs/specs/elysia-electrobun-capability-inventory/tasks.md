<!-- markdownlint-disable-file -->
# Elysia and Electrobun capability inventory — Tasks

## Overview

Use this task list to create a decision-neutral capability inventory for
Elysia and Electrobun. The output must help maintainers decide what becomes
backlog work, but it must not make final priority decisions on their behalf.

Before starting, load:

- `.agents/skills/kb-context/SKILL.md`
- `.agents/skills/kb-rpc/SKILL.md`
- `.agents/skills/electrobun-best-practices/SKILL.md`
- `docs-writer`
- `subagent-driven-development`
- `elysia` or `elysiajs` as upstream reference only

## Phase workflow

For each phase:

1. Read the phase and its referenced requirements.
2. Make only research and documentation changes.
3. Update `inventory.yml` before updating `report.md`.
4. Keep every capability at `priority: undecided`.
5. Record unresolved questions in the phase notes.
6. Stop and report if scraping becomes blocked, unexpectedly slow, or starts
   requiring implementation decisions.

## Task ledger

| Phase | Goal                                             | Status | Verification                                                   |
| ----- | ------------------------------------------------ | ------ | -------------------------------------------------------------- |
| 0     | Confirm research scope and schema                | Done   | YAML scaffold validated 2026-05-18                             |
| 1     | Inventory Elysia capabilities                    | Done   | 41 Elysia entries; coverage addendum 2026-05-22                |
| 2     | Inventory Electrobun capabilities                | Done   | 28 Electrobun entries; coverage addendum 2026-05-22           |
| 3     | Compare capabilities with kb usage               | Done   | Evidence statuses refreshed; unknowns marked 2026-05-22       |
| 4     | Render report and backlog candidates             | Done   | `report.md` generated from `inventory.yml` 2026-05-22         |
| 5     | Review completeness and hand off priority review | Done   | YAML parse + neutrality + diff checks 2026-05-22              |

## Phase 0 — Confirm scope and schema

**Goal:** Make sure the research output shape is ready before scraping.

- [x] 0.1 Read the spec files.
  - Execute exactly:

    ```sh
    sed -n '1,240p' assets/docs/specs/elysia-electrobun-capability-inventory/requirements.md
    sed -n '1,260p' assets/docs/specs/elysia-electrobun-capability-inventory/design.md
    sed -n '1,220p' assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml
    ```

  - Confirm that `inventory.yml` contains `sources` and an empty
    `capabilities` list.
  - _Acceptance criteria: CE-6.2_

- [x] 0.2 Validate the empty YAML scaffold.
  - Execute exactly:

    ```sh
    ruby -e "require 'yaml'; YAML.load_file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml')"
    ```

  - If Ruby is unavailable, use the project-available YAML parser and record
    the replacement command in this task.
  - _Acceptance criteria: CE-6.2_

## Phase 1 — Inventory Elysia capabilities

**Goal:** Capture Elysia capabilities with canonical links and no final
priorities.

- [x] 1.1 Scrape the Elysia documentation.
  - Review:
    - `https://elysiajs.com/`
    - `https://elysiajs.com/llms.txt`
    - `https://elysiajs.com/llms-full.txt`
  - Include at least these areas when present:
    - best practices
    - routing and handlers
    - TypeBox and validation
    - Eden Treaty
    - error handling
    - OpenTelemetry
    - TypeScript type performance
    - CORS
    - JWT
    - bearer auth
    - AI SDK integration
    - OpenAPI
    - plugins and macros
  - _Acceptance criteria: CE-1.1, CE-1.2_

- [x] 1.2 Add Elysia capabilities to `inventory.yml`.
  - For every item, set:
    - `ecosystem: elysia`
    - `current_usage.status` reflects local evidence (`used` only when fully adopted)
    - `priority: undecided`
    - `pros`, `cons`, `risks`, and `candidate_stories`
  - Do not assign `must-have`, `nice-to-have`, `postponed`, or `meh`.
  - _Acceptance criteria: CE-2.1, CE-3.1, CE-3.3, CE-4.1_

## Phase 2 — Inventory Electrobun capabilities

**Goal:** Capture Electrobun capabilities with canonical links and no final
priorities.

- [x] 2.1 Scrape the Electrobun documentation.
  - Review:
    - `https://blackboard.sh/electrobun/docs/`
  - Include at least these areas when present:
    - app lifecycle
    - BrowserWindow and BrowserView
    - RPC
    - native UI
    - menus and tray
    - file dialogs
    - platform behavior
    - security posture
    - development workflow
    - build and distribution
    - signing and notarization
  - _Acceptance criteria: CE-1.1, CE-1.3_

- [x] 2.2 Add Electrobun capabilities to `inventory.yml`.
  - For every item, set:
    - `ecosystem: electrobun`
    - `current_usage.status` reflects local evidence (`used` only when fully adopted)
    - `priority: undecided`
    - `pros`, `cons`, `risks`, and `candidate_stories`
  - Do not assign `must-have`, `nice-to-have`, `postponed`, or `meh`.
  - _Acceptance criteria: CE-2.1, CE-3.1, CE-3.3, CE-4.1_

## Phase 3 — Compare capabilities with kb usage

**Goal:** Mark what kb already uses and identify conflicts or prerequisites.

- [x] 3.1 Check Elysia usage locally.
  - Execute exactly:

    ```sh
    rg -n "Elysia|treaty|@elysia|eden|TypeBox|onError|error\\(|openapi|cors|jwt|bearer|opentelemetry|ai-sdk" src tools package.json assets/guides .agents/skills
    ```

  - Set `current_usage.status: used` only when the capability is fully adopted in kb.
  - Set `current_usage.confidence` to `low` when evidence is ambiguous.
  - _Acceptance criteria: CE-2.2, CE-2.3, CE-2.4, CE-5.1_

- [x] 3.2 Check Electrobun usage locally.
  - Execute exactly:

    ```sh
    rg -n "Electrobun|BrowserWindow|BrowserView|Electroview|defineRPC|tray|menu|native|notar|sign|window|view" src tools package.json assets/guides .agents/skills .cursor
    ```

  - Set `current_usage.status: used` only when the capability is fully adopted in kb.
  - Record conflicts with kb-specific Electrobun guidance.
  - _Acceptance criteria: CE-2.2, CE-2.3, CE-2.4, CE-5.2, CE-5.3_

- [x] 3.3 Record prerequisites.
  - For every item involving network exposure, auth, cloud sync, observability,
    build distribution, or platform entitlements, add explicit prerequisites.
  - Auth/JWT/bearer, OpenTelemetry, AI SDK, CORS, signing, updates, and
    cross-platform entries now list prerequisites in `inventory.yml`.
  - _Acceptance criteria: CE-5.4_

## Phase 4 — Render report and backlog candidates

**Goal:** Create the maintainer-review view.

- [x] 4.1 Update `report.md`.
  - Render a table with these columns:
    - `DONE`
    - `Ecosystem`
    - `Area`
    - `Feature`
    - `Source`
    - `Current kb usage`
    - `Priority`
    - `Pros`
    - `Cons`
    - `Candidate story`
  - Render `DONE` as `✔` only when `current_usage.status` is `used`.
  - Render every priority as `Undecided`.
  - _Acceptance criteria: CE-2.2, CE-2.3, CE-3.2, CE-6.3_

- [x] 4.2 Add backlog candidate table.
  - Include candidate stories with ROI, technical debt, risk reduction, and
    prerequisites.
  - Keep final priority undecided.
  - _Acceptance criteria: CE-4.1, CE-4.2, CE-4.3, CE-4.4_

## Phase 5 — Review completeness and hand off priority review

**Goal:** Confirm the inventory can be reviewed without another scrape.

- [x] 5.1 Validate the YAML.
  - Execute exactly:

    ```sh
    ruby -e "require 'yaml'; YAML.load_file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml')"
    ```

  - _Acceptance criteria: CE-6.2_

- [x] 5.2 Check decision neutrality.
  - Execute exactly:

    ```sh
    rg -n "priority: (must-have|nice-to-have|postponed|meh)|MUST-HAVE|NICE-TO-HAVE|POSTPONED|MEH" assets/docs/specs/elysia-electrobun-capability-inventory
    ```

  - The only allowed matches are the definitions in `requirements.md`,
    `design.md`, `tasks.md`, `handoff.md`, and the priority legend in
    `report.md`. No capability entry may use a final priority.
  - _Acceptance criteria: CE-3.1, CE-3.2_

- [x] 5.3 Run spec validation.
  - Execute exactly:

    ```sh
    ruby -e "require 'yaml'; y=YAML.load_file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml'); puts [y['capabilities'].length, y['generated_at'].class, y['sources'].first['fetched_at'].class].join(' | ')"
    git diff --check -- assets/docs/specs/elysia-electrobun-capability-inventory
    ```

  - Also run the Bun schema-shape check (array fields on every capability):

    ```sh
    bun - <<'JS'
    import YAML from 'yaml'
    const doc = YAML.parse(await Bun.file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml').text())
    const issues = []
    for (const c of doc.capabilities ?? []) {
      for (const k of ['source_urls','pros','cons','risks','prerequisites','kb_touchpoints','candidate_stories','notes']) {
        if (!Array.isArray(c[k])) issues.push(`${c.id}.${k} is ${typeof c[k]}`)
      }
    }
    console.log(JSON.stringify({ capabilities: doc.capabilities.length, issues }, null, 2))
    JS
    ```

  - Result: 69 capabilities; dates parse as `String`; schema-shape `issues: []`; `git diff --check` clean (2026-05-22).
  - Source URL check: 72 unique `source_urls`; unreachable links `[]` (2026-05-22).
  - `report.md` re-rendered with Elysia and Electrobun markdown tables after the coverage addendum (CE-6.3); backlog section kept below tables.
  - _Acceptance criteria: CE-6.1, CE-6.4_
