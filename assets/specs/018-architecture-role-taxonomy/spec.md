<!-- markdownlint-disable-file -->

# Architecture role-taxonomy audit & migration roadmap

**Feature Branch**: `018-architecture-role-taxonomy`
**Release**: v0.x
**Status**: Draft

**Input**: `.util.ts` is the dominant suffix in `src/` (**100 files**) and is
frequently a lie — `CODESTYLE_GUIDE` defines `.util` as "pure stateless helper
functions," yet many shell `.util` files perform I/O or hold OS-integration
logic. 018 stands up a **repeatable role-conformance metric** (a `tools/metrics`
harness, run/report/compare like `perf`), finalizes the role vocabulary, produces
a sequenced multi-PR roadmap that drives and reorders the `TODO.md` P3 backlog,
locks the already-conformant dirs with ls-lint, and proves the approach on one
pilot folder. The bulk renames are roadmap PRs — **not** 018.

## Introduction

The role vocabulary already exists and embraces the target philosophy:
`CODESTYLE_GUIDE` § File Naming says *"Rails-style — Convention over
configuration: know the folder, know the suffix, done."* The problem is the
contract is **unenforced for suffixed files** (017's COH-3 confirmed ls-lint
enforces a suffix only via a basename regex) and **widely violated** by `.util`.

Rather than a one-off audit document in the ephemeral `assets/specs/` workspace
(which `DOC_AUTHORITY` forbids referencing as durable), 018 makes the audit a
**standing metric**: a `role-conformance` series under the existing
`tools/metrics` harness pattern (alongside `perf` and `e2e-quality`), so the
project can re-run it periodically and track evolution/decay against a committed
baseline. Its six requirements split into a **Plan half** (ROLE-1 metric harness
+ first baseline → ROLE-2 vocabulary+doctrine → ROLE-3 roadmap+TODO) and an
**Execute half** (ROLE-4 lock conformant dirs → ROLE-5 pilot → ROLE-6 doc-sync).
The only product-code change is the pilot rename; the harness is tooling.

## Clarifications

### Session 2026-06-21
- Q: 018 scope vs the P3 backlog? → A: **Audit-first → multi-PR roadmap** using `TODO.md` as guidance and **reordering/merging** P3 items; respects "no big-bang" (P3-16).
- Q: Pilot, or pure planning? → A: **Pilot + enforce already-conformant dirs.** Safe because enforcement is added only where 0 renames are needed (017 COH-3: 0 failures).
- Q: How free is the vocabulary change? → A: **Update/enhance/tweak** freely where it improves clarity.
- Q: Roadmap ordering? → A: Roadmap sits at ROLE-3 (right after the audit+vocabulary it depends on) so the rewritten `TODO.md` drives the locks, pilot, and doc-sync.
- Q: Compound filenames (`paste_frontmost.adapter.ts`)? → A: **Single-word doctrine** — a shared qualifier goes in a **subfolder** (Rails model-scoped style); merge only if one abstraction.
- Q: ADR location? → A: `assets/guides/` is the doctrine SSOT → ADRs live at **`assets/guides/adr/`**. Mass relocation of guides to `assets/docs/` rejected.
- Q: Where does the audit artifact live, given `assets/specs/` is ephemeral? → A: It is **not** a spec-dir markdown. It is a `tools/metrics` **harness** (`role-conformance` series): committed baseline under `tools/metrics/baselines/role-conformance/`, ephemeral run output under `tmp/metrics/role-conformance/`. A new `tools/audits/` tree is rejected (it would fork the metrics taxonomy).

## Authority

