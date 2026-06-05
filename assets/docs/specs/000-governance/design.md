<!-- markdownlint-disable-file -->

# Documentation governance — design (kb default)

Normative contract for how shipped features, executable tests, and in-flight SDD relate. Question: [requirements.md](requirements.md). Comparison of external proposals: [summary_01.md](summary_01.md).

## Problem (one sentence)

In-flight specs are **workspaces** under **`assets/specs/`**; shipped truth lives in **executables + catalog index** — not in README, guides, legacy doc trees, or prose beside tests.

## Document layers

| Layer              | Path                                   | Purpose                                                                                                  | Mutability                     | Audience             |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------- |
| **Process**        | `assets/guides/`                       | How we work on any feature (FCIS, testing policy, commits)                                               | Stable                         | All agents           |
| **Catalog**        | [`assets/catalog/`](../../../catalog/) | Shipped feature registry (`catalog.yaml`) and agent skill registry (`SKILLS.yaml`) — YAML only, no prose | Updated on ship / skill policy | All agents           |
| **Gherkin**        | `assets/features/*.feature`            | Product-visible behaviour (executable)                                                                   | Evolves with product           | Agents + CI          |
| **Unit/component** | `src/**/*.spec.ts(x)`                  | Implementation contracts (executable)                                                                    | Co-located with code           | Agents + CI          |
| **In-flight SDD**  | **`assets/specs/NNN-<slug>/`**         | Spec Kit workspace (`spec.md`, `plan.md`, `tasks.md`) while building                                     | High                           | Task-named slug only |
| **Legacy SDD**     | `assets/docs/specs/NNN-<slug>/`        | Pre–Spec Kit folders; **stub after ship** (archaeology only)                                             | Frozen when stubbed            | Explicit slug only   |
| **Onboarding**     | `README.md`                            | Stack, commands, link to catalog                                                                         | Minimal                        | Humans + agents      |

### Why `assets/catalog/` is a folder

- **Namespace consistency** with `assets/guides/` and `assets/features/` — one product concern per tree.
- **Boundary** — shipped index lives outside `assets/docs/` so agents do not confuse it with SDD scratchpads.

The catalog folder is **not** for feature or skill prose. It holds **YAML registries only** — [`catalog.yaml`](../../../catalog/catalog.yaml) (shipped features) and [`SKILLS.yaml`](../../../catalog/SKILLS.yaml) (agent skills), plus optional meta [`README.md`](../../../catalog/README.md) that documents the schema — not feature or skill rules. There is **no** `records/` tree and **no** per-feature markdown in catalog.

## Dual executable source of truth

PRD / requirements (in-flight under `assets/specs/`) are implemented in **code** and asserted by **two peer executables** — not by prose duplicates.

| Scope                                          | Owner                           | Example (014)                       |
| ---------------------------------------------- | ------------------------------- | ----------------------------------- |
| User-visible behaviour, release acceptance     | **Gherkin** (`.feature`)        | ⌘P sections, filter overlay smoke   |
| Algorithms, utils, hooks, component edge cases | **Unit/component** (`.spec.ts`) | `filterRows` order, clipboard toast |
| Cross-cutting repo rules                       | **Guides** + tool configs       | TypeBox, FCIS imports               |

**Rules**

1. Every normative requirement line must map to **`gherkin` | `test` | `type` | `astgrep`** before ship.
2. **`enforced_by: none` is a ship blocker** — add Gherkin or unit coverage; do **not** add catalog prose as a workaround.
3. Release-facing behaviour must have Gherkin coverage (R11); implementation detail must have co-located specs.
4. Not every rule needs **both** Gherkin and unit — use the [testing pyramid](../../../guides/TESTING_GUIDE.md).
5. Catalog **indexes** shipped features and declares the run tag via key — never lists executable paths or restates rules.

## Tag linking (catalog key = run tag)

Each catalog **key** is the single run tag: **`@<key>`** (e.g. key `command_palette` → tag `@command_palette`). There is **no** separate `tags.run`, **no** `tags.trace`, and **no** legacy `@spec:<slug>` on shipped features — one identifier only.

| Surface                  | Convention                     | Example                                    |
| ------------------------ | ------------------------------ | ------------------------------------------ |
| Catalog YAML key         | `snake_case` stable product id | `command_palette`                          |
| Gherkin Feature line     | Cucumber tag `@<key>`          | `@command_palette`                         |
| Unit/component spec file | Comment on line 1              | `// @command_palette`                      |
| CLI                      | key or tag (equivalent)        | `mise run test tag command_palette --list` |

