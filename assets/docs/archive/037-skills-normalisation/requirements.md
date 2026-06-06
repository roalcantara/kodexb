<!-- markdownlint-disable-file -->

# Skills normalisation — Requirements

## Overview

This spec defines the final no-contradiction schema for
`assets/catalog/SKILLS.yaml`. The registry must describe each skill once, encode
where the skill is materialized with a single `location` field, and encode how
agents treat the skill with one discriminated `policy.type`. The schema must
not allow contradictory combinations such as blocked skills with routing,
project-authored skills recorded in `skills-lock.json`, or optional skills
that are also required.

## Requirements

### R1 — Canonical skill entries

**User story:** As a maintainer, I want each project-relevant skill to have one
canonical registry entry, so that generated docs and Skills CLI restore checks
cannot drift from separate category lists.

#### Acceptance criteria

1. WHEN a skill is represented in `assets/catalog/SKILLS.yaml`
   THEN the registry SHALL define that skill exactly once under `skills`.

2. WHEN a skill entry is validated
   THEN the registry SHALL require `location`, `rationale`, and `policy`.

3. IF a skill appears only in a top-level routing list or category list
   THEN validation SHALL fail.

4. WHEN automation needs skill metadata
   THEN automation SHALL read that metadata from `skills.<skill-id>`.

### R2 — Non-contradictory location

**User story:** As a maintainer, I want one field to describe where a skill is
materialized, so that `source` and `install` cannot contradict each other.

#### Acceptance criteria

1. WHEN a skill is project-authored and lives under `.agents/skills/<skill-id>`
   THEN the registry SHALL use `location: owned`.

2. WHEN a skill is external, managed by the Skills CLI, recorded in
   `skills-lock.json`, and restored into `.agents/skills`
   THEN the registry SHALL use `location: project`.

3. WHEN a skill remains only under `$HOME/.agents/skills`
   THEN the registry SHALL use `location: global`.

4. IF a skill entry contains skill-level `source`, `install`, `link`,
   `decision`, or `load`
   THEN validation SHALL fail.

5. WHEN validation checks `skills-lock.json`
   THEN every lock entry SHALL have a matching registry entry with
   `location: project`.

6. IF a skill has `location: owned` or `location: global`
   THEN validation SHALL fail when that skill appears in `skills-lock.json`.

### R3 — Discriminated policy

**User story:** As a maintainer, I want one policy union to describe how agents
use a skill, so that blocked, routed, optional, reference, and required states
cannot overlap.

#### Acceptance criteria

1. WHEN a skill policy is validated
   THEN `policy.type` SHALL be one of `required`, `routed`, `optional`,
   `reference`, or `blocked`.

2. WHEN `policy.type` is `required`
   THEN `policy.usage` SHALL be present and `policy.routing`,
   `policy.surfaces`, `policy.reason`, and `policy.redirect_to` SHALL be
   absent.

3. WHEN `policy.type` is `routed`
   THEN `policy.usage` and `policy.routing` SHALL be present, and
   `policy.surfaces`, `policy.reason`, and `policy.redirect_to` SHALL be
   absent.

4. WHEN `policy.type` is `optional`
   THEN `policy.usage` SHALL be present, and `policy.routing`,
   `policy.reason`, and `policy.redirect_to` SHALL be absent.

5. WHEN `policy.type` is `reference`
   THEN `policy.usage` SHALL be present, and `policy.routing`,
   `policy.surfaces`, `policy.reason`, and `policy.redirect_to` SHALL be
   absent.

6. WHEN `policy.type` is `blocked`
   THEN `policy.reason` SHALL be present, and `policy.usage`,
   `policy.routing`, and `policy.surfaces` SHALL be absent.

### R4 — Usage contract

**User story:** As an agent, I want usable skills to describe when to load them
with concrete positive and negative examples, so that usage guidance is clear
without repeating policy fields.

#### Acceptance criteria

1. WHEN a policy has `usage`
   THEN `usage.summary` SHALL be a non-empty string.