| Topic                          | Authority                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Suffix vocabulary + per-dir table | [`CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md) § File Naming (the doc 018 reconciles to)   |
| Tools taxonomy + metrics lifecycle | [`TOOLS_GUIDE.md`](../../guides/TOOLS_GUIDE.md) (harnesses → `packages/ops/src/metrics/harnesses/`; baselines → `tools/metrics/baselines/`; ephemeral → `tmp/metrics/`) |
| Metric-harness precedent       | `packages/ops/src/metrics/harnesses/perf/perf.script.ts`; `mise.toml` `perf` task (`baseline`/`compare`) |
| FCIS layer (I/O lives in shell)| [`FCIS.guide.md`](../../guides/FCIS.guide.md), [`CLAUDE.md`](../../../CLAUDE.md)                      |
| ls-lint enforcement mechanism  | `.ls-lint.yml`; 017 COH-3 spike                                                                       |
| Doc authority (specs ephemeral)| [`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md)                                                   |
| Backlog being reconciled       | [`TODO.md`](../../../TODO.md) § P2 / § P3                                                             |
| Completion gate                | `mise run spec ready ${featureDir} --key ${catalogKey}`                                               |

## Out of scope

- The **bulk** renames (every dir beyond the pilot) — scoped + sequenced by 018, executed as roadmap PRs later.
- The **`App` god-class split** (P3-1) and **full `features/` tree** (P3-16) — remain their own specs; the roadmap orders them.
- Any **behavioural** change. The pilot + ls-lint + harness are rename/enforce/measure only; specs pass unchanged.
- A new `tools/audits/` tree (folds into `tools/metrics`); relocating guides to `assets/docs/` (rejected).
- Adding ls-lint enforcement to any **has-violations** dir (would lock a wrong target — ROLE-4).
- Making the harness a **hard gate** that fails CI now — 018 ships it as a tracked metric with regression *reporting*; promotion to a blocking gate is a roadmap decision.

## Glossary

| Term                  | Meaning                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **role suffix**       | The `.<role>.ts` segment declaring a file's artifact role (`.service`, `.adapter`, …) per `CODESTYLE_GUIDE`.     |
| **mislabeled `.util`**| A `.util.ts` that is not a pure stateless helper — detected mechanically by importing an I/O module (`node:*`, `bun:sqlite`, `electrobun/*`, `Bun.$`/spawn, `fetch`) or holding state. |
| **role-conformance metric** | The `tools/metrics` series 018 introduces: per-file role classification + aggregate counts, compared to a committed baseline. |
| **conformant dir**    | A dir where the metric confirms **every** file already carries its correct role suffix (0 renames needed).       |
| **has-violations dir**| A dir with ≥1 mislabeled file; excluded from 018 enforcement, assigned to a roadmap PR.                          |
| **single-word doctrine** | Prefer a single-word filename licensed by its suffix; carry shared qualifiers in a subfolder, not a compound name. |

---

# Plan half

## REQUIREMENT ROLE-1: Role-conformance metric harness + first baseline

**Slice:** MVP

**User story:** As a maintainer, I want a repeatable metric that classifies every
`.util.ts` by its true role and tracks conformance over time, so drift is visible
and renaming rests on reproducible evidence.

### Acceptance criteria

1. WHEN the harness is built, THEN `packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.ts` (+ co-located `.script.spec.ts`) SHALL scan `src/` and emit, for each `.util.ts` non-spec file, a classification row (`path`, `imports-IO?`, `holds-state?`, `external-importers`, verdict `keep-util | rename→<suffix> | move→<dir>`) to an ephemeral report under `tmp/metrics/role-conformance/`.
   - **Measure:** Running the harness writes a report covering **every** `.util.ts` non-spec file (`find src -name '*.util.ts' ! -name '*.spec.*' | wc -l` == report rows; **99** at the first baseline).
   - **Evidence:** `bun test packages/ops/src/metrics/harnesses/role-conformance` green; a sample run report committed-by-reference in the roadmap.

