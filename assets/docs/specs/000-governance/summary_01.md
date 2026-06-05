# Governance proposals — summary and comparison

**Question:** [requirements.md](requirements.md)

**Responses:**

| Source | File                                 | Architectures proposed                                                              | Recommended default                                           |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Claude | [design_claude.md](design_claude.md) | A As-built catalog, B Living-spec-first, C Single catalog, D Backstage (sketch)     | Hybrid **A + B** (catalog + ADR + Gherkin + encode in checks) |
| Gemini | [design_gemini.md](design_gemini.md) | 1 As-built catalog (in-flight/shipped), 2 Ephemeral/colocation, 3 Two-tiered manual | **Option 1** (move folder to `shipped/`, manifest index)      |
| GPT    | [design_gpt.md](design_gpt.md)       | A Promotion pipeline, B Delete specs, C ADR split, D Behavior-first                 | **A + D** (catalog + Gherkin owns behavior)                   |

---

## Shared diagnosis (all three agree)

1. **`design.md` serves two identities over time** — forward contract (mutable, in-flight) vs as-built record (durable, shipped). Keeping both in one bucket causes agent “temporal confusion.”
2. **Permanent entrypoints must not link to scratchpad specs** — the ast-grep rule is directionally correct; the missing piece is a **promotion target**, not weaker linking.
3. **`assets/guides/` is for timeless process** — not shipped feature encyclopedias.
4. **README must stay small** — onboarding and routing, not full product matrices.
5. **Agents need deterministic routing** — manifest/catalog index → one record; lazy-load feature detail only when the task names a slug.
6. **Duplication is the enemy** — one normative owner per fact; link elsewhere.
7. **Ship gate in DoD** — promotion is a lifecycle event, not optional cleanup.
8. **Pilot on `014-command-palette-filter-ux`** — no big-bang migration across ~45 folders.

---

## Architecture families (grouped)

### Family 1 — Promote-and-stub catalog (consensus core)

**Who:** Claude A, Gemini 1, GPT A (and Claude/GPT recommended hybrids).

**Idea:** In-flight specs stay in a scratchpad tree. On ship, durable content moves to a **catalog** (new tree); spec folder is **stubbed** (tombstone), not deleted. Machine manifest resolves slug → catalog path + status + supersession.

**Typical paths (names differ, shape is the same):**

| Model  | In-flight                     | Shipped / catalog                           |
| ------ | ----------------------------- | ------------------------------------------- |
| Claude | `assets/docs/specs/NNN-slug/` | `assets/catalog/<slug>.md`                  |
| Gemini | `assets/specs/in-flight/`     | `assets/specs/shipped/` (+ `features.json`) |
| GPT    | `assets/specs/<feature>/`     | `assets/catalog/features/<slug>/`           |

**Repo fit:** Aligns with existing [`DOC_AUTHORITY.md`](../../../guides/DOC_AUTHORITY.md) intent, `library_manifest.json`, ast-grep inbound ban, and your `tmp/rogue_reference_by_category.csv` `promote` / `stub` vocabulary. Differs mainly in **folder naming** (`assets/built/` vs `assets/catalog/` vs `specs/shipped/`).

---

### Family 2 — Dual executable SOT (Gherkin + unit specs)

**Who:** Claude hybrid (`enforced_by`), GPT D, revised kb default ([design.md](design.md)).

**Idea:** Product-visible rules → **Gherkin** (`.feature`). Implementation contracts → **unit/component specs** (`.spec.ts`). Both are **peer executables** in CI — not prose in catalog. Catalog **indexes** paths and **run tags** only. **`enforced_by: none` → add tests before ship** (never catalog prose).

**Strength:** Matches PRD → BDD/TDD pipeline; drift-resistant; unit layer already co-located in this repo.

**Risk:** Requires catalog `units[]` + tag discipline; Gherkin path migration (`assets/features/e2e/` → `assets/features/`).

---

### Family 3 — ADR layer for “why”

**Who:** Claude hybrid, GPT C.
**Idea:** Cross-cutting or supersession decisions → `assets/decisions/` or `docs/adr/`. Feature catalog stays thin; ADRs are supersedable and indexed.
**Strength:** Scales when many features touch the same subsystem; matches industry RFC → ADR practice.
**Risk:** Extra file type and index to maintain; easy to over-ADR trivial choices.

