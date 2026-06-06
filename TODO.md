<!-- markdownlint-disable-file -->
# Spec system backlog

Migration metadata for the legacy spec library and document authority work.
**Not** an agent entrypoint — see [`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md).

## Checkbox ledger

- [x] **P0-e2e-contracts** — promoted step-catalog + fixture-manifest to `assets/features/e2e/contracts/`; rewired guide links; e2e contracts README added
- [ ] **P0-fcis-architecture** — no CLAUDE / app-context links to legacy foundation spec; FCIS rules live in guides
- [ ] **P1-logging** — LOGGING_GUIDE self-contained; no inbound legacy debugging spec links
- [ ] **P1-styling** — STYLING_GUIDE self-contained; no inbound design-polishing spec links
- [x] **P1-crg** — CRG.md self-contained for graph tooling policy
- [x] **P1-ci** — CI_GUIDE self-contained for packaging pipeline policy
- [x] **P2-archive-rename** — `git mv assets/docs/specs/` → `assets/docs/archive/`; internal path sweep done; rogue-refs green
- [ ] **P2-built-layer** — shipped feature records promoted per doc-promotion policy
- [ ] **P2-spec-kit-active** — in-flight work only under `assets/specs/NNN-slug/`; legacy tree task-scoped

## Rogue CSV (pending)

Source: `mise run audit rogue-refs` → `tmp/audit/rogue_reference_by_category.csv`.
Remaining work: action each category according to priority in the CSV.

## Archive hygiene

- [x] Sweep `assets/docs/specs` → `assets/docs/archive` inside `assets/docs/archive/**`
- [ ] Verify library_manifest entries match on-disk folders after rename
- [ ] Retire `rogue_refs.script.ts` when all rows are clean

Inventory: `mise run audit rogue-refs` (diagnostic).
