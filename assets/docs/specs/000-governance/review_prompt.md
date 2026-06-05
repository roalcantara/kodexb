# Governance design — adversarial review prompt

Copy everything **below the horizontal rule** into Claude. Attach the listed files (or paste their contents) if the session cannot read the repo.

**Last synced with:** `design.md` (tag-only catalog, `@<catalog_key>` membership, § Related patterns / Elicit reference).

---

## Role

You are an **adversarial auditor** of a documentation governance model for a small team (~1–3 humans, many AI agents) building a TypeScript desktop app:

- **Stack:** Bun, React 19, Electrobun desktop, FCIS layers (`core/` pure, `shell/app/` I/O, `shell/renderer/` UI)
- **Testing:** Gherkin + Playwright BDD, co-located `bun:test` unit specs, quality gates (Biome, ast-grep, dependency-cruiser)
- **SDD:** Spec Kit in-flight (`assets/specs/`), ~45 legacy spec folders (`assets/docs/specs/`)

Find **gaps, contradictions, operational failure modes, and missing enforcement**. Do **not** propose a different architecture unless a closed decision below is impossible to implement.

---

## Closed decisions (do not re-litigate)

| #   | Decision                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Catalog** = `assets/catalog/catalog.yaml` — YAML **registry only**: `title`, `status`, `specs` (NNN slug reference), `superseded_by`. **No** `features` / `units` path lists, **no** per-feature prose, **no** `records/` tree. |
| 2   | **Membership** = `@<catalog_key>` tag on executables only. Key `command_palette` → tag `@command_palette`. **No** separate `tags.run`, **no** `tags.trace`.                                                                       |
| 3   | **Discovery** = `mise run test tag <key> --list` / `mise run test tag <key>` greps `assets/features/**/*.feature` and `src/**/*.spec.{ts,tsx}` for the tag. Catalog does **not** duplicate file paths — avoids list/tag drift.    |
| 4   | **Shipped truth** = **peer executables**: Gherkin (product behaviour) + unit/component specs (implementation contracts). Not prose in catalog, README, or legacy `design.md`.                                                     |
| 5   | **In-flight SDD** = `assets/specs/NNN-<slug>/` (Spec Kit). Open **only when the task names that slug**.                                                                                                                           |
| 6   | **Legacy SDD** = `assets/docs/specs/NNN-<slug>/` — stub after ship; archaeology only.                                                                                                                                             |
| 7   | **Process** = `assets/guides/` — timeless “how we work”; no shipped-feature encyclopedias.                                                                                                                                        |
| 8   | **`enforced_by: none`** = **ship blocker** — add Gherkin or unit test; never catalog prose as workaround.                                                                                                                         |
| 9   | **Legacy `@spec:<slug>`** on Gherkin — deprecated for **new** promotions; remove when shipping to catalog. Other features may still carry `@spec:*` until migrated (~15 `.feature` files).                                        |
| 10  | **Permanent docs** must **not** link to `assets/docs/specs/*` or in-flight `assets/specs/*` bodies as entrypoints (ast-grep enforced).                                                                                            |

---

## Artifacts to read (priority order)

| Priority | File                                                            | Why                                    |
| -------- | --------------------------------------------------------------- | -------------------------------------- |
| P0       | `assets/docs/specs/000-governance/design.md`                    | Normative governance contract          |
| P0       | `assets/catalog/catalog.yaml`                                   | Pilot registry (`command_palette`)     |
| P0       | `tools/mise/test.script.ts` + `tools/catalog/tag.script.ts`        | Tag-only grep discovery + list/run     |
| P1       | `assets/guides/DOC_AUTHORITY.md`                                | Agent routing + hard rules             |
| P2       | `assets/docs/specs/000-governance/requirements.md`              | Original problem statement             |
| P2       | `assets/docs/specs/000-governance/summary_01.md`                | Prior multi-model comparison (context) |
| P2       | `assets/catalog/SKILLS.yaml`                                    | Existing agent skill registry (for §9) |
| P3       | `assets/docs/specs/000-governance/design.md` § Related patterns | Elicit/AshPL adopt-vs-reject rationale |

