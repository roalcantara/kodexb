<!-- markdownlint-disable-file -->

# Governance design — Claude evaluation

**Subject:** [design.md](design.md) (kb default governance contract)
**Evaluator:** Claude (external audit)
**Status:** Review artifact — not normative; informs rollout before ~45-feature migration
**Related:** [requirements.md](requirements.md) · [summary_01.md](summary_01.md) · [review_prompt.md](review_prompt.md)

---

## Executive summary

The governance model is **directionally sound**: tag-only catalog, dual executable SOT (Gherkin + unit specs), single identifier (`catalog key` = `@<key>`), and explicit supersession. The main risk is not bad architecture — it is **policy without enforcers**. Most rules live in prose and checklists; only a few are machine-checked today.

**Verdict:** Do **not** start repo-wide rollout until **`mise run catalog validate`** exists and tag placement is enforced. Fix **skill registry contradictions** (Gherkin canonical vs `bdd-gherkin-specification` rationale) in the same tranche. Close the **`assets/specs/*` inbound-link** ast-grep gap before Spec Kit becomes the default in-flight tree.

| Dimension         | Assessment                                                                           |
| ----------------- | ------------------------------------------------------------------------------------ |
| Architecture      | Strong — right calibration for executable-first governance                           |
| Enforcement       | Weak — largest gap; ~12 rules lack automated checks                                  |
| Ambiguity         | Medium — post-ship change, `active` status, multi-tag policy need explicit text      |
| Legacy tooling    | Manageable — `trace.ts`, `@spec:`, `BDD_GHERKIN_GUIDE.md` need coordinated migration |
| Rollout readiness | **Not ready** without validate + tag rules + skills alignment                        |

---

## 1. Enforcement gaps

Rules documented in design that lack (or weakly implement) automated enforcement.

| Rule (source)                                                            | Gap                                                                                              | Minimal fix                                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **`enforced_by: none` is a ship blocker** (design §Dual SOT, §Lifecycle) | DoD checklist only; no script parses requirements trace; false `enforced_by: gherkin` undetected | `mise run catalog validate --feature <key>`: error on `none`; verify Gherkin claims resolve to tagged `.feature` scenarios |
| **Tag placement contract** (design §Tag linking)                         | `grepPathsWithTag` uses `text.includes(want)` — tag anywhere in file counts                      | Line-anchored matching: Gherkin → tag line above `Feature:`; units → `// @<key>` as first non-blank line; ast-grep backup  |
| **Orphan tags / zero-hit shipped rows**                                  | `test tag --list` prints `(none — add @<key>…)` but exits 0                                      | `catalog validate`: error if `status: shipped` and zero tag hits; warn on orphan `@` tokens not in catalog                 |
| **Inbound ban on `assets/specs/*`** (closed decision 10)                 | Rules named `no-inbound-assets-docs-*` likely cover legacy tree only                             | Mirror as `no-inbound-assets-specs-*.yml`; CI asserts both rule sets exist                                                 |
| **Catalog schema** (forbidden fields: `features`, `units`, prose)        | No schema; re-adding path lists is silent                                                        | TypeBox or TS validator in `catalog validate --schema`                                                                     |
| **Grep-safe keys** (design line 73)                                      | Substring collisions (`sync` vs `sync_ui`) undetected                                            | Reject keys where run tags are substrings of each other                                                                    |
| **Key stability after ship**                                             | Renames break tags silently                                                                      | `catalog.lock.yaml` at promotion; validate rejects shipped key removal without `superseded_by`                             |
| **Legacy `@spec:` removal on promotion** (decision 9)                    | Both indexes can coexist on same `.feature`                                                      | ast-grep: no `@spec:` when `@<catalog-key>` present; one-shot burn list                                                    |
| **Spec folder stubbed on ship**                                          | Checklist only                                                                                   | Validate: shipped row → legacy `design.md` exists, stub marker present                                                     |
| **README behaviour-table ban**                                           | Policy only                                                                                      | ast-grep heuristic on README matrix patterns                                                                               |
| **Catalog status state machine**                                         | `shipped` → `active` allowed silently                                                            | Lockfile + allowed transitions only                                                                                        |
| **`enforced_by` trace location**                                         | Implied in legacy `requirements.md`; shape undefined                                             | Standardize parseable table in Spec Kit `spec.md` **or** ID-only trace in catalog                                          |

---

## 2. Drift vectors

Ranked by **likelihood × impact**.

