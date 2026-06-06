# SDD workflow guide

How kb uses **Spec Kit** and **specification-driven development (SDD)** for in-flight
features. Document authority and layer rules live in
[`DOC_AUTHORITY.md`](DOC_AUTHORITY.md); this guide describes the day-to-day workflow.

## Where specs live

| Layer                | Path                                                         | When to open                                     |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| **In-flight SDD**    | `assets/specs/NNN-<slug>/`                                   | Only when your task names that slug              |
| **Shipped registry** | `assets/catalog/catalog.yaml`                                | What exists in the product (YAML metadata)       |
| **Gherkin**          | `assets/features/**/*.feature`                               | User-visible behaviour                           |
| **Unit/component**   | `src/**/*.spec.ts(x)`                                        | Implementation contracts                         |
| **Legacy archive**   | See [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) § Document layers | Archaeology after ship — not an agent entrypoint |
| **Process**          | `assets/guides/`                                             | Cross-cutting rules for every PR                 |

Normative files per in-flight feature:

- `spec.md` — EARS requirements with **Measure** and **Evidence**
- `plan.md` — design contract, file touch list, traceability
- `tasks.md` — ordered work and verification
- `handoff.md` — optional operator handoff and acceptance tracker

Backlog index: [`assets/specs/README.md`](../specs/README.md).

Binding principles for Spec Kit commands: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md).

## Spec Kit workspace

kb ships a **vanilla** Spec Kit workspace under `.specify/`:

- Templates: `.specify/templates/`
- Default workflow: `.specify/workflows/speckit/` (full specify → plan → tasks → implement cycle)
- Cursor skills: `.cursor/skills/speckit-*/`
- Agent rule snippet: [`.cursor/rules/specify-rules.mdc`](../../.cursor/rules/specify-rules.mdc)

Companion scans only numbered feature folders:

```json
"speckit.specDirectories": ["assets/specs/[0-9][0-9][0-9]-*"]
```

(VS Code / Cursor: [`.vscode/settings.json`](../../.vscode/settings.json).)

**Deferred to a follow-up PR:** kb-specific workflows (`kb-full`, `kb-slice`, `kb-hotfix`) and
the `kb-workflow` extension (preflight, handoff generators). Track in
[`tools/governance/specs/PLAN_PUNCHLIST.md`](../../tools/governance/specs/PLAN_PUNCHLIST.md).

## Starting a feature

1. **Scaffold** (optional — copies templates):

   ```bash
   mise run spec feature-init -- --id 004 --slug my-feature
   ```

2. **Branch** — use conventional feature branch naming (`feat/004-my-feature`).

3. **Specify** — run `/speckit-specify` in Cursor (or write `spec.md` from
   `.specify/templates/spec-template.md`).

4. **Clarify / plan / tasks** — `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`.

5. **Implement** — `/speckit-implement`; code under `src/` with co-located specs.

6. **Quality passes** (advisory) — `/speckit-checklist`, `/speckit-analyze`.

Git auto-commit hooks are **disabled** in `.specify/extensions/git/git-config.yml`; commits
are operator-initiated (see constitution).

## Deterministic gates (authoritative)

LLM skills advise; these commands **enforce**:

```bash
# EARS shape + spec hygiene
mise run spec lint assets/specs/NNN-slug --strict

# Cross-file traceability (spec ↔ plan ↔ features)
mise run spec trace assets/specs/NNN-slug --strict

# lint + trace + full app quality gate
mise run spec gate assets/specs/NNN-slug
```

Implementation: [`tools/governance/specs/`](../../tools/governance/specs/).

Run `mise run spec lint -- --all --strict` before a release that touches multiple specs.

## Executable traceability

Every normative requirement must map to executable evidence before ship:

| Evidence                      | Owner                                                 |
| ----------------------------- | ----------------------------------------------------- |
| User-visible behaviour        | Gherkin — line-1 `@<catalog_key>` on `.feature` files |
| Algorithms, utils, components | Co-located `*.spec.ts(x)` under `src/`                |
| Cross-cutting repo rules      | Guides + tool configs (Biome, ast-grep, etc.)         |

E2e step contracts (when declared): `assets/features/e2e/contracts/`.

Catalog membership: [`assets/catalog/catalog.yaml`](../catalog/catalog.yaml) + `mise run catalog validate`.

## Spec Kit command map

| Phase        | Cursor skill             | Primary artifact                  |
| ------------ | ------------------------ | --------------------------------- |
| Constitution | `/speckit-constitution`  | `.specify/memory/constitution.md` |
| Specify      | `/speckit-specify`       | `spec.md`                         |
| Clarify      | `/speckit-clarify`       | `spec.md` updates                 |
| Plan         | `/speckit-plan`          | `plan.md`                         |
| Tasks        | `/speckit-tasks`         | `tasks.md`                        |
| Implement    | `/speckit-implement`     | `src/` + tests                    |
| Checklist    | `/speckit-checklist`     | `checklists/`                     |
| Analyze      | `/speckit-analyze`       | consistency report                |
| Issues       | `/speckit-taskstoissues` | GitHub issues (optional)          |

Resume an interrupted workflow: `mise run spec resume` (wraps `specify workflow resume`).

## Shipping

1. Gherkin + unit coverage for every requirement line (`enforced_by: none` is a ship blocker).
2. `mise run spec gate assets/specs/NNN-slug`
3. `bash .agents/skills/app-quality-gate/scripts/gate.sh` (included in `spec gate`)
4. `mise run catalog ship <key>` when registering a new catalog entry
5. After merge: archive legacy SDD per [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) § Shipping

## Precedence on conflicts

**[`assets/guides/`](.) > [`CLAUDE.md`](../../CLAUDE.md) > [constitution](../../.specify/memory/constitution.md) > Spec Kit templates**

If this guide and the constitution disagree, fix the constitution in the same PR that updates
the guide.

## Related guides

- [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) — document layers, catalog governance, shipping
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) — bun:test, Gherkin, no-mock rule
- [`DoD.md`](DoD.md) — definition of done
