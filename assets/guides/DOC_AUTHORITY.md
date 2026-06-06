# Document authority (normative)

Where rules and feature specs live, and what may link to what.

## Hard rules

1. **Project rules** (every PR, every agent) live only in **`assets/guides/`** (and tool configs they reference: `biome.jsonc`, `hk.pkl`, etc.).
2. **In-flight feature SDD** (Spec Kit) lives only in **`assets/specs/NNN-<slug>/`** — for the person implementing that feature; open **only when the task names that slug**.
3. **Shipped feature registry** lives in **`assets/catalog/catalog.yaml`** — YAML metadata only (`title`, `status`, `specs`, `superseded_by`). **No** path lists, **no** per-feature prose. Membership = `@<catalog_key>` on Gherkin/units. Governance: **this file** § Catalog governance.
4. **Legacy SDD** under **`assets/docs/specs/NNN-<slug>/`** is archaeology (stubbed after ship). Not an agent entrypoint.
5. A workspace spec may **link out** to a guide or the catalog (one pointer, no copy). Guides **must not** link into `assets/docs/*`.
6. **No permanent doc** (`AGENTS.md`, `CLAUDE.md`, `README.md`, `assets/guides/**`, `.agents/skills/**`, `.cursor/rules/**`) may reference `assets/docs/*`. Enforced by ast-grep (`tools/governance/policies/ast-grep/no-inbound-assets-docs-*.rule.yml`).

## Document layers

| Layer              | Path                                   | Purpose                                                                                                  |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Process**        | `assets/guides/`                       | How we work on any feature (FCIS, testing policy, commits, tools taxonomy)                                 |
| **Catalog**        | `assets/catalog/`                      | Shipped feature + skill registries (`catalog.yaml`, `SKILLS.yaml`) — YAML only, no prose                 |
| **Gherkin**        | `assets/features/*.feature`            | Product-visible behaviour (executable)                                                                   |
| **Unit/component** | `src/**/*.spec.ts(x)`                  | Implementation contracts (executable)                                                                    |
| **In-flight SDD**  | `assets/specs/NNN-<slug>/`             | Spec Kit workspace while building                                                                        |
| **Legacy SDD**     | `assets/docs/specs/NNN-<slug>/`        | Pre–Spec Kit folders; stub after ship                                                                    |
| **Onboarding**     | `README.md`                            | Stack, commands, link to catalog                                                                         |

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

| Surface                  | Convention                     |
| ------------------------ | ------------------------------ |
| Catalog YAML key         | `snake_case` stable product id |
| Gherkin Feature line     | Cucumber tag `@<key>`          |
| Unit/component spec file | Comment on line 1              |
| CLI                      | `mise run test tag <key> --list` |

```bash
mise run catalog list
mise run test tag --list
mise run test tag command_palette --list
mise run test tag command_palette
```

Implementation: `tools/bin/test.script.ts`, `tools/bin/catalog.script.ts`; domain libs under
`tools/governance/registries/catalog/`.

**Catalog key rules:** stable after ship; grep-safe names; legacy `@spec:<slug>` deprecated for new work.

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

| Field           | Required | Meaning                                      |
| --------------- | -------- | -------------------------------------------- |
| `title`         | yes      | Human label                                  |
| `status`        | yes      | Lifecycle                                    |
| `specs`         | yes      | Spec Kit or legacy slug reference            |
| `superseded_by` | optional | Canonical id of replacement feature          |

**Forbidden:** path lists, prose fields, per-feature markdown in catalog.

**Ship gate check:** `mise run test tag <key> --list` must list every expected executable — add tags, do not edit catalog paths.

### Lifecycle

```txt
draft → active (assets/specs/NNN-slug/)
  ↓ ship (DoD gate)
promote → catalog.yaml entry + tags on Gherkin + units
  ↓
legacy assets/docs/specs/NNN-slug/ stubbed (if present)
  ↓ superseded
superseded_by set in catalog
```

**Ship gate (Definition of Done)** — before `status: shipped`:

- [ ] `catalog.yaml` entry; Gherkin + units tagged `@<key>`
- [ ] No `enforced_by: none` on requirement lines
- [ ] Spec folder stubbed; no permanent doc links to spec bodies
- [ ] `mise run test tag <catalog-key> --list` lists expected artifacts

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
| Legacy SDD archaeology                           | `assets/docs/specs/NNN-<slug>/` **only when task names slug**      |

Do not treat `assets/docs/` or legacy spec folders as a second source of truth for rules.

## Runtime path exceptions

Until shared contracts finish migrating, these **tools** may still embed paths (not documentation links):

- `tools/governance/specs/library_manifest.script.ts` — renames under legacy spec tree
- `tools/metrics/harnesses/e2e-quality/e2e_metrics.script.ts` — reads `tools/metrics/baselines/e2e-quality/*`
- `tools/governance/policies/rogue_refs.script.ts` — inventories inbound legacy links

**Rogue reference inventory:** `mise run audit rogue-refs` (writes `tmp/audit/`; diagnostic, not a merge gate).

Listed in ast-grep `ignores` for the inbound-link rules.