**Commands**

```bash
mise run catalog list
mise run test tag --list                              # all catalog keys + tagged executables
mise run test tag command_palette --list              # or @command_palette
mise run test tag command_palette --list --e2e
mise run test tag command_palette --list --unit
mise run test tag command_palette                     # run unit + e2e (default)
mise run test tag command_palette --e2e
mise run test tag command_palette --unit
mise run test tag key1 key2 --list                      # union (multi-key)
```

Implementation: [`tools/mise/test.script.ts`](../../../../tools/mise/test.script.ts) (tag list/run), [`tools/mise/catalog.script.ts`](../../../../tools/mise/catalog.script.ts) (registry list). Domain libs: [`tools/catalog/`](../../../../tools/catalog/).

**Catalog key rules**

- **Stable after ship** — supersede with a new key + `superseded_by`; do not rename shipped keys.
- **Grep-safe** — avoid short keys that collide under Playwright `--grep` (e.g. prefer `command_palette` over `sync`).
- **Legacy `@spec:<slug>`** — deprecated for new work; remove when promoting a feature to catalog (do not list in catalog YAML).

## Catalog schema (`assets/catalog/catalog.yaml`)

YAML map keyed by **canonical feature id** (`snake_case`, stable product name — not NNN prefix). **Registry only** — no file path lists. Which Gherkin and unit files belong to a feature is determined **only** by the `@<key>` tag on those files; `mise run test tag <key> --list` greps the repo.

```yaml
command_palette:
  title: Command palette and filter UX
  status: shipped # shipped | active | superseded | archived
  specs:
    - 014-command-palette-filter-ux
  superseded_by: null
```

Run tag: **`@command_palette`** (derived from key — not stored in YAML).

Fields:

| Field           | Required | Meaning                                                                                                             |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `title`         | yes      | Human label                                                                                                         |
| `status`        | yes      | Lifecycle (see below)                                                                                               |
| `specs`         | yes      | Legacy NNN-slug under `assets/docs/specs/` (stubbed after ship) or Spec Kit slug under `assets/specs/` while active |
| `superseded_by` | optional | Canonical id of replacement feature                                                                                 |

**Forbidden:** `features`, `units`, `record`, prose fields, or markdown files that describe behaviour or duplicate path lists — tags are the membership source; path lists drift.

**Tag placement (membership contract)**

| Artifact  | Where to tag                          |
| --------- | ------------------------------------- |
| Gherkin   | Feature line: `@command_palette`      |
| Unit spec | Line 1 comment: `// @command_palette` |

**Ship gate check:** `mise run test tag <key> --list` must list every file you expect — if a file is missing, add the tag (do not edit catalog paths).

## Lifecycle

```txt
draft → active (assets/specs/NNN-slug/  — Spec Kit)
  ↓ ship (DoD gate)
promote → catalog.yaml entry + tags on Gherkin + units
  ↓
legacy assets/docs/specs/NNN-slug/ stubbed (if present) — archaeology only
  ↓ superseded
superseded_by set in catalog
```

**Ship gate (Definition of Done)**

Before `status: shipped` in catalog:

- [ ] `catalog.yaml` entry (metadata only); Gherkin + units tagged `@<key>`
- [ ] Gherkin tagged; scenarios cover release-facing behaviour
- [ ] Unit specs tagged; implementation contracts asserted
- [ ] PRD/requirements trace: **no** `enforced_by: none` (every rule in Gherkin and/or unit tests)
- [ ] Spec folder stubbed; no permanent doc links to spec bodies
- [ ] `mise run test tag <catalog-key> --list` lists expected artifacts

## Agent routing

| Need                                | Read                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| Process / conventions               | `assets/guides/`                                         |
| What shipped features exist         | `mise run catalog list` or `assets/catalog/catalog.yaml` |
| Run or find all tests for a feature | `mise run test tag <catalog-key> --list`                 |
| Product behaviour                   | Gherkin files tagged `@<key>` (via `test tag --list`)    |
| Implementation detail               | Unit specs tagged `@<key>` (via `test tag --list`)       |
| In-flight feature Y (Spec Kit)      | **`assets/specs/NNN-Y/`** **only when task names slug**  |
| Legacy SDD archaeology              | `assets/docs/specs/NNN-Y/` **only when task names slug** |

Permanent docs may link to **`assets/catalog/`** and **`assets/guides/`**. They **must not** link to `assets/docs/specs/*` or in-flight `assets/specs/*` bodies from entrypoints.