2. WHEN the harness computes aggregates, THEN it SHALL emit the **success metrics** `{ mislabeledUtilCount, utilPurityRatio, enforcedDirRatio, suffixViolations }` and write a committed baseline `tools/metrics/baselines/role-conformance/baseline.json` mirroring the `perf` baseline shape (`timestamp`, `git_sha`, `bun_version`, `thresholds`, `results`, `violations`, `summary`).
   - **Measure:** `baseline.json` exists with those four `results` keys; `mislabeledUtilCount` matches the report's `rename→` count.
   - **Evidence:** Committed `baseline.json`; metric definitions documented (ROLE-6).

3. WHEN the harness is invoked, THEN a `mise` task SHALL run it with `baseline` and `compare` subcommands (mirroring `perf`), where `compare` re-runs the metric and flags **regression** (any metric worse than the committed baseline) without failing CI by default.
   - **Measure:** `mise run audit roles compare` exits 0 on no-regression and reports a non-zero `violations` array on regression; `--write-baseline` refreshes the committed file.
   - **Evidence:** `mise.toml` task wiring; harness `compare` path covered by spec.

4. WHEN the per-file classification is produced, THEN it SHALL be the single input that ROLE-2 (vocabulary gaps), ROLE-3 (roadmap worklist), and ROLE-4 (conformant allowlist) consume — no second hand-maintained audit.
   - **Measure:** ROLE-3/ROLE-4 cite the harness report, not a separate doc.
   - **Evidence:** Cross-reference in roadmap + `.ls-lint.yml` rationale.

---

## REQUIREMENT ROLE-2: Finalize vocabulary + naming doctrine + decision record

**Slice:** MVP

**User story:** As a maintainer, I want the role vocabulary and naming doctrine
finalized and recorded so the taxonomy can't silently drift.

### Acceptance criteria

1. WHEN the harness report reveals roles with no fitting suffix, THEN the vocabulary SHALL be **updated/enhanced/tweaked** to cover them; at minimum 018 SHALL add **`.resolver.ts`** ("resolves an identifier/value from a lookup or the environment") and MAY add/rename others the report justifies.
   - **Measure:** Each new/changed suffix has a one-line definition + example in the table.
   - **Evidence:** `CODESTYLE_GUIDE` § File Naming diff.

2. WHEN file names are chosen, THEN the guide SHALL state the **single-word doctrine**: prefer a single-word name licensed by its suffix; when a qualifier is shared by 2+ files, introduce a **subfolder** carrying it; merge into one file only when the files are one abstraction; compound names are a last resort.
   - **Measure:** Doctrine appears in `CODESTYLE_GUIDE` with the handoff `frontmost/`/`terminal/` subfolders as the worked example.
   - **Evidence:** Guide diff.

