# Documentation governance for agentic software development — seek sustainable architecture

## Context

I maintain a TypeScript desktop app (Bun runtime, React renderer, FCIS architecture: pure core / imperative shell / UI). Development is heavily **agent-assisted**: multiple AI agents read repo docs on every task via `AGENTS.md`, `CLAUDE.md`, skills, and guides.

We use **spec-driven development (SDD)** for features:

- **In-flight work:** `assets/docs/specs/NNN-<feature-slug>/` with `requirements.md`, `design.md`, `tasks.md` (EARS requirements, normative design contract, verification checklist).
- **Process / conventions:** `assets/guides/` (FCIS rules, testing, commits, styling, CI, etc.) — intended as timeless, repo-wide norms.
- **Executable acceptance:** `assets/features/e2e/*.feature` (Gherkin) plus some machine contracts (fixture manifests, step catalogs).
- **Onboarding:** root `README.md` (stack, commands, orientation).

We also have ~45 numbered legacy spec folders, a `library_manifest.json` index, and ast-grep rules that **forbid** permanent agent entrypoints (`AGENTS.md`, guides, skills, README) from linking into `assets/docs/*` — because agents were treating scratchpad specs as a second source of truth.

## The problem

When a feature **ships** (tasks all done), we still need discoverable answers to:

1. **Product behaviour** — e.g. keyboard matrix: ⌘P command palette vs ⌘K filter, mutual exclusion, Enter/snapshot semantics.
2. **Implementation contract** — e.g. flat `filterRows` order, util function names, file touch points, rename migrations, focus restore timing.

Today this detail lives in **spec `design.md` files**, and some product rules were duplicated in **README** tables. Agents discover specs via rogue inbound links; delinking fixes policy but **hides** implementor detail unless we promote it somewhere.

We rejected putting shipped feature detail into **`assets/guides/`** because guides should answer **“how we work on any future feature”** (abstract, timeless), not **“how this specific shipped feature was built”** (concrete, past). README will grow unbounded if it holds every feature matrix.

We need a **sustainable governance model** for:

- Where each document type lives over its lifecycle (draft → active → shipped → archived).
- What agents are allowed to link to by default vs only when a task names a slug.
- How to avoid **dual normative copies** (same rules in spec + guide + README).
- How to index/list shipped features so agents do not hunt folders blindly.
- What to do with handoffs, completed `tasks.md`, superseded specs (e.g. feature B replaces feature A).

## Constraints (non-negotiable)

- Agents must have **one clear routing path**: “need process?” vs “need shipped feature X?” vs “implementing in-flight feature Y?”
- **Permanent docs must not link to in-flight scratchpad specs** (`assets/docs/specs/*`) as entrypoints.
- **Guides stay abstract** — no mixing shipped feature implementation encyclopedias into process guides.
- **README stays onboarding-sized** — not a full product encyclopedia.
- Prefer **machine-checkable** rules where possible (lint, ast-grep, manifest, ship gate in Definition of Done).
- We already have: Spec Kit direction (`assets/specs/` for new work), BDD features, quality gates, conventional commits.

## Example (concrete)

Feature `014-command-palette-filter-ux` is **shipped**. Its `design.md` contains implementor detail not fully summarized in README. README currently links to spec files (broken/stale paths). Tasks explicitly said “behaviour matrix lives in README” during build, but that was a **phase decision**, not necessarily the long-term architecture.

Questions this example raises:

- Should shipped `design.md` remain authoritative in place (with better indexing)?
- Should it move to a new tree (e.g. `assets/built/`, `assets/catalog/`, `docs/as-built/`)?
- Should product behaviour live in Gherkin only, prose record only, or both?
- What happens to the original spec folder after promotion — delete, stub, archive?

## What I want from you

Propose **2–4 governance architectures** (not just folder names) for agentic workflows. For each option:

1. **Document layers** — what each layer is for, audience, mutability, typical file types.
2. **Lifecycle** — in-flight → shipped → superseded/archived (who moves what, when).
3. **Agent routing** — what `AGENTS.md` / skills should say (“read X first, then Y only if…”).
4. **Index / catalog** — how agents list features and find the right record without scanning 45 folders.
5. **Duplication policy** — how to prevent spec + README + guide drift.
6. **Enforcement** — ship gates, lint rules, manifest fields, optional telemetry.
7. **Tradeoffs** — maintenance cost, agent token cost, human readability, migration pain.

Compare to known patterns where relevant:

- As-built / baseline documentation (IEEE/ISO)
- ADR vs RFC vs architecture docs
- Backstage / service catalog
- arc42 section separation
- Inner-source RFC → merged → archive
- Docs-as-code + “golden paths” vs “reference implementations”
- BDD as living specification vs prose design records

**Do not assume our repo layout is correct.** If a simpler model works (e.g. single catalog + stub everything else), say so.

End with a **recommended default** for a small team (~1–3 humans, many agents) and a **minimal migration sequence** (first 3 steps, no big-bang).

Optional: suggest a **controlled vocabulary** for migration CSV columns like `target` (where content lands) and `handle` (scratchpad | promote | merge | stub | delete | index | keep).