2. WHEN a policy has `usage`
   THEN `usage.when.load` SHALL be a non-empty list of strings.

3. WHEN a policy has `usage`
   THEN `usage.when.avoid` SHALL be a list of strings.

4. IF `policy.type` is `blocked`
   THEN `usage` SHALL be absent.

5. IF generated documentation needs concise usage copy
   THEN automation SHALL use `policy.usage.summary` unless a
   surface-specific value is explicitly defined.

### R5 — Optional companion surfaces

**User story:** As a maintainer, I want optional companion copy to stay
surface-specific, so that concise `CLAUDE.md` bullets and richer `app-context`
tables can differ without inventing duplicate skill entries.

#### Acceptance criteria

1. WHEN `policy.type` is `optional`
   THEN `policy.surfaces.claude_optional` SHALL be present when the skill must
   appear in the generated `CLAUDE.md` optional companion list.

2. WHEN `policy.type` is `optional`
   THEN `policy.surfaces.app_context_optional` SHALL be present when the skill
   must appear in the generated `app-context` optional companion table.

3. WHEN `mise run skill sync` rewrites `CLAUDE.md`
   THEN the task SHALL use `policy.surfaces.claude_optional` for optional
   companion bullets.

4. WHEN `mise run skill sync` rewrites
   `.agents/skills/app-context/SKILL.md`
   THEN the task SHALL use `policy.surfaces.app_context_optional` for the
   optional companion table.

### R6 — Routed skills

**User story:** As a maintainer, I want routing to live only inside routed
policies, so that generated routing tables cannot point to blocked, optional,
or reference-only skills by accident.

#### Acceptance criteria

1. WHEN `policy.type` is `routed`
   THEN `policy.routing` SHALL be present and non-empty.

2. WHEN an Electrobun route is defined
   THEN it SHALL live under `policy.routing.electrobun`.

3. WHEN an Electrobun route is validated
   THEN the route SHALL include numeric `order` and non-empty `triggers`.

4. WHEN route triggers are validated
   THEN `triggers` SHALL be a list of non-empty strings.

5. IF `policy.type` is not `routed`
   THEN `policy.routing` SHALL be absent.

6. IF the registry contains a top-level `electrobun_routing` key
   THEN validation SHALL fail.

### R7 — Blocked skills and redirects

**User story:** As a maintainer, I want blocked skills to explain why they are
not used and where to redirect when relevant, so that agents do not route to
skills that contradict app.

#### Acceptance criteria

1. WHEN `policy.type` is `blocked`
   THEN `policy.reason` SHALL be a non-empty string.

2. WHEN a blocked skill is covered by project guidance
   THEN `policy.reason` SHALL be `covered_by_project_guides` and
   `policy.redirect_to` SHALL list the project guides or skills to use
   instead.

3. WHEN a blocked skill is incompatible with app
   THEN `policy.reason` SHALL describe the incompatibility category.

4. IF `policy.type` is `blocked`
   THEN `location` SHALL be `global`.

5. IF `policy.type` is `blocked`
   THEN generated routing tables SHALL NOT route to that skill.

### R8 — Derived route status

**User story:** As a maintainer, I want generated route notes to derive common
status from `location`, so that route entries describe routing and not install
state.

#### Acceptance criteria

1. WHEN a routed skill has `location: project`
   THEN the generated Electrobun route note SHALL start with `project`.

2. WHEN a routed skill has `location: owned`
   THEN the generated Electrobun route note SHALL start with `owned`.

3. WHEN a routed skill has `location: global`
   THEN the generated Electrobun route note SHALL start with `global only`.

4. IF a route defines an extra `note`
   THEN the generated route note SHALL append ` - <note>` after the derived
   status.

5. IF a route defines `note: project`, `note: owned`, or `note: global only`
   THEN validation SHALL reject the redundant note.

### R9 — Generated documentation consistency