## Duplication policy

- One normative owner per fact: **Gherkin, unit assertion, type, or lint rule** — not catalog prose, not legacy `design.md` after ship.
- Catalog registers shipped features (title, status, spec slug) — does not list executable paths; tags declare membership.
- README: onboarding + pointer to catalog — not feature matrices.

## Gherkin path migration

**Target:** `assets/features/*.feature` (drop redundant `e2e/` segment; runner remains Playwright BDD under `e2e/`).

**Current:** `assets/features/e2e/*.feature` until migration PR updates `playwright.config.ts`, Spec Kit trace defaults, and references.

Do not big-bang; move when touching playwright or catalog entry for a feature.

## Promotion / migration CSV vocabulary

| `handle`     | Action                                                    |
| ------------ | --------------------------------------------------------- |
| `promote`    | Add/update `catalog.yaml` entry; tag Gherkin + units      |
| `stub`       | Replace spec `design.md` body with pointer to catalog key |
| `scratchpad` | In-flight only; no inbound links                          |
| `merge`      | Cross-cutting content → guides only                       |
| `index`      | Catalog row only                                          |
| `delete`     | Remove throwaway docs                                     |

| `enforced_by`      | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `gherkin`          | Covered by `.feature`                                                |
| `test`             | Covered by `.spec.ts`                                                |
| `type` / `astgrep` | Static enforcement                                                   |
| `none`             | **Ship blocker** — add Gherkin or unit test; never add catalog prose |

## Related patterns (external)

Comparable ideas from agentic systems research and product engineering. Full comparison context: [Elicit research agent — AshPL / executable plans (YouTube)](https://youtu.be/qOjleN2-50c?si=d317IVjqbO-xf95S).

### Shared thesis

In high-stakes or agent-heavy work, **the mechanism matters as much as the output**: processes must be legible, iterable without drift, and executed faithfully. Elicit encodes research plans as **AshPL** (a constrained, interpreted program). kb encodes shipped product truth as **existing CI executables** (Gherkin + unit tests) indexed by catalog + `@<key>` tags.

### What kb adopts (without a custom DSL)

| Idea (Elicit / literature)                  | kb expression                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Plan as executable artifact, not prose      | Gherkin scenarios + co-located `.spec.ts(x)`; `enforced_by: none` blocks ship                |
| Legibility / observability of mechanism     | `mise run test tag <key> --list` lists all tagged executables; ship gate expects this output |
| Rigor and provenance over narrative speed   | Dual executable SOT; catalog registry has **no** path lists or feature prose                 |
| Bounded notation (predictable execution)    | Tags + grep discovery; forbidden dual indexes (`@spec:*`, YAML path lists, catalog records)  |
| Separation of evolving plan vs verified run | In-flight `assets/specs/` (Spec Kit) vs shipped tests + stubbed legacy                       |
| Faithful re-execution                       | CI re-runs tagged tests; `mise run test tag <key>` runs the same set locally                 |

### What kb explicitly rejects

| Approach                                                    | Why not for kb                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Custom DSL + interpreter (AshPL)                            | Product domain is bounded; Gherkin, `bun:test`, TypeBox, ast-grep already run in CI                                   |
| Agent rewrites the plan every session                       | Shipped contracts must stay stable in git; agents extend tests, not replace notation per task                         |
| Event-sourced session replay + content-addressed step cache | Valuable for open-ended research sessions; out of scope until multi-step agent orchestration is a product requirement |
| Visual plan generated from DSL source                       | Future option: diagram from `test tag --list` / `catalog validate` output — not a separate language                   |

### Borrowed next steps (from this line of thinking)

1. **`catalog validate`** — orphan `@<key>` tags, shipped catalog rows with zero grep hits, forbidden tag placement drift.
2. **Ship provenance** — attach `test tag <key> --list --json` output (or CI artifact) to promotion PR / DoD checklist.
3. **Supersession as lifecycle event** — `superseded_by` triggers tag migration + legacy stub, not silent catalog edits.

Prior multi-model governance comparison: [summary_01.md](summary_01.md). Agent skill registry: [`assets/catalog/SKILLS.yaml`](../../../catalog/SKILLS.yaml).

## Pilot

Feature: **command_palette** (spec `014-command-palette-filter-ux`). See [catalog.yaml](../../../catalog/catalog.yaml). External review: [review_prompt.md](review_prompt.md).

Steps: [summary_01.md § Minimal migration](summary_01.md#minimal-migration-revised).
