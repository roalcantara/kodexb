## The reframe that unlocks this

You're treating one document (`design.md`) as if it has a single identity, but it has two over its life:

- **Forward contract** (in-flight): "here is what we *will* build." Audience: the implementing agent. Mutable. Belongs in the scratchpad.
- **As-built record** (shipped): "here is what we *did* build and the contracts that now constrain change." Audience: any future agent touching that area. Near-immutable. Belongs somewhere permanent and linkable.

The IEEE/ISO **as-built / baseline** distinction is exactly this, and it dissolves your ast-grep contradiction: permanent entrypoints aren't being blocked from "good docs," they're being blocked from *forward contracts that are still scratchpads*. Once the durable subset is promoted to an as-built record, linking to *that* is fine. The rule was never wrong; you were just missing the promotion target.

Second reframe: "implementor detail" is not one thing. Split it:

- **Behavioural contract** (⌘P vs ⌘K, mutual exclusion, Enter/snapshot) → this is a *living specification*. Gherkin is its natural home because it can't drift silently — it's executed.
- **Implementation contract** (`filterRows` order, util names, focus-restore timing, touch points) → push as much as possible into **tests/types/ast-grep**, where it's machine-enforced. The *irreducible prose residue* (rationale, gotchas, "why this order") is the only thing that genuinely needs a prose home.

That principle — *encode what you can, write down only what you can't* — is what keeps any of the options below from becoming a maintenance sink.

---

## Option A — As-built catalog (promote-and-stub)

**Layers**
- `assets/docs/specs/NNN-<slug>/` — scratchpad. Draft→active only. Never linked by permanent docs.
- `assets/guides/` — timeless process ("how we build *any* feature"). Golden paths.
- `assets/catalog/<slug>.md` — **new**: durable as-built record per shipped feature. The prose residue + links to Gherkin + links to code. Near-immutable, linkable.
- `assets/features/e2e/*.feature` — canonical behaviour (living spec).
- `README.md` — onboarding + a link to the catalog index. No feature matrices.

**Lifecycle.** On ship (DoD gate): the implementing agent/human promotes the durable subset of `design.md` into `catalog/<slug>.md`, moves any README behaviour table into Gherkin, and **stubs** the spec folder with a tombstone (`SHIPPED → see assets/catalog/<slug>.md`). Superseded (B replaces A): A's catalog entry gets `status: superseded-by: <B-slug>`, kept as a tombstone (agents reasoning about rename migrations *need* the trail), spec folder archived.

**Agent routing** (`AGENTS.md`/skills):
> Need process/conventions? → read `guides/`.
> Need a shipped feature? → read `catalog/index` (cheap list), then `catalog/<slug>.md` + its linked `.feature`.
> Implementing in-flight feature Y? → read **only** `specs/NNN-Y/` named by the task.
> Never read `specs/*` otherwise.

**Index.** Extend `library_manifest.json` (or a `catalog/manifest.json`) with `{slug, title, status, catalog_path, feature_files[], superseded_by?}`. Generate `catalog/index.md` from it. Agents list features here, not by scanning 45 folders.

**Duplication policy.** One source per fact: Gherkin is canonical for behaviour; catalog *links to scenario IDs*, never restates them normatively; README links, never restates; impl rules live in tests/types where checkable, catalog holds only residue. House rule: *if two docs state the same normative rule, one of them is a link.*

**Enforcement.** Keep the ast-grep "no links into `specs/*`." Add: (a) ship gate — can't mark shipped unless a catalog entry exists, is in the manifest, and behaviour is covered by ≥1 `.feature`; (b) lint forbidding feature behaviour tables in README/guides (e.g. heading/table-shape pattern); (c) manifest schema validation in CI.

**Tradeoffs.** Promotion is real human/agent work per ship (~30 min). But token cost at read-time is low (small stable entrypoints + lazy feature loading), human readability is high, migration is incremental. Best fit when features have genuine prose residue worth keeping.

---

## Option B — Living-spec-first / minimal prose (Gherkin + ADR, no as-built encyclopedia)

**Layers.** `guides/` (process) + `*.feature` (behaviour, canonical) + `assets/decisions/NNN-<slug>.md` (ADRs for *why*) + code/tests/types (impl contract, enforced). **No per-feature as-built tree.** specs/ folders are stubbed or deleted on ship.

**Lifecycle.** On ship: extract durable *decisions* from `design.md` into an ADR; ensure behaviour is in Gherkin and impl contracts are in tests/types/ast-grep; delete the spec folder (git holds history). Superseded → new ADR supersedes old (`Status: Superseded by ADR-NNN`), standard ADR practice.

**Routing.** Process → `guides/`. What does feature X *do*? → grep `.feature`. *Why* is it built this way? → ADR index. Implementing Y → `specs/NNN-Y/`.

**Index.** Generated from feature files (tags → feature map) + ADR index. No separate catalog to maintain.

**Duplication.** Near-zero by construction: behaviour only in Gherkin, decisions only in ADRs, contracts only in checks. The bet is that *almost nothing* needs standalone prose.

**Enforcement.** Same ast-grep + ship gate ("behaviour covered by Gherkin, decisions captured as ADR, spec folder removed").

**Tradeoffs.** Lowest maintenance and token cost; highest discipline required. Fails when a feature has legitimate prose ("focus-restore timing is 16ms because of X repaint quirk") that isn't a decision, isn't behaviour, and is awkward to encode as a test comment. Those land in ADRs as a slight abuse of the form.