**User story:** As an agent, I want generated routing snippets to come from
`SKILLS.yaml`, so that `CLAUDE.md`, `app-context`, and Cursor routing docs remain
consistent after registry edits.

#### Acceptance criteria

1. WHEN `mise run skill sync` runs
   THEN the task SHALL validate `assets/catalog/SKILLS.yaml` before writing any
   generated snippet.

2. WHEN `mise run skill sync` rewrites a managed snippet
   THEN the task SHALL write only between the matching
   `<!-- skills:<name>:start -->` and `<!-- skills:<name>:end -->` markers.

3. IF a managed snippet marker is missing
   THEN `mise run skill sync` SHALL fail without silently appending content.

4. WHEN generated snippets are refreshed
   THEN the generated Electrobun routing table SHALL remain semantically
   equivalent to the nested routes in `SKILLS.yaml`.

### R10 — Human guide consistency

**User story:** As a maintainer, I want `assets/guides/SKILLS.md` to explain
the registry schema, so that humans can update `SKILLS.yaml` without reverse
engineering the mise tasks.

#### Acceptance criteria

1. WHEN `SKILLS.yaml` uses `location`
   THEN `assets/guides/SKILLS.md` SHALL explain `owned`, `project`, and
   `global`.

2. WHEN `SKILLS.yaml` uses `policy.type`
   THEN `assets/guides/SKILLS.md` SHALL explain `required`, `routed`,
   `optional`, `reference`, and `blocked`.

3. WHEN `SKILLS.yaml` uses `policy.usage`
   THEN `assets/guides/SKILLS.md` SHALL explain `summary`,
   `when.load`, and `when.avoid`.

4. WHEN route status is derived from `location`
   THEN `assets/guides/SKILLS.md` SHALL explain that route-level notes are only
   for extra context.

5. IF `assets/guides/SKILLS.md` describes skill-level `source`, `install`,
   `link`, `decision`, `load`, or top-level `electrobun_routing` as current behavior
   THEN the guide SHALL be updated before the schema change is complete.

### R11 — Validation and completion checks

**User story:** As a reviewer, I want the schema migration to have clear
verification commands, so that completion can be checked without manual
interpretation.

#### Acceptance criteria

1. WHEN the schema migration is complete
   THEN `mise run skill validate` SHALL pass.

2. WHEN generated snippets are refreshed
   THEN `mise run skill sync` SHALL pass.

3. WHEN project skills are restored
   THEN `mise run skill install` SHALL delegate to `skills experimental_install`.

4. WHEN mise tasks are linted
   THEN `bun run lint:mise` SHALL pass.

5. WHEN changed files are checked for whitespace errors
   THEN `git diff --check -- assets/catalog/SKILLS.yaml assets/guides/SKILLS.md mise.toml CLAUDE.md .agents/skills/app-context/SKILL.md .cursor/electrobun-skill-routing.md` SHALL pass.

6. WHEN the repository is searched for obsolete schema fields
   THEN no active automation SHALL reference skill-level `source`, `install`,
   `link`, `decision`, `load`, top-level `electrobun_routing`, or route-level
   `trigger:`.

## Acceptance

- A1: `assets/catalog/SKILLS.yaml` has one canonical `skills:` entry per skill.
- A2: Every skill entry uses `location` and `policy.type`.
- A3: No skill entry uses skill-level `source`, `install`, `link`,
  `decision`, or `load`.
- A4: Blocked policies cannot contain usage, surfaces, or routing.
- A5: Routed policies must contain routing and cannot be blocked, optional, or
  reference-only.
- A6: Electrobun routing lives under `policy.routing.electrobun`.
- A7: Route notes derive `project`, `owned`, or `global only` from `location`.
- A8: Generated snippets in `CLAUDE.md`,
  `.agents/skills/app-context/SKILL.md`, and
  `.cursor/electrobun-skill-routing.md` are refreshed from `SKILLS.yaml`.
- A9: The project skill set in `skills-lock.json` is represented by
  `location: project` entries in `SKILLS.yaml`.
