<!-- markdownlint-disable-file -->
# Spec system backlog

Migration metadata for the legacy spec library and document authority work.
**Not** an agent entrypoint — see [`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md).

## Checkbox ledger

- [x] **P0-e2e-contracts** — promoted step-catalog + fixture-manifest to `assets/features/e2e/contracts/`; rewired guide links; e2e contracts README added
- [x] **P0-fcis-architecture** — no CLAUDE / app-context links to legacy foundation spec; FCIS rules live in guides
- [x] **P1-logging** — LOGGING_GUIDE self-contained; no inbound legacy debugging spec links
- [x] **P1-styling** — STYLING_GUIDE self-contained; no inbound design-polishing spec links
- [x] **P1-crg** — CRG.md self-contained for graph tooling policy
- [x] **P1-ci** — CI_GUIDE self-contained for packaging pipeline policy
- [x] **P2-archive-rename** — `git mv assets/docs/specs/` → `assets/docs/archive/`; internal path sweep done; rogue-refs green
- [x] **P2-built-layer** — shipped feature records promoted per doc-promotion policy
- [x] **P2-spec-kit-active** — in-flight work under `assets/specs/NNN-slug/`; see [`assets/specs/README.md`](assets/specs/README.md)

## Rogue CSV (pending)

Source: `mise run audit rogue-refs` → `tmp/audit/rogue_reference_by_category.csv`.
Remaining work: action each category according to priority in the CSV.

## Archive hygiene

- [x] Sweep `assets/docs/specs` → `assets/docs/archive` inside `assets/docs/archive/**`
- [x] Verify library_manifest entries match on-disk folders after rename
- [ ] Retire `rogue_refs.script.ts` when all rows are clean

Inventory: `mise run audit rogue-refs` (diagnostic).
