<!-- markdownlint-disable-file -->
# Elysia and Electrobun capability inventory — Requirements

## Introduction

app uses Elysia, Eden Treaty, TypeBox, and Electrobun as architectural
foundations, but the upstream documentation contains more capabilities than the
project currently uses. This spec creates a decision-neutral inventory of those
capabilities so the project can later choose which items belong in the backlog.

The research pass must separate observed facts from product decisions. The
research agent records features, links, current usage, pros, cons, and possible
project touchpoints. The final priority labels such as `MUST-HAVE`,
`NICE-TO-HAVE`, `POSTPONED`, and `MEH` remain undecided until maintainers review
the inventory.

## Out of scope

- Implementing Elysia or Electrobun feature changes.
- Adding dependencies, plugins, telemetry, auth, or new runtime services.
- Changing `app-rpc`, Electrobun skills, or project routing docs.
- Making final backlog priority decisions without maintainer review.
- Treating upstream examples as authoritative over app-specific guides.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement CE-1: Source coverage

### Acceptance criteria

1. WHEN the research starts, THEN the agent SHALL inventory capabilities from
   `https://elysiajs.com/` and `https://blackboard.sh/electrobun/docs/`.
2. WHEN the Elysia docs provide LLM-optimized bundles, THEN the agent SHALL use
   those bundles when available and still preserve canonical page URLs for
   citations.
3. WHEN an upstream page is unreachable, THEN the agent SHALL record the URL,
   access failure, timestamp, and the smallest skipped scope in the inventory.
4. IF a capability appears in both upstream docs and local app skills, THEN the
   agent SHALL record both references.

## Requirement CE-2: Decision-neutral inventory

### Acceptance criteria

1. WHEN a capability is recorded, THEN the agent SHALL include its name,
   ecosystem, source URL, summary, current app usage, pros, cons,
   risks, and candidate project touchpoints.
2. WHEN app fully uses a capability, THEN the agent SHALL set
   `current_usage.status: used` in YAML and render `DONE` as `✔` in the Markdown table.
3. WHEN app does not fully use a capability, THEN the agent SHALL use
   `partial`, `not-used`, `unknown`, or `not-applicable` as appropriate and leave the rendered `DONE` cell empty.
4. WHEN the agent has only weak evidence about current app usage, THEN the agent
   SHALL set `usage_confidence: low` and describe the missing evidence.
5. IF a capability is not relevant to a desktop-local app, THEN the agent SHALL
   still record it when it is prominent upstream, with a short reason in `cons`
   or `notes`.

## Requirement CE-3: Human-owned prioritisation

### Acceptance criteria

1. WHEN the research agent creates `inventory.yml`, THEN every capability SHALL
   use `priority: undecided`.
2. WHEN the research agent writes `report.md`, THEN it SHALL group items by
   ecosystem and area but SHALL NOT assign `MUST-HAVE`, `NICE-TO-HAVE`,
   `POSTPONED`, or `MEH`.
3. IF the research agent sees strong priority signals, THEN it SHALL record them
   under `priority_signals` rather than assigning a final priority.
4. WHEN maintainers later classify a capability, THEN they MAY replace
   `priority: undecided` with one of `must-have`, `nice-to-have`, `postponed`,
   or `meh`.

## Requirement CE-4: Backlog readiness

### Acceptance criteria

1. WHEN a capability has plausible project value, THEN the agent SHALL add at
   least one candidate story title.
2. WHEN a capability primarily reduces technical debt, THEN the agent SHALL add
   a `technical_debt` signal and describe the debt it could reduce.
3. WHEN a capability primarily creates user value, THEN the agent SHALL add an
   `roi` signal and describe the expected value.
4. IF a capability should not become backlog work now, THEN the agent SHALL
   record why without deleting the capability from the inventory.

## Requirement CE-5: Local alignment checks

### Acceptance criteria

1. WHEN evaluating Elysia capabilities, THEN the agent SHALL compare them with
   `app-rpc`, `assets/catalog/SKILLS.yaml`, `assets/guides/ELECTROBUN.md`, and the
   current RPC files under `src/shell/main/rpc/` and `src/shell/renderer/rpc/`.
2. WHEN evaluating Electrobun capabilities, THEN the agent SHALL compare them
   with `electrobun-best-practices`, `.cursor/electrobun-skill-routing.md`,
   `assets/guides/ELECTROBUN.md`, and current files under `src/shell/main/`.
3. WHEN a capability conflicts with app rules, THEN the agent SHALL record the
   conflict and SHALL NOT recommend direct adoption.
4. IF a capability requires network exposure, auth, cloud sync, or production
   telemetry, THEN the agent SHALL mark those prerequisites explicitly.

## Requirement CE-6: Deliverables

### Acceptance criteria

1. WHEN the research pass completes, THEN the agent SHALL produce
   `inventory.yml`, `report.md`, and an updated `tasks.md` ledger.
2. WHEN `inventory.yml` is complete, THEN it SHALL parse as YAML and use the
   schema described in `design.md`.
3. WHEN `report.md` is complete, THEN it SHALL contain a table with `DONE`,
   `Pros`, and `Cons` columns.
4. WHEN the final handoff is complete, THEN maintainers SHALL be able to review
   the inventory and classify priorities without re-scraping the docs.