3. WHEN `.util` is (re)defined, THEN the guide SHALL state explicitly that `.util` is reserved for **pure, stateless, side-effect-free** helpers; shell I/O artifacts MUST use a role suffix.
   - **Measure:** The `.util` row carries the purity constraint (and matches the harness's mechanical detector).
   - **Evidence:** Guide diff.

4. WHEN vocabulary + doctrine are finalized, THEN they SHALL be recorded as `assets/guides/adr/0001-role-suffix-taxonomy.md` (Context/Decision/Consequences) cross-linked from `CODESTYLE_GUIDE`; `assets/guides/adr/` is a new subfolder of the doctrine SSOT, not a relocation.
   - **Measure:** ADR exists under `assets/guides/adr/`; `CODESTYLE_GUIDE` links it; no guide files moved.
   - **Evidence:** Committed ADR + cross-link.

---

## REQUIREMENT ROLE-3: Multi-PR roadmap + `TODO.md` reconciliation

**Slice:** MVP

**User story:** As a maintainer, I want a sequenced migration plan (driven by the
metric + vocabulary) that rewrites the backlog so it guides all later work.

### Acceptance criteria

1. WHEN the roadmap is written, THEN `assets/specs/018-architecture-role-taxonomy/migration-roadmap.md` SHALL define dependency-ordered PR slices (each = one dir/cluster: rename + relocate + add ls-lint rule, behaviour-frozen) with a per-PR file-count cap, the pilot as **PR-0**, and ROLE-4 (conformant locks) as foundation; the durable sequence SHALL be written into `TODO.md` (the permanent backlog), with the spec-dir roadmap as the working derivation.
   - **Measure:** Every has-violations dir from the harness report is assigned to exactly one PR; each PR lists files, target suffixes/subfolders, and gate command.
   - **Evidence:** Committed roadmap + `TODO.md` diff; coverage cross-checked against the report.

2. WHEN reconciled with `TODO.md`, THEN the roadmap SHALL map each slice to the P-items it satisfies and **rewrite** the P3 ordering: subsume **P3-7** and the naming half of **P2-9**; sequence ahead of **P3-1** (App split) and **P3-16** (`features/` tree); cross-reference **P3-12/P3-13/P3-15/P3-5**.
   - **Measure:** `TODO.md` P3 updated (items reordered/annotated "→ 018 PR-N" or "subsumed by 018"); no P-item silently dropped.
   - **Evidence:** `TODO.md` diff + reconciliation table.

3. WHEN a slice would conflict with FCIS or a larger P3 item, THEN the roadmap SHALL record the dependency rather than force an out-of-order move.
   - **Measure:** Each cross-cutting dependency recorded.
   - **Evidence:** Roadmap dependency notes.

---

# Execute half

## REQUIREMENT ROLE-4: Lock the already-conformant dirs (ls-lint)

**Slice:** MVP

**User story:** As a maintainer, I want drift caught immediately in already-clean
dirs without blocking the staged roadmap.

### Acceptance criteria

1. WHEN the harness marks a dir **conformant**, THEN `.ls-lint.yml` SHALL gain a basename-regex rule (017 COH-3 style) permitting exactly the role suffixes its files already carry, and `bun run lint:ls` SHALL report **0 new failures**.
   - **Measure:** Added rules cover every conformant dir; `bun run lint:ls` exit 0.
   - **Evidence:** `.ls-lint.yml` diff (additive); green lint.

2. WHEN a dir is **has-violations**, THEN 018 SHALL **NOT** add a rule for it (its rule lands in its roadmap PR), preventing a premature rule from locking a wrong target.
   - **Measure:** No `.ls-lint.yml` rule added for any has-violations dir.
   - **Evidence:** Cross-check diff against the harness dir-classification.

3. WHEN ROLE-4 lands, THEN Biome/dependency-cruiser/knip configs SHALL be unchanged.
   - **Measure:** `git diff biome.jsonc .dependency-cruiser.cjs knip.jsonc` empty.
   - **Evidence:** Diff.

---

## REQUIREMENT ROLE-5: Pilot slice — `src/shell/main/handoff`

**Slice:** MVP

**User story:** As a maintainer, I want one folder fully converted (applying the
single-word doctrine) as the worked example every roadmap PR copies.

### Acceptance criteria

1. WHEN the pilot lands, THEN `src/shell/main/handoff` SHALL match this conformant, single-word layout (behaviour-frozen; importers + co-located specs updated): `registry.service.ts` (was `handoff_registry.service.ts`), `clipboard.port.ts` (was `electrobun_clipboard.port.ts`), `browser.adapter.ts` / `editor.adapter.ts` / `xdotool.adapter.ts` (were `*_handoff`/`*_available.util.ts`), `frontmost/app.resolver.ts` (was `resolve_frontmost_app.util.ts`), `frontmost/paste.adapter.ts` (was `paste_frontmost_handoff.util.ts`), `terminal/app.resolver.ts` (was `resolve_terminal_app_name.util.ts`), `terminal/command.adapter.ts` (was `terminal_handoff.util.ts`).
   - **Measure:** `find src/shell/main/handoff -name '*.util.ts' ! -name '*.spec.*'` → empty; `rg -rn 'handoff_registry|electrobun_clipboard|browser_handoff|editor_handoff|terminal_handoff|paste_frontmost_handoff|resolve_frontmost_app|resolve_terminal_app_name|xdotool_available' src` → 0.
   - **Evidence:** `bun test src/shell/main/handoff` + `bun run typecheck` green, no behavioural edits.

   > Leaf words (`command`, `paste`, `app`) are the proposed doctrine application; the pilot MAY refine a leaf word if content warrants, but suffix + subfolder structure are fixed.

2. WHEN the pilot dir is converted, THEN `.ls-lint.yml` SHALL gain rules permitting `.service`, `.port`, `.adapter` (+ `index`) for `src/shell/main/handoff` and `.adapter`, `.resolver` for `…/handoff/frontmost` and `…/handoff/terminal`; `bun run lint:ls` SHALL be green.
   - **Measure:** Rules present for the dir + two subdirs; lint exit 0.
   - **Evidence:** `.ls-lint.yml` diff.

3. WHEN the pilot lands, THEN handoff behaviour SHALL be unchanged, AND re-running `mise run audit roles compare` SHALL show `mislabeledUtilCount` reduced by 5 (19 → 14) and `totalUtil` reduced by 7 (99 → 92) versus the ROLE-1 baseline — the 2-file gap is expected because `resolve_frontmost_app.util.ts` and `resolve_terminal_app_name.util.ts` were pure (no I/O imports) and thus not mislabeled, though they still leave the `.util.ts` scan when renamed to `.resolver.ts`.
   - **Measure:** No assertion changes beyond import/filename edits; compare shows `mislabeledUtilCount −5` and `totalUtil −7`.
   - **Evidence:** `bun test src/shell/main/handoff` green; harness compare output.

---

## REQUIREMENT ROLE-6: Drift-sync guides + agent files

**Slice:** MVP

**User story:** As a maintainer, I want guidance docs, agent entrypoints, and the
tools taxonomy to match the finalized taxonomy + new metric.

### Acceptance criteria

1. WHEN ROLE-2 finalizes the vocabulary, THEN `CODESTYLE_GUIDE` § File Naming SHALL include the new/changed suffixes, the single-word doctrine (handoff subfolder example), and the tightened `.util` definition.
   - **Measure:** Table rows + doctrine present; `.util` purity constraint stated.
   - **Evidence:** Guide diff.

2. WHEN the metric is introduced, THEN `TOOLS_GUIDE` SHALL document the `role-conformance` series (harness path, baseline path, `mise run audit roles`, the four success metrics + cadence) alongside `perf`/`e2e-quality`.
   - **Measure:** A `role-conformance` row/section in `TOOLS_GUIDE` metrics taxonomy.
   - **Evidence:** Guide diff.

3. WHEN agent entrypoints reference naming, THEN `CLAUDE.md` and `AGENTS.md` SHALL point at the updated `CODESTYLE_GUIDE` without restating a stale vocabulary (guides win per DOC_AUTHORITY); ROLE-6 changes SHALL be documentation-only.
   - **Measure:** `rg -n 'util|suffix|naming' CLAUDE.md AGENTS.md` references the guide; only `.md` changed in ROLE-6.
   - **Evidence:** Agent-file diff; `mise run spec ready` green.

---

## Cross-requirement rules

- **Behaviour frozen.** Product-code change = the pilot rename only. The harness is tooling (`packages/ops`); ls-lint rules are additive. Every existing spec passes without behavioural edits.
- **Additive ls-lint only.** Rules added for conformant dirs + the pilot dir/subdirs; none removed/loosened. Other rule configs frozen.
- **No big-bang.** 018 renames only the pilot; the roadmap stages the rest (honours P3-16).
- **Specs are ephemeral.** Durable outputs go to permanent homes: metric → `tools/metrics`, decision → `assets/guides/adr/`, backlog → `TODO.md`. The `assets/specs/018-*` dir holds only the spec + working roadmap derivation.
- **Metric drives enforcement.** A dir is enforced in 018 **iff** the harness marks it conformant.

---

## Quantified gains (targets + measurement)

Tracked by the `role-conformance` baseline; one-off checks against
[`baseline-metrics.txt`](./baseline-metrics.txt).

| Metric / outcome                           | Baseline | Target (018) | Source |
| ------------------------------------------ | -------: | -----------: | ------ |
| `.util.ts` files classified                |       99 |    every run | harness report rows |
| `mislabeledUtilCount` (baseline established)|       ? |  recorded + ↓ by 5 after pilot | `baseline.json` `results` |
| `utilPurityRatio`                          |        ? |     recorded, trend ↑ | `baseline.json` |
| `enforcedDirRatio` (ls-lint coverage)      |   low   |     ↑ (all clean dirs) | `baseline.json` |
| Pilot dir mislabeled `.util`               |        7 |            0 | `find src/shell/main/handoff -name '*.util.ts' ! -name '*.spec.*'` |
| `.util` reserved for pure helpers (guide)  | implicit |       stated | `CODESTYLE_GUIDE` diff |
| TODO.md P3 reconciled (not dropped)        |        — |          all | `TODO.md` diff + roadmap table |

> The `?` baselines are **established by ROLE-1's first run** (that is the point of
> the metric); the spec's target is "recorded + a committed baseline to compare
> against," with the pilot proving a measurable −5 on `mislabeledUtilCount`
> (`totalUtil` drops −7, but two renamed files were pure — so only −5 mislabeled).

