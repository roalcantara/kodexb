<!-- markdownlint-disable-file -->

# Handoff — Spec rework (guides-first)

**Target:** DeepSeek / any implementer agent
**Feature:** `assets/specs/009-agentic-workflow-orchestrator/`
**Branch:** `feat/009-agentic-workflow-orchestrator` (or continue current feature branch)
**Read first:** [`guides-first-review.md`](./guides-first-review.md)

## Agent prompt

```text
# Handoff — 009 spec rework (guides-first)

## Mission

Rework `assets/specs/009-agentic-workflow-orchestrator/spec.md` (and add
`plan.md` stub if missing) so the feature aligns with **guides as authority**,
not legacy specs. Produce a shippable MVP scope and clear PR slices. Do **not**
implement runtime code in this pass — spec/plan/contracts alignment only.

Full rationale: assets/specs/009-agentic-workflow-orchestrator/review/guides-first-review.md

## Authority premise (non-negotiable)

Per assets/guides/DOC_AUTHORITY.md:

- Normative rules → assets/guides/ + assets/catalog/ + executables
- assets/specs/NNN-slug/ is ephemeral in-flight context
- Runtime must not hardcode assets/specs/009-* paths
- Cite WORKFLOW_SDD_GUIDE.md, WORKFLOW_OBSERVABILITY_GUIDE.md, TOOLS_GUIDE.md — not 004/005 specs

## Required spec edits

### 1. New section: Authority & guide promotion

Add after Introduction:

- List guide files to update on ship (OBSERVABILITY, SDD, WORKFLOW_RUNTIME_GUIDE stub,
  SECURITY, CI_GUIDE as slices land)
- "Guide promotion checklist" table: spec section → target guide → owner slice
- Explicit: ../contracts/ are spikes; promoted to packages/workflow-core/

### 2. Replace worker-transport assumption

Remove or rewrite assumptions that claim Speckit stages are callable
programmatically.

Replace with (paraphrase allowed):

- Progression = artifact gates + checklist markers (SDD orchestrated-handoff)
- Verification = mise run spec audit, spec lint/trace/gate, hk profiles
- Execution seams = handoff-generate + opencode dispatch (v1)
- Speckit skills remain parallel human/agent path

Update AWO-5 acceptance criteria language to "stage worker at documented seams"
not "invoke speckit.*".

### 3. Slice model in spec + plan stub

One spec, multiple PRs (not multiple spec folders):

| Slice | Requirements (keep in spec) | Post-MVP (move to appendix) |
| MVP   | AWO-2, 4, 9, 10, 12 subset  | — |
| M1    | + AWO-1, 5, 13              | — |
| M2    | + AWO-3, 7                  | — |
| M3    | —                           | AWO-6 (full section → appendix) |
| M4    | —                           | AWO-8, 11 |

Create or update plan.md with: slice → PR → guide files → touch list.

### 4. Package boundary section

Document target layout (no code move yet):

- packages/workflow-core/ — pure xstate + TypeBox
- packages/workflow-runtime/ — actor, invoker, persistence, dispatch
- tools/governance/specs/ — CLI entry
- src/shell/renderer/ — must NOT import workflow runtime in v1

Reference FCIS.guide.md and TOOLS_GUIDE.md governance/orchestration split.

### 5. Replace E2E declaration table

Remove @agentic_workflow_orchestrator as default catalog tag unless adding
catalog.yaml entry (defer).

Replace with:

| Layer | Enforcement | Path |
| A | tools specs | tools/governance/workflow/**/*.spec.ts |
| B | profile replay vs SDD guide | integration test + default.yaml |
| C | Gherkin @catalog_key | defer — operator-facing CLI only |

Orchestrator tests use tools/__tests__/fixtures/workflow/ feature-dir stubs.

### 6. Fix nits

- NFR table: events.jsonl → .ndjson (match WORKFLOW_OBSERVABILITY_GUIDE)
- AWO-3 AC1: reference tools/metrics/baselines/workflow.json task in plan, not undefined N in spec
- data-model.md: align contract paths with package promotion target
- contracts/README.md: label as ephemeral spike; link to promotion rule

### 7. Default profile placeholder

Add spec note: assets/catalog/workflows/default.yaml is a plan deliverable (MVP);
stage ids must replay WORKFLOW_SDD_GUIDE phase order (not 004 spec prose).

## Explicit OUT OF SCOPE (this handoff)

- Implementing xstate machine or CLI
- Creating packages/workflow-* directories
- Writing Gherkin for orchestrator meta-behavior
- Bumping constitution version
- Editing production src/

## Verification (report exit codes)

# Spec still valid markdown
mise run spec lint assets/specs/009-agentic-workflow-orchestrator

# No hardcoded 004/005 spec paths in reworked spec (operational 009 self-ref ok)
rg -n 'assets/specs/00[45]-' assets/specs/009-agentic-workflow-orchestrator/spec.md && exit 1 || true

# Guides cited
rg -n 'assets/guides/' assets/specs/009-agentic-workflow-orchestrator/spec.md | head -20

# Review artifacts intact
test -f assets/specs/009-agentic-workflow-orchestrator/review/guides-first-review.md

Optional: mise run spec audit assets/specs/009-agentic-workflow-orchestrator

## Deliverables

1. Updated spec.md per sections above
2. plan.md stub with slice/PR/guide table (create if absent)
3. Short changelog at bottom of spec.md or in review/README.md listing what changed

## Definition of done

- [ ] Authority & guide promotion section present
- [ ] Worker transport rewritten (guides-native)
- [ ] MVP vs Post-MVP requirement split clear
- [ ] E2E table uses layers A/B/C
- [ ] Package boundary documented
- [ ] No references to 004/005 spec paths as normative source
- [ ] spec lint passes on feature dir
- [ ] plan.md exists with PR slice table

Do not commit unless operator asks.
```

## Related

- Review index: [`README.md`](./README.md)
- Rationale: [`guides-first-review.md`](./guides-first-review.md)
- Normative guides: [`assets/guides/DOC_AUTHORITY.md`](../../../guides/DOC_AUTHORITY.md),
  [`WORKFLOW_SDD_GUIDE.md`](../../../guides/WORKFLOW_SDD_GUIDE.md),
  [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md)