**External reference (context, not required reading):** [Elicit — executable research plans / AshPL (YouTube)](https://youtu.be/qOjleN2-50c?si=d317IVjqbO-xf95S) — kb applies the same *mechanism-over-prose* thesis using Gherkin + unit tests instead of a custom DSL. See `design.md` § Related patterns.

---

## Pilot ground truth (`command_palette`)

Run locally and treat output as authoritative for membership:

```bash
mise run test tag command_palette --list
# or: bun tools/mise/test.script.ts (via mise run test tag)

bun test ./tools/catalog/
```

**Expected membership (as of pilot):**

| Kind    | Tagged with `@command_palette`                                 |
| ------- | -------------------------------------------------------------- |
| Gherkin | `assets/features/e2e/command_palette.feature` (Feature line)   |
| Gherkin | `assets/features/e2e/search_and_filter.feature` (Feature line) |
| Units   | 9 files under `src/` with `// @command_palette` on line 1      |

**Catalog entry (metadata only — no paths):**

```yaml
command_palette:
  title: Command palette and filter UX
  status: shipped
  specs:
    - 014-command-palette-filter-ux
  superseded_by: null
```

**Ship gate for this feature:** `mise run test tag command_palette --list` lists all expected files; every PRD rule in legacy `014-…/design.md` maps to Gherkin and/or unit before stubbing legacy spec.

---

## Architecture summary (if files unavailable)

### Document layers

| Layer      | Path                            | Purpose                                |
| ---------- | ------------------------------- | -------------------------------------- |
| Process    | `assets/guides/`                | How we work on any feature             |
| Catalog    | `assets/catalog/catalog.yaml`   | What shipped features exist (registry) |
| Gherkin    | `assets/features/**/*.feature`  | Product-visible behaviour (executable) |
| Unit       | `src/**/*.spec.ts(x)`           | Implementation contracts (executable)  |
| In-flight  | `assets/specs/NNN-<slug>/`      | Spec Kit workspace while building      |
| Legacy     | `assets/docs/specs/NNN-<slug>/` | Stubbed archaeology                    |
| Onboarding | `README.md`                     | Stack, commands, pointer to catalog    |

### Tag membership contract

| Artifact  | Tag placement                                        |
| --------- | ---------------------------------------------------- |
| Gherkin   | Cucumber tag on **Feature** line: `@command_palette` |
| Unit spec | Line 1: `// @command_palette`                        |

### Lifecycle

```txt
draft → active (assets/specs/NNN-slug/)
  ↓ ship (DoD)
promote → catalog.yaml row + @<key> on Gherkin + units
  ↓
legacy assets/docs/specs/NNN-slug/ stubbed
  ↓ superseded
superseded_by → replacement catalog key
```

### Agent routing

| Need                             | Read / run                                           |
| -------------------------------- | ---------------------------------------------------- |
| Conventions                      | `assets/guides/`                                     |
| What features shipped            | `mise run catalog list`                              |
| Find/run all tests for feature X | `mise run test tag X --list` / `mise run test tag X` |
| Product behaviour                | Gherkin from `test tag --list`                       |
| Implementation detail            | Unit specs from `test tag --list`                    |
| Building feature Y               | `assets/specs/NNN-Y/` only when task names slug      |

---

## Output format (use these headings exactly)

### 1. Enforcement gaps

Rules in `design.md` / `DOC_AUTHORITY.md` with **no** CI gate, ast-grep rule, script, or DoD owner.

Format: **rule** → missing enforcer → minimal fix (prefer machine-checkable).

Pay special attention to:

- Tag placement contract (line 1 comment, Feature line) — anything verifying it?
- Orphan `@<key>` tags (tag present, no catalog row) or shipped rows with zero tagged files
- `enforced_by: none` — any gate beyond human checklist?
- ast-grep inbound ban on `assets/docs/specs/*` — coverage holes for `assets/specs/*`?

### 2. Drift vectors

How the model decays over months of bugfixes without anyone noticing. Rank by **likelihood × impact**.

Include tag-only discovery risks: forgotten tags on new specs, tags left on deleted features, shared files with multiple `@<key>` tags, grep false positives.

### 3. Ambiguities

Wording or lifecycle steps an agent could misread.

Examples to evaluate: `status: active` in catalog vs in-flight in `assets/specs/`; when to open legacy vs Spec Kit folder; whether `specs:` field points to legacy or active path; bugfix after ship (tests only vs reopen spec).

### 4. Shared code / multi-feature ownership

One `.feature` or `.spec.ts` file tagged with multiple catalog keys; util owned by two product features; Playwright `--grep @key` substring collisions (e.g. `@sync` vs `@sync_ui`).

### 5. Supersession and post-ship change

`superseded_by` workflow: tags, Gherkin, catalog keys, legacy stubs. Behaviour change on shipped feature — required steps?

### 6. Legacy tooling conflicts

| Tool / doc                          | Conflict with new model           |
| ----------------------------------- | --------------------------------- |
| `library_manifest.json`             | Dual index with `catalog.yaml`?   |
| `tools/spec/trace.script.ts`               | Expects `@spec:<slug>` on Gherkin |
| `BDD_GHERKIN_GUIDE.md`              | Mandates `@spec:<slug>`           |
| e2e step-catalog / fixture-manifest | Third executable layer?           |
| Spec Kit trace tables               | Pointer format after ship         |

Recommend migration order, not parallel forever.

### 7. Top 5 ship-blockers before repo-wide rollout

Concrete blockers before promoting ~45 legacy specs to catalog — not generic “write more docs”.

### 8. What looks solid

≤5 bullets — decisions that are coherent and worth keeping.

### 9. Recommended skills and tooling

**Implemented (registry):** `mise run skill add`, `reconcile`, `create`, and `prune` via [`tools/skill/skill_registry.script.ts`](../../../../tools/skill/skill_registry.script.ts); HK pre-commit runs `mise run skill validate --raw` on registry changes.

Based on gaps found in §1–§7 and the **Related patterns** section in `design.md` (Elicit-style mechanism legibility without AshPL), recommend **concrete** skills and tools the team should adopt or wire into the governance workflow.

**Format per recommendation:**

| Column                 | Content                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Name**               | Skill, guide, script, or methodology (existing or to create)                                                |
| **Type**               | `project-skill` \| `global-skill` \| `mise-task` \| `guide` \| `CI gate` \| `methodology`                   |
| **Closes gap**         | Which §1–§7 finding or ship-blocker it addresses                                                            |
| **When to load / run** | Trigger (e.g. before ship, on catalog edit, in agent routing)                                               |
| **Already in repo?**   | Yes → path in `SKILLS.yaml` / `assets/catalog/` / `assets/guides/` / `tools/`; No → one-line creation brief |

**Cover at minimum:**

1. **Governance-specific** — skills or tasks for catalog promotion, `feature validate`, tag hygiene, `enforced_by` audits, rogue-ref cleanup.
2. **Testing / BDD** — skills that strengthen dual executable SOT (Gherkin authoring, bun:test patterns, e2e trace migration off `@spec:*`).
3. **Agent routing** — skills that should become `required` or `routed` in [`assets/catalog/SKILLS.yaml`](../../../catalog/SKILLS.yaml) so agents load them when touching catalog, specs, or ship gates (e.g. `app-quality-gate`, `spec-driven-development`, `bdd-gherkin-specification`).
4. **Observability of mechanism** — anything that makes `test tag --list` / ship provenance visible (no custom DSL).
5. **Explicitly skip** — skills or patterns that duplicate closed decisions (catalog prose, AshPL-style DSL, `@spec:` parallel index).

End with a **prioritized top 5** (implement first → defer).

---

## Constraints on recommendations

- Do **not** propose: catalog prose, `records/*.md`, path lists in YAML, `assets/specs/shipped/` permanent docs, README feature matrices, guides as feature encyclopedias.
- Do **not** reintroduce `@spec:<slug>` as a parallel index for shipped features.
- Prefer **machine-checkable** fixes (`feature validate`, ast-grep, gate.sh hook) over policy-only edits.
- ADRs only if you state what cannot live in Gherkin/tests/types/lint.

---

## Optional deep-dive questions

Answer only if you have evidence from the artifacts — skip if speculative:

1. Is **tag-only discovery** (no path lists) the right tradeoff vs a CI script that diffs tags against an expected manifest?
2. Should `test tag --list` warn when grep returns **zero** files for a `status: shipped` entry?
3. Is `// @<key>` on line 1 sufficient, or should unit membership use `describe('@<key> …')` for stronger structure?
4. What is the minimal **`feature validate`** command the repo should add before scaling to 45 features?
5. Does the **Elicit / executable-plan** pattern (see `design.md` § Related patterns) suggest any **non-DSL** tooling we should add (e.g. ship provenance artifacts, validate-on-catalog-edit)?

---

*Pilot: `014-command-palette-filter-ux` → catalog key `command_palette`. Regenerate this prompt when `design.md` changes materially.*