### Structural / qualitative gains (assertable)
| Dimension       | Concrete improvement |
| --------------- | -------------------- |
| **Repeatable**  | The audit is a tracked `tools/metrics` series (run/report/compare), not a one-off doc — drift/decay is visible every run and regression is flagged against the baseline. |
| **Honest**      | The pilot proves the taxonomy on real code (handoff = `.service` dispatching `.adapter` strategies via a `.port`, `frontmost/`+`terminal/` subfolders keeping every filename single-word). |
| **Enforced**    | ls-lint locks every already-clean dir (017 COH-3 mechanism, 0 failures). |
| **Backlog-driven** | The roadmap rewrites `TODO.md` P3 into an ordered, reviewable, no-big-bang migration that drives every later PR. |
| **Drift-proof** | Decision in `CODESTYLE_GUIDE` + `assets/guides/adr/`; metric in `TOOLS_GUIDE`; `CLAUDE.md`/`AGENTS.md` reconciled. |

---

## Definition of Done (gate)

1. All ROLE-1 … ROLE-6 acceptance criteria met with evidence.
2. `role-conformance` harness (`packages/ops/src/metrics/harnesses/role-conformance/`) + committed `tools/metrics/baselines/role-conformance/baseline.json` + `mise run audit roles` wired; `migration-roadmap.md`, `assets/guides/adr/0001-role-suffix-taxonomy.md`, and `closeout-metrics.txt` committed.
3. Pilot dir `src/shell/main/handoff` matches the ROLE-5 single-word layout; 0 mislabeled `.util`; handoff suite green; behaviour unchanged; `compare` shows `mislabeledUtilCount −5`.
4. `.ls-lint.yml` additive (conformant dirs + pilot dir/subdirs); `git diff biome.jsonc .dependency-cruiser.cjs knip.jsonc` empty.
5. `CODESTYLE_GUIDE`, `TOOLS_GUIDE`, `CLAUDE.md`, `AGENTS.md`, and `TODO.md` P3 updated; no P-item silently dropped; no guide files relocated.
6. Catalog key `arch_role_taxonomy` registered; `mise run spec ready assets/specs/018-architecture-role-taxonomy --key arch_role_taxonomy` green.
7. No behavioural diff: every pre-existing spec passes without behavioural edits.

## E2e declaration (optional — pointers only)

Not applicable. Tooling + a behaviour-frozen rename pilot + doc updates;
acceptance is unit specs + lint + harness + doc review, not Playwright e2e —
matching predecessors `014`–`017`.

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | None     | Closed |       |