---

## Option C — Single catalog, stub everything else (simplest)

The "single catalog + stub everything" you hinted at. One durable place: `docs/features/<slug>.md` per shipped feature, holding behaviour summary *and* as-built notes, linking out to `.feature` files and code. `specs/` is purely a working dir, always stubbed on ship. README links only to the catalog index. Guides untouched. No ADR tree (decisions go in a `## Decisions` section of the feature doc).

**Tradeoffs.** Fewest moving parts, easiest to explain to agents, one routing target for "shipped." Risk: each feature doc becomes a mini-encyclopedia and behaviour drifts from Gherkin unless you're strict about "summary + link, never restate." Good for a small team that won't sustain three doc types.

---

**Option D (sketch), if the app grows into many modules:** a Backstage-style two-plane split — `guides/` as the "how we build" plane (golden paths) and a service/feature catalog as the "what exists" plane, ADRs cross-cutting. arc42's discipline of *section separation* (never mix process with instance) is the principle. Overkill at 1–3 humans today; worth revisiting if the renderer splits into independently-owned modules.

---

## How the named patterns map

As-built/baseline = the whole Option A premise (separate the built record from the forward contract). ADR vs RFC = decisions vs proposals — both survive shipping and cross-cut features (your `design.md` is currently *fusing* RFC + ADR + as-built into one file, which is the root mess). Backstage = the manifest/catalog plane. arc42 = don't put feature instances inside process sections. Inner-source RFC→merged→archive = your draft→active→shipped→superseded lifecycle. Docs-as-code golden paths vs reference implementations = **guides are golden paths (abstract), catalog entries are reference implementations (concrete)** — that's your guides-vs-shipped line, cleanly. BDD living spec vs prose = behaviour goes executable, prose only for residue.

## Recommended default (1–3 humans, many agents)

**A hybrid of A and B.** Concretely:

- **Behaviour → Gherkin, canonical.** Catalog/README only *link* to scenario IDs.
- **Decisions → ADRs** (`assets/decisions/`). Cheap, durable, supersedable.
- **As-built residue → a thin catalog entry** (`assets/catalog/<slug>.md`) — only the prose that isn't behaviour, isn't a decision, and isn't machine-checkable. Many features will have an almost-empty one, which is the correct signal.
- **Encode aggressively**: file touch points and rename migrations belong in ast-grep/tests, not prose.
- **Spec folders stubbed on ship, archived when superseded, never deleted** (agents reason over migration history).
- **Routing**: guides always; catalog index (list only) cheaply; individual feature record + its Gherkin *only when a task names the slug*. This is the token-cost win — feature detail is lazy-loaded, not read on every task.

This keeps three small stable entrypoints (guides, catalog index, ADR index), pushes drift-prone detail into executable form, and gives the irreducible prose exactly one home.

## Minimal migration (first 3 steps, no big-bang)

1. **Pilot one feature.** Create `assets/catalog/` + a `status` field in the manifest. Take `014-command-palette-filter-ux`: promote its durable `design.md` residue into `catalog/014-...md`, capture any real decisions as ADR(s), point README at the catalog index, **stub** the `specs/014-...` folder with a tombstone.
2. **Kill the README table.** Move 014's behaviour matrix into Gherkin scenarios; replace the README table with a link to the catalog entry. Add the lint: permanent docs link only to `guides/`, `catalog/`, `decisions/` — never `specs/*`, never inline feature matrices.
3. **Add the ship gate to DoD.** A feature can't be "shipped" until: catalog entry exists + in manifest, behaviour covered by ≥1 `.feature`, spec folder stubbed. Then migrate the remaining shipped features **lazily** — only when an agent next touches one. The 45 folders never get a big-bang pass.

## Optional: controlled vocabulary for the migration CSV

| column        | values                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `handle`      | `scratchpad` · `promote` · `merge` · `stub` · `archive` · `supersede` · `index` · `keep` · `delete` |
| `target`      | destination path, or `n/a` (for `scratchpad`/`delete`)                                              |
| `kind`        | `behaviour` · `impl-contract` · `decision` · `process` · `onboarding`                               |
| `canonical`   | `yes` / `no` — is this the single source for the fact?                                              |
| `enforced_by` | `gherkin` · `test` · `type` · `astgrep` · `manifest` · `none`                                       |
| `supersedes`  | slug or blank                                                                                       |

`enforced_by: none` + `kind: impl-contract` is your audit flag — those rows are the prose residue that genuinely needs a catalog entry; everything else should resolve to a check or a Gherkin scenario.

---

**Main topics of this reply** (the part you asked me to "read out"): the design.md identity split (forward contract vs as-built record); splitting "implementor detail" into behaviour→Gherkin vs impl-contract→machine checks vs prose residue→catalog; three governance options (as-built catalog, living-spec-first, single-catalog-stub) plus a Backstage sketch; mapping to as-built/ADR/Backstage/arc42/BDD patterns; a recommended A+B hybrid with lazy-loaded routing; a three-step non-big-bang migration starting with feature 014; and a controlled vocabulary keyed on `handle`/`kind`/`enforced_by`.

One thing I'd push on before you build any of this: how much of `014`'s `design.md` is *truly* prose residue versus stuff that should've been a test or an ast-grep rule? If you paste it, I'll sort it into the `enforced_by` columns and you'll see how thin the catalog entry actually needs to be.