| Rank | Vector                                                    | L × I            | Notes                                                                                                                                         |
| ---- | --------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `enforced_by: none` / false-positive traces               | High × High      | No machine check between typed trace and real scenarios                                                                                       |
| 2    | Skill registry contradicts governance                     | Certain × High   | `bdd-gherkin-specification` says Gherkin is *not* canonical; missing `spec-driven-development`, `feature-discovery`, `feature-catalog` skills |
| 3    | Forgotten tags on new specs                               | High × Medium    | New unit spec without `// @key` — incomplete set invisible unless someone runs `test tag --list`                                              |
| 4    | Tag placement drift                                       | High × Medium    | Permissive grep → tags in comments, describes, mid-file                                                                                       |
| 5    | Playwright `--grep` substring collisions                  | Medium × High    | `@sync` matches `@sync_ui`                                                                                                                    |
| 6    | Legacy `@spec:` parallel index                            | High × Medium    | 15 `.feature` files already carry it; no deadline                                                                                             |
| 7    | Shared-spec multi-tag policy undefined                    | Medium × Medium  | First cross-feature util invents ad hoc convention                                                                                            |
| 8    | Catalog YAML field regrowth                               | Medium × High    | `features: [...]` returns without schema                                                                                                      |
| 9    | Dual spec trees (`assets/specs/` vs `assets/docs/specs/`) | Medium × Medium  | `specs:` field tree-of-origin ambiguous                                                                                                       |
| 10   | Post-ship change workflow undefined                       | Certain × Medium | First P1 bug will be improvised                                                                                                               |
| 11   | Catalog key renames                                       | Low × Very high  | One rename breaks all discovery                                                                                                               |
| 12   | `test tag` always runs `e2e:bddgen`                       | Low × Low        | Noisy diffs locally                                                                                                                           |

---

## 3. Ambiguities to resolve in design.md

1. **`status: active` vs “catalog = shipped registry”** — Drop `active` from enum or document pre-registration semantics and ship-gate exemption.
2. **`specs:` field tree-of-origin** — Prefix paths (`docs/specs/…` vs `specs/…`) or split into two fields.
3. **Bugfix after ship** — Test-only vs reopen spec vs new Spec Kit folder: add §Post-ship change (small fix → tagged executables; behaviour change → new slug / supersession).
4. **“Feature line” tag location** — Tighten to “line immediately preceding `Feature:`”.
5. **Multiple tags per file** — Consecutive `// @<key>` lines (units); space-separated tags above `Feature:` (Gherkin).
6. **Ship gate “must list every file you expect”** — Unfalsifiable without manifest; use provenance artifact or rewrite as “no `enforced_by: none`”.
7. **`archived` vs `superseded`** — When each applies; spell out.
8. **Human-browsable catalog** — Generate `INDEX.md` from YAML vs README one-liner.
9. **Spec Kit `spec.md` after ship** — Freeze at promotion; catalog references as historical record.
10. **e2e step catalog / fixture manifest** — Subordinate to Gherkin, not peer SOT.

---

## 4. Shared code / multi-feature ownership

| Issue                                         | Recommendation                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Util tested under two features                | **Option A:** multiple consecutive line-1 tags (`// @a` then `// @b`)                 |
| Cross-feature Gherkin scenarios               | Allow scenario-level tags **only** when scenario crosses features; document exception |
| `--grep` collisions                           | Catalog-validate substring check **and** word-boundary regex in `test tag` (`@key\b`) |
| Overlapping legacy `specs:` on split features | Explicitly allowed in schema prose                                                    |

---

## 5. Supersession and post-ship change

### Supersession (when A → B)

| Question                   | Recommendation                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Tags on superseded files   | **Never rename** — keep `@a`; new tests use `@b`; catalog `superseded_by` is the link                        |
| Gherkin scenario fate      | If B replaces wrong A → delete A’s scenarios in supersession PR; if B evolves A → keep or rewrite explicitly |
| Bidirectional consistency  | Validate: B lists `superseded_by: A` ⇒ A should flip to `superseded` with pointer to B                       |
| `assets/specs/` fate for A | Archive / stub-equivalent when superseded                                                                    |
| Status timing              | Flip A to `superseded` when B ships; A’s tests may outlive as historical assertions                          |

### Post-ship change (non-supersession)

- **Small fix / edge case** → add tagged Gherkin or unit spec; no new spec folder.
- **Behaviour change with rationale** → new Spec Kit folder; supersession workflow if replacing old behaviour entirely.

---

## 6. Legacy tooling conflicts

| Tool / doc                  | Conflict                                                 | Migration                                                                                        |
| --------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `library_manifest.json`     | Different scope from `catalog.yaml`; agents may conflate | Hide from agent routing now; retire after legacy stub sweep                                      |
| `tools/spec/trace.script.ts`       | Expects `@spec:<slug>`; fails silently after promotion   | Document split: trace.ts = in-flight; `test tag --list` = shipped; retire after 45-feature sweep |
| `BDD_GHERKIN_GUIDE.md`      | Mandates `@spec:<slug>`                                  | Add tag conventions section; never both `@spec:` and `@<key>` on same file                       |
| e2e step catalog / fixtures | Could be misread as peer SOT                             | One line in design §Dual SOT: subordinate to Gherkin                                             |
| Spec Kit trace tables       | Live vs frozen unclear                                   | Freeze `assets/specs/NNN-<slug>/` at promotion                                                   |

**Order:** Update `BDD_GHERKIN_GUIDE.md` and [`SKILLS.yaml`](../../../catalog/SKILLS.yaml) before further promotions; hide `library_manifest.json` from routing; treat `trace.ts` as legacy until sweep completes.

