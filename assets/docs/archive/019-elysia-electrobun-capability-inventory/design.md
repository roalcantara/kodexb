<!-- markdownlint-disable-file -->
# Elysia and Electrobun capability inventory — Design

## Overview

This spec creates a research pipeline for discovering capabilities in the
upstream Elysia and Electrobun documentation, comparing those capabilities with
app's current architecture, and producing a maintainer-reviewable inventory.

The inventory is not a backlog by itself. It is the evidence layer that lets the
project later choose which capabilities are `MUST-HAVE`, `NICE-TO-HAVE`,
`POSTPONED`, or `MEH`.

## Research sources

The research agent must inspect the current upstream documentation and keep
canonical links in the output.

| Ecosystem  | Primary source                           | Notes                                                                            |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Elysia     | `https://elysiajs.com/`                  | Prefer the LLM bundle when available, then preserve canonical page URLs.         |
| Electrobun | `https://blackboard.sh/electrobun/docs/` | Inventory desktop shell, lifecycle, RPC, build, distribution, and platform APIs. |

Local comparison sources:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-rpc/SKILL.md`
- `.agents/skills/electrobun-best-practices/SKILL.md`
- `.cursor/electrobun-skill-routing.md`
- `assets/catalog/SKILLS.yaml`
- `assets/guides/ELECTROBUN.md`
- `src/shell/main/rpc/`
- `src/shell/renderer/rpc/`
- `src/shell/main/`
- `tools/preview/server.script.ts`

## Inventory schema

`inventory.yml` is the source of truth for the research output. The Markdown
report presents a readable table derived from the same information.

```yaml
version: 1
generated_at: null
sources:
  - id: elysia
    name: Elysia
    root_url: https://elysiajs.com/
    fetched_at: null
    notes: []
  - id: electrobun
    name: Electrobun
    root_url: https://blackboard.sh/electrobun/docs/
    fetched_at: null
    notes: []
capabilities:
  - id: elysia-eden-treaty
    ecosystem: elysia
    area: rpc
    feature: Eden Treaty
    source_urls:
      - https://elysiajs.com/eden/overview.html
    summary: End-to-end typed client for Elysia servers.
    current_usage:
      status: used
      evidence:
        - src/shell/renderer/rpc/client.ts
      confidence: high
    priority: undecided
    priority_signals:
      roi: []
      technical_debt: []
      risk_reduction: []
    pros:
      - Keeps renderer and main RPC types aligned.
    cons:
      - Requires bridge discipline because app does not call a normal HTTP server.
    risks: []
    prerequisites: []
    app_touchpoints:
      - .agents/skills/app-rpc/SKILL.md
      - src/shell/main/rpc/server.ts
    candidate_stories:
      - Harden Eden bridge response and error contracts.
    notes: []
```

## Field rules

The schema keeps adoption decisions consistent and avoids contradictory states.

| Field                      | Rule                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `priority`                 | Must remain `undecided` during the scrape. Maintainers classify it later.                                   |
| `current_usage.status`     | One of `used`, `partial`, `not-used`, `unknown`, or `not-applicable`. `used` renders as `✔` in `report.md`. |
| `current_usage.confidence` | One of `high`, `medium`, or `low`. Use `low` when code evidence is incomplete.                              |
| `priority_signals`         | Holds evidence for later ranking without assigning the final label.                                         |
| `pros` and `cons`          | Short, project-specific bullets. Empty lists are allowed only when the item is purely informational.        |
| `candidate_stories`        | Optional for low-fit items; required when the capability has plausible project value.                       |

## Markdown report shape

`report.md` must be human-readable and review-oriented. It should start with a
short summary, then use one table per ecosystem or area.

Minimum table columns:

| DONE | Ecosystem | Area | Feature     | Current app usage            | Priority  | Pros                         | Cons             | Candidate story        |
| ---- | --------- | ---- | ----------- | ---------------------------- | --------- | ---------------------------- | ---------------- | ---------------------- |
| ✔    | Elysia    | RPC  | Eden Treaty | Used in renderer-main bridge | Undecided | Typed client/server contract | Bridge is custom | Harden bridge contract |

The `Priority` column stays `Undecided` until maintainer review. If an item has
strong signals, put them in prose after the table or in the YAML
`priority_signals` field.

## Research workflow

The research workflow has three passes:

1. **Upstream discovery:** collect capability names, source URLs, and summaries
   from Elysia and Electrobun docs.
2. **Local comparison:** search the app repo for current use, partial use,
   conflicts, or absence.
3. **Backlog shaping:** add pros, cons, risks, prerequisites, and candidate
   story titles while leaving final priority undecided.

This sequence prevents the agent from turning documentation discovery into
premature implementation work.

## Decision model

Maintainers classify capabilities after reviewing `inventory.yml` and
`report.md`.

| Priority       | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `must-have`    | Correctness, security, architectural alignment, or major debt reduction. |
| `nice-to-have` | Clear value, reasonable effort, not urgent.                              |
| `postponed`    | Likely useful later, but blocked by timing, roadmap, or prerequisites.   |
| `meh`          | Interesting, but not worth backlog weight for app.                       |
| `undecided`    | Research complete, maintainer classification pending.                    |

## Validation

Because this spec is documentation and research-only, validation focuses on
parsing and reviewability:

```sh
ruby -e "require 'yaml'; YAML.load_file('assets/docs/archive/elysia-electrobun-capability-inventory/inventory.yml')"
git diff --check -- assets/docs/archive/elysia-electrobun-capability-inventory
```

If the Ruby YAML parser is not available on the host, use any repository
available YAML parser and record the command in `tasks.md`. If the repository
later adds a generic spec validation mise task, it can replace or wrap these
checks.
