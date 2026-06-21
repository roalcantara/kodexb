# Document authority (normative)

Where rules and feature specs live, and what may link to what.

**Agent entrypoint:** [`README.md`](README.md) — guide router and product snapshot (read before legacy or in-flight specs).

## Hard rules

1. **Project rules** (every PR, every agent) live only in **`assets/guides/`** (and tool configs they reference: `biome.jsonc`, `hk.pkl`, etc.).
2. **In-flight feature SDD** (Spec Kit) lives only in **`assets/specs/NNN-<slug>/`** — for the person implementing that feature; open **only when the task names that slug**.
3. **Shipped feature registry** lives in **`assets/catalog/catalog.yaml`** — YAML metadata only (`title`, `status`, `specs`, `superseded_by`). **No** path lists, **no** per-feature prose. Membership = `@<catalog_key>` on Gherkin/units. Governance: **this file** § Catalog governance.
4. **Legacy SDD** under **`assets/docs/archive/NNN-<slug>/`** is archaeology (stubbed after ship). Not an agent entrypoint.
5. A workspace spec may **link out** to a guide or the catalog (one pointer, no copy). Guides **must not** link into `assets/docs/*`.
6. **No permanent doc** (`AGENTS.md`, `CLAUDE.md`, `README.md`, `assets/guides/**`, `.agents/skills/**`, `.cursor/rules/**`) may reference `assets/docs/*`. Enforced by ast-grep (`tools/governance/policies/ast-grep/no-inbound-assets-docs-*.rule.yml`).

## Hard-rule location

All hard-rule statements about Spec Kit paths and document authority are
defined only in `assets/guides/`.

- Files outside `assets/guides/` may reference feature paths for runtime
  operation, tests, examples, and command usage.
- Files outside `assets/guides/` must not define new normative path policy.
- When in doubt, defer to this guide and
  [`WORKFLOW_SDD_GUIDE.md`](WORKFLOW_SDD_GUIDE.md).

## In-flight specs are ephemeral

`assets/specs/NNN-<slug>/` is an in-flight workspace, not a stable API.
Treat every folder there as temporary implementation context that may be
renamed, archived, or removed after ship.

### Required behavior

1. Runtime code, tests, and tooling must not hardcode specific
  `assets/specs/<slug>/...` paths as durable references.
2. Use feature-dir inputs, shared path loaders, or fixtures instead:
  `packages/ops/src/governance/support/catalog_paths.script.ts` (`specs_root`),
  `packages/ops/src/__tests__/fixtures/` for governance/ops tests, and
  `tools/__tests__/fixtures/` for workflow smoke fixtures.
3. Keep normative path policy in guides only. Any file outside
  `assets/guides/` may show operational examples, but may not define
  authority.

### Non-examples (do not do this)

- Embedding `assets/specs/003-sync-frecency-preserve` in a test expectation.
- Linking a permanent policy file to one specific in-flight slug.
- Treating `assets/specs/` content as the shipped source of truth.

### Preferred patterns

- Pass `--feature <dir>` at runtime; do not infer one slug in code.
- Resolve default roots from catalog/config loaders.
- Use fixture roots under `packages/ops/src/__tests__/fixtures/` (governance) or
  `tools/__tests__/fixtures/` (workflow smoke) in tests — not live `assets/specs/NNN-*` slugs.

### Guardrail

- ast-grep enforces hardcoded-slug prevention in TS/JS via
  `tools/governance/policies/ast-grep/no-hardcoded-assets-specs-slug-ts.rule.yml`.

## Document layers

| Layer              | Path                              | Purpose                                                                                                  |
| ------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Process**        | `assets/guides/`                  | How we work on any feature (FCIS, testing policy, commits, tools taxonomy)                               |
| **Catalog**        | `assets/catalog/`                 | Shipped feature + skill registries (`catalog.yaml`, `library.yaml`, `SKILLS.yaml`) — YAML only, no prose |
| **Gherkin**        | `assets/features/*.feature`       | Product-visible behaviour (executable)                                                                   |
| **Unit/component** | `src/**/*.spec.ts(x)`             | Implementation contracts (executable)                                                                    |
| **In-flight SDD**  | `assets/specs/NNN-<slug>/`        | Spec Kit workspace while building                                                                        |
| **Legacy SDD**     | `assets/docs/archive/NNN-<slug>/` | Pre–Spec Kit folders; stub after ship                                                                    |
| **Onboarding**     | `README.md`                       | Stack, commands, link to catalog                                                                         |

`assets/catalog/` holds **YAML registries only** — not feature prose, not tools layout. Tools
automation taxonomy: [`TOOLS_GUIDE.md`](TOOLS_GUIDE.md).

## Executable source of truth (peer layers)

| Scope                            | Owner                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| User-visible / release behaviour | **Gherkin** — `assets/features/**/*.feature` (target layout: `assets/features/*.feature`)          |
| Implementation contracts         | **Unit/component specs** — `src/**/*.spec.ts(x)`                                                   |
| Process                          | **Guides**                                                                                         |
| Shipped registry (what exists)   | `assets/catalog/catalog.yaml` + `mise run catalog list` / `mise run test tag <catalog-key> --list` |

Every shipped rule must live in **Gherkin and/or unit tests** (or types/lint). Catalog **registers** shipped features; `@<catalog_key>` tags **declare** membership (via `test tag --list`). `enforced_by: none` is a **ship blocker**, not an excuse for prose.

## Catalog governance

### Dual executable source of truth

PRD / requirements (in-flight under `assets/specs/`) are implemented in **code** and asserted by
**two peer executables** — not by prose duplicates.