---

## 7. Top 5 ship-blockers (before repo-wide rollout)

1. **`mise run catalog validate`** — closes most §1 gaps (~300 LOC TS, reuse `tools/catalog/` + `test.script.ts`).
2. **Enforce tag placement** — tighten grep + ast-grep rules.
3. **Mirror inbound-link ban for `assets/specs/*`** — close ast-grep coverage hole.
4. **Align skill registry with governance** — fix `bdd-gherkin-specification`; add `feature-discovery`, `feature-catalog`, `spec-promotion`, `spec-driven-development`.
5. **Define post-ship-change workflow** — explicit § in design.md before more features ship.

---

## 8. What looks solid

- Tag-only catalog + grep discovery (no path lists in YAML).
- Dual executable SOT by audience (Gherkin = release behaviour; unit = implementation contract).
- Single identifier (`key` = run tag); `catalogRunTag()` centralizes derivation.
- `superseded_by` as first-class lifecycle event.
- In-flight vs legacy ring-fence (both spec trees blocked from permanent docs) — **once** ast-grep coverage is complete.

---

## 9. Recommended skills and tooling

| Item                                       | Type            | Closes                     | In repo?                                                                   |
| ------------------------------------------ | --------------- | -------------------------- | -------------------------------------------------------------------------- |
| `catalog validate`                         | mise task       | §1, §7                     | **Partial** — `tools/mise/catalog.script.ts` list only; validate not built |
| `feature-catalog` skill                    | project         | schema, supersession       | **No**                                                                     |
| `feature-discovery` skill                  | project         | tags, grep, multi-tag      | **No**                                                                     |
| `spec-promotion` skill                     | project         | ship DoD, `@spec:` removal | **No**                                                                     |
| Update `bdd-gherkin-specification`         | skill re-policy | §2.2 contradiction         | **Yes** — rationale wrong                                                  |
| `spec-driven-development` skill            | project         | in-flight Spec Kit         | **No**                                                                     |
| `catalog.lock.yaml`                        | manifest        | key stability, status FSM  | **No**                                                                     |
| Ship provenance artifact                   | mise task       | falsifiable ship gate      | **No**                                                                     |
| ast-grep: tag placement                    | CI              | §1.2                       | **No**                                                                     |
| ast-grep: no inbound `assets/specs/*`      | CI              | §1.4                       | **Partial**                                                                |
| ast-grep: no `@spec:` + `@key` coexistence | CI              | §1.7                       | **No**                                                                     |
| `mise run catalog index`                   | mise task       | human browse               | **No**                                                                     |
| `mise run catalog ship`                    | mise task       | DoD wrapper                | **No**                                                                     |
| `assets/decisions/` ADR tree               | methodology     | prose decisions home       | **No**                                                                     |

### Explicitly skip

- Per-feature markdown in catalog; path lists in YAML; AshPL-style DSL; bumping generic global BDD skills to `required` (use updated `bdd-gherkin-specification` instead).

### Build-first priority

1. `catalog validate`
2. `SKILLS.yaml` + new project skills
3. Tag-placement enforcement
4. Inbound ban for `assets/specs/*`
5. ADR tree + ship provenance artifact

---

## 10. Optional deep-dive answers

1. **Tag-only vs CI manifest diff** — Tag-only is correct **if** validate exists; provenance file at promotion is the manifest snapshot.
2. **Zero hits for shipped** — `test tag --list` should exit non-zero when `status: shipped` and no hits.
3. **Line 1 vs `describe('@key')`** — Line 1 is membership contract; describe tagging allowed as finer signal, not replacement.
4. **Minimal validate pseudocode** — schema → per-entry grep → collision check → placement parse → orphan tags (~300 LOC).
5. **Non-DSL borrowings from Elicit thesis** — ship provenance file; validate-on-catalog-edit hook; optional `feature graph` mermaid from `test tag --list`.

---

## 11. Dissent (architecture note)

Closed decisions in design.md are architectural choices not expressible as Gherkin/tests/lint alone. Design prose works for **this** doc; recurring decisions (“Eden Treaty over tRPC”, lockfile vs CI artifact) need **`assets/decisions/`** as peer to `assets/guides/`. Rule unchanged: **shipped product rules** stay in executables; ADRs hold **decisions**, not behaviour specs.

---

## Cross-reference: evaluation vs current repo (snapshot)

| Evaluation claim                               | Repo state (Jun 2026)                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| SKILLS in `assets/guides/SKILLS.yml`           | **Moved** to [`assets/catalog/SKILLS.yaml`](../../../catalog/SKILLS.yaml) |
| Skill registry CLI                             | **Done** — `mise run skill validate                                       | list | …` |
| `catalog validate`                             | **Not done** — highest-leverage governance gap remains                    |
| `tools/mise/test.script.ts` + `tools/catalog/` | **Exists** — tag list/run; catalog list                                   |
| ast-grep inbound `assets/specs/*`              | **Untracked rules** exist locally; not merged / CI-gated                  |