---

### Family 4 — Dissolve spec after ship (ephemeral)

**Who:** Claude B, Gemini 2, GPT B.

**Variants:**

| Variant                         | Where knowledge goes                        | Agent cost                    |
| ------------------------------- | ------------------------------------------- | ----------------------------- |
| **BDD + ADR only** (Claude B)   | Gherkin + ADR + code checks; delete spec    | Low doc count; prose gaps     |
| **Colocation** (Gemini 2)       | `src/**/README.md`, TSDoc, BDD; delete spec | Agents hunt `src/` trees      |
| **Living catalog only** (GPT B) | Merge into catalog; delete spec             | Clean routing; no archaeology |

**Shared weakness for your repo:** ~45 legacy folders, migration history, supersession chains (015 → 014). Deletion fights agent reasoning about renames and “why this util exists.”

---

### Family 5 — Central manuals (subsystem docs)

**Who:** Gemini 3, GPT C (partial), Claude D (Backstage sketch at scale).
**Idea:** Merge shipped content into **`product-manual.md`** and/or **`system-architecture/<subsystem>.md`** instead of per-feature records.
**Strength:** Cohesive human reading experience.
**Weakness:** Merge conflicts when parallel features ship; blurs feature boundaries; high token cost if agents load whole manuals; **violates your guides-vs-concrete separation** if manuals grow without bound.

---

## Point-by-point comparison

| Dimension                    | Claude                                       | Gemini                                          | GPT                                              |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Catalog location             | `assets/catalog/`                            | `assets/specs/shipped/`                         | `assets/catalog/features/`                       |
| Keeps archaeology            | Yes (stub + archive)                         | Yes (move, prune tasks)                         | Yes (stub/archive)                               |
| Gherkin as behaviour SOT     | Strong (hybrid)                              | Mentioned, less central                         | Explicit (Option D)                              |
| ADRs                         | Yes (hybrid)                                 | Option 2 only                                   | Option C                                         |
| Encode in tests/ast-grep     | **Strongest** (`enforced_by` column)         | Weak                                            | Medium                                           |
| Migration CSV vocabulary     | `handle`, `kind`, `canonical`, `enforced_by` | `target`, `handle` (promote/distill/prune/stub) | `status`, `target`, `handle`, `owner`, `routing` |
| ast-grep scope               | No links to `specs/*`                        | No links to `in-flight/`                        | No links to `specs/*` from permanent docs        |
| Drift risk on shipped design | Low if residue-only catalog                  | **Medium** (full design.md frozen in shipped/)  | Low if split behavior/contract files             |

---

## Ranked architectures (best → worst)

Scoring lens: **sustainable** (low drift, clear ownership), **implementable** (fits repo today, incremental migration), **ROI** (agent token cost ↓, maintainer effort ↓, correctness ↑).

| Rank  | Architecture                                                                                                      | Primary advocates                                 | Rationale                                                                                                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | **Hybrid: promote-and-stub catalog + dual executable SOT (Gherkin + unit) + catalog-key tags + encode-in-checks** | Claude hybrid, GPT A+D, kb [design.md](design.md) | Best ROI: catalog routes agents; Gherkin and unit specs are peer truth; `@<catalog_key>` + `mise run test tag …` (list/run); stubs preserve archaeology.                                   |
| **2** | **Pure promote-and-stub catalog (move to `shipped/` or per-slug RECORD)**                                         | Gemini Option 1, GPT Option A, Claude Option A    | Simple mental model, fast to adopt, good agent routing. Ranked below #1 because **frozen full `design.md`** without Gherkin/check encoding **reintroduces drift** over months of bugfixes. |
| **3** | **ADR + feature record split (catalog + `assets/decisions/`)**                                                    | GPT Option C, Claude hybrid (partial)             | Excellent at scale and supersession history. More moving parts than #1; ADR discipline cost; still needs catalog for non-decision residue. Add **after** #1 is running, not instead of it. |
| **4** | **Single catalog file per feature (no ADR, no split behaviour/contract)**                                         | Claude Option C                                   | Fewest concepts; one link target per shipped feature. Risk: each file becomes a mini-encyclopedia; behaviour duplicates Gherkin unless strictly enforced.                                  |
| **5** | **Two-tiered manual (product-manual + subsystem architecture)**                                                   | Gemini Option 3                                   | Human-readable but poor concurrent-ship ergonomics, merge conflicts, mixed abstraction levels, high agent token load.                                                                      |
| **6** | **Ephemeral spec — colocate in `src/**/README.md`**                                                               | Gemini Option 2                                   | Zero spec drift but agents lose global index; violates FCIS “findability”; distillation at ship is error-prone for agents.                                                                 |
| **7** | **Living-spec-first — delete spec; Gherkin + ADR + code only**                                                    | Claude Option B                                   | Elegant minimalism; fails for keyboard/focus/touch-point residue; abuses ADR for non-decisions; poor fit for 45-folder legacy audit.                                                       |
| **8** | **Delete spec on ship (catalog-only memory)**                                                                     | GPT Option B                                      | Cleanest routing but **worst archaeology**; git history insufficient for agent “why was this order chosen?” queries; high migration pain.                                                  |