| Scope                                          | Owner                           |
| ---------------------------------------------- | ------------------------------- |
| User-visible behaviour, release acceptance     | **Gherkin** (`.feature`)        |
| Algorithms, utils, hooks, component edge cases | **Unit/component** (`.spec.ts`) |
| Cross-cutting repo rules                       | **Guides** + tool configs       |

**Rules**

1. Every normative requirement line must map to **`gherkin` | `test` | `type` | `astgrep`** before ship.
2. **`enforced_by: none` is a ship blocker** — add Gherkin or unit coverage; do **not** add catalog prose as a workaround.
3. Release-facing behaviour must have Gherkin coverage (R11); implementation detail must have co-located specs.
4. Catalog **indexes** shipped features — never lists executable paths or restates rules.

### Tag linking (catalog key = run tag)

Each catalog **key** is the single run tag: **`@<key>`** (e.g. `command_palette` → `@command_palette`).

| Surface                  | Convention                       |
| ------------------------ | -------------------------------- |
| Catalog YAML key         | `snake_case` stable product id   |
| Gherkin Feature line     | Cucumber tag `@<key>`            |
| Unit/component spec file | Comment on line 1                |
| CLI                      | `mise run test tag <key> --list` |

```bash
mise run catalog list
mise run test tag --list
mise run test tag command_palette --list
mise run test tag command_palette
```

Implementation: `bin/test.script.ts`, `bin/catalog.script.ts`; domain libs under
`tools/governance/registries/catalog/`.

**Catalog key rules:** stable after ship; grep-safe names; legacy `@spec:<slug>` deprecated for new work.

### Library index schema (`assets/catalog/library.yaml`)

Tool-generated index of legacy SDD archive folders. **Do not hand-edit.**

```yaml
archive_root: assets/docs/archive
generated_at: "2026-06-06T16:30:00.000Z"
entries:
  - nnn: "001"
    slug: foundation
    folder: 001-foundation
    birth_iso: "2026-05-08 16:30:15 -0300"
```

| Field                 | Required | Meaning                            |
| --------------------- | -------- | ---------------------------------- |
| `archive_root`        | yes      | Parent directory for all entries   |
| `generated_at`        | yes      | ISO-8601 timestamp of regeneration |
| `entries[].nnn`       | yes      | Three-digit sort key               |
| `entries[].slug`      | yes      | Feature name slug                  |
| `entries[].folder`    | yes      | `NNN-slug` directory name          |
| `entries[].birth_iso` | yes      | Git birth or mtime fallback        |

Regenerate or verify: `bun packages/ops/src/governance/specs/library_manifest.script.ts`
(flags: `--dry-run`, `--verify`). Not merged into `catalog.yaml`.

Mise wrapper: `mise run spec library-manifest --verify`

### Catalog schema (`assets/catalog/catalog.yaml`)

YAML map keyed by **canonical feature id** (`snake_case`). **Registry only** — no file path lists.

```yaml
command_palette:
  title: Command palette and filter UX
  status: shipped # shipped | active | superseded | archived
  specs:
    - 014-command-palette-filter-ux
  superseded_by: null
```

| Field           | Required | Meaning                             |
| --------------- | -------- | ----------------------------------- |
| `title`         | yes      | Human label                         |
| `status`        | yes      | Lifecycle                           |
| `specs`         | yes      | Spec Kit or legacy slug reference   |
| `superseded_by` | optional | Canonical id of replacement feature |

**Forbidden:** path lists, prose fields, per-feature markdown in catalog.

**Ship gate check:** `mise run test tag <key> --list` must list every expected executable — add tags, do not edit catalog paths.

### Lifecycle

```txt
draft → active (assets/specs/NNN-slug/)
  ↓ ship (DoD gate)
promote → catalog.yaml entry + tags on Gherkin + units
  ↓
legacy assets/docs/archive/NNN-slug/ stubbed (if present)
  ↓ superseded
superseded_by set in catalog
```

**Ship gate (Definition of Done)** — before `status: shipped`: run
`mise run catalog promote <key>` (or `mise run spec ready` when the feature
catalog key resolves). See [`DoD.md` § Ship gate (catalog promotion)](DoD.md#8-ship-gate-catalog-promotion).

### Duplication policy

- One normative owner per fact: **Gherkin, unit assertion, type, or lint rule** — not catalog prose.
- Catalog registers shipped features — tags declare membership.
- README: onboarding + pointer to catalog — not feature matrices.

## Agent routing

| Need                                             | Read                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| How to work (FCIS, tests, commits, e2e policy)   | `assets/guides/`                                                   |
| Shipped features (what exists, where tests live) | `mise run catalog list` + `mise run test tag <catalog-key> --list` |
| Tools folder layout                              | `assets/guides/TOOLS_GUIDE.md`                                     |
| Implementing a named **in-flight** feature       | **`assets/specs/NNN-<slug>/`** (Spec Kit)                          |
| Legacy SDD archaeology                           | `assets/docs/archive/NNN-<slug>/` **only when task names slug**    |

Do not treat `assets/docs/` or legacy spec folders as a second source of truth for rules.

## Runtime path exceptions

Until shared contracts finish migrating, these **tools** may still embed paths (not documentation links):

- `packages/ops/src/governance/specs/library_manifest.script.ts` — generates and verifies `assets/catalog/library.yaml` (legacy archive folder index)
- `tools/metrics/harnesses/e2e-quality/e2e_metrics.script.ts` — reads `tools/metrics/baselines/e2e-quality/*`
**Rogue reference migration complete** — the diagnostic scanner has been retired; no actionable inbound links remain.

**Spec system backlog:** root [`TODO.md`](../../TODO.md) tracks remaining P0–P2 migration items.

Listed in ast-grep `ignores` for the inbound-link rules.
