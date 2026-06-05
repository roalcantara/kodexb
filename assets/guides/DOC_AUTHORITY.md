# Document authority (normative)

Where rules and feature specs live, and what may link to what.

## Hard rules

1. **Project rules** (every PR, every agent) live only in **`assets/guides/`** (and tool configs they reference: `biome.jsonc`, `hk.pkl`, etc.).
2. **In-flight feature SDD** (Spec Kit) lives only in **`assets/specs/NNN-<slug>/`** — for the person implementing that feature; open **only when the task names that slug**.
3. **Shipped feature registry** lives in **`assets/catalog/catalog.yaml`** — YAML metadata only (`title`, `status`, `specs`, `superseded_by`). **No** path lists, **no** per-feature prose. Membership = `@<catalog_key>` on Gherkin/units. Governance: [`assets/docs/specs/000-governance/design.md`](../docs/specs/000-governance/design.md).
4. **Legacy SDD** under **`assets/docs/specs/NNN-<slug>/`** is archaeology (stubbed after ship). Not an agent entrypoint.
5. A workspace spec may **link out** to a guide or the catalog (one pointer, no copy). Guides **must not** link into `assets/docs/*`.
6. **No permanent doc** (`AGENTS.md`, `CLAUDE.md`, `README.md`, `assets/guides/**`, `.agents/skills/**`, `.cursor/rules/**`) may reference `assets/docs/*`. Enforced by ast-grep (`tools/rules/no-inbound-assets-docs-*.rule.yml`).

## Executable source of truth (peer layers)

| Scope                            | Owner                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| User-visible / release behaviour | **Gherkin** — `assets/features/**/*.feature` (target layout: `assets/features/*.feature`)          |
| Implementation contracts         | **Unit/component specs** — `src/**/*.spec.ts(x)`                                                   |
| Process                          | **Guides**                                                                                         |
| Shipped registry (what exists)   | `assets/catalog/catalog.yaml` + `mise run catalog list` / `mise run test tag <catalog-key> --list` |

Every shipped rule must live in **Gherkin and/or unit tests** (or types/lint). Catalog **registers** shipped features; `@<catalog_key>` tags **declare** membership (via `test tag --list`). `enforced_by: none` is a **ship blocker**, not an excuse for prose.

Use `mise run test tag <catalog-key> --list` (or `@<catalog-key>`) to list executables for a shipped feature.

## Agent routing

| Need                                             | Read                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| How to work (FCIS, tests, commits, e2e policy)   | `assets/guides/`                                                   |
| Shipped features (what exists, where tests live) | `mise run catalog list` + `mise run test tag <catalog-key> --list` |
| Implementing a named **in-flight** feature       | **`assets/specs/NNN-<slug>/`** (Spec Kit)                          |
| Legacy SDD archaeology                           | `assets/docs/specs/NNN-<slug>/` **only when task names slug**      |

Do not treat `assets/docs/` or legacy spec folders as a second source of truth for rules.

## Runtime path exceptions

Until shared contracts move out of `assets/docs/` (see `SPEC_SYSTEM_BACKLOG.md`), these **tools** may still embed paths (not documentation links):

- `tools/spec/library_manifest.script.ts` — renames under `assets/docs/specs/`
- `tools/spec/import_legacy.script.ts` — legacy import
- `tools/e2e/*` — e2e metrics/baseline paths (migrate to `assets/features/` contracts later)

Listed in ast-grep `ignores` for the inbound-link rules.