---

## Model-level verdict (which answer to trust for what)

| Model      | Strongest contribution                                                                                             | Weakest / watch out                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Claude** | **`enforced_by` audit** — sort every `design.md` line into Gherkin / test / ast-grep / prose residue; lazy routing | Four options + hybrid can feel heavy until catalog path is fixed                                                                |
| **GPT**    | Clearest **lifecycle state machine** and **CSV schema** (`owner`, `routing`, `status`)                             | Option B (delete specs) should be rejected for this repo                                                                        |
| **Gemini** | Simplest **physical move** (`in-flight/` → `shipped/`) and manifest-first agent instruction                        | Keeping **entire** shipped `design.md` as SOT; Option 3 manual; `assets/specs/` path still confuses “specs” with permanent docs |

---

## Synthesis — recommended default for kb (revised)

Adopt **Rank #1** — full normative design: [design.md](design.md). Pilot catalog: [catalog.yaml](../../../catalog/catalog.yaml).

```txt
assets/guides/                 timeless process
assets/catalog/catalog.yaml    shipped index (YAML only — paths + tags, no feature prose)
assets/specs/NNN-slug/         in-flight SDD (Spec Kit) — active work only
assets/docs/specs/NNN-slug/    legacy SDD — stub after ship (archaeology)
assets/features/*.feature      Gherkin SOT
src/**/*.spec.ts(x)            unit/component SOT
README.md                      onboarding + link to catalog
```

**Dual executable SOT:** Every PRD rule maps to `gherkin` and/or `test` (and `type` / `astgrep` where possible). **`enforced_by: none` blocks ship** — add tests; do not add catalog or RECORD prose.

**Tag linking:** Run tag = `@<catalog_key>` (e.g. `@command_palette`). Tag Gherkin Feature lines and unit specs (`// @command_palette`). Commands:

```bash
mise run test tag command_palette --list
mise run test tag command_palette
```

**Promotion rule (DoD):** SHIPPED requires `catalog.yaml` entry + Gherkin/units tagged `@<key>` + spec stubbed + no permanent links to spec bodies + `mise run test tag <key> --list` lists expected artifacts.

**Duplication rule:** One normative owner per fact; catalog indexes executables.

**Do not adopt without adaptation:**

- Gemini’s `assets/specs/shipped/` (permanent docs under `specs/` prefix).
- GPT Option B / Claude Option B spec deletion.
- Gemini Option 3 monolithic manuals.

---

## Minimal migration (revised)

1. **Governance + catalog scaffold** — [design.md](design.md), [catalog.yaml](../../../catalog/catalog.yaml), [DOC_AUTHORITY.md](../../../guides/DOC_AUTHORITY.md), `mise run catalog list` + `mise run test tag …`.
2. **Pilot 014** — tag Gherkin + units (`@command_palette`); **add tests for gaps** (no prose RECORD); stub legacy `assets/docs/specs/014-…/`; slim README.
3. **Lazy legacy** — add catalog entries when touching shipped slugs; migrate Gherkin to `assets/features/` when updating playwright paths.

---

## Next artifact

Run **`enforced_by` audit** on [014 design.md](../014-command-palette-filter-ux/design.md): every `none` row becomes a **new Gherkin scenario or unit test** before stubbing legacy spec — not catalog prose.
