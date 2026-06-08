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
- [x] **P2-spec-kit-active** — in-flight/spec-path policy tracked in [`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md)

## Rogue CSV (pending)

Source: `mise run audit rogue-refs` → `tmp/audit/rogue_reference_by_category.csv`.
Remaining work: action each category according to priority in the CSV.

## Archive hygiene

- [x] Sweep `assets/docs/specs` → `assets/docs/archive` inside `assets/docs/archive/**`
- [x] Verify library_manifest entries match on-disk folders after rename
- [ ] Retire `rogue_refs.script.ts` when all rows are clean

Inventory: `mise run audit rogue-refs` (diagnostic).

## Architectural correctness & hygiene

- [x] 2. Preserve frecency across sync (preserve tables or split DB)
- [ ] 1. Task writes: YAML-first or fail RPC; stop swallowing errors
- [ ] 3. Tag facets: single SQL `json_each` aggregate
- [ ] 14. EMPTY_TAG_COUNTS/EMPTY_ARRAY (`{}` fallback busts `EntryRow` memo)
- [ ] 8. Config contract drift (`configPath`, `display.advisories`) round-trip or remove
- [ ] 15. Handoff clipboard `finally` restore
- [ ] 4. `typeUnion()` + derive RPC literals from core tuples
- [ ] 5. Move `TaskView` from `@shared/rpc` to core
- [ ] 6. `BindingRef` in core + drop mappers (collision)
- [ ] 7. Move task tag normalize + cycles to core task policy
- [ ] 16. ListStats byType (Change amplification on new entry types)
- [ ] 17. 11× `asPromise` shell delegate boilerplate
- [ ] 18. TypeBox in `shared/rpc` + `Static<>` (Gemini path)
- [ ] 23. Guides drift from implementation (CODESTYLE/FCIS/foundation)
- [ ] 30. Split `App` into 5 services
- [ ] 10. 17/27 single-caller list hooks (Lint-driven extraction)
- [ ] 12. `ListMain` + `useListPageShell` dual orchestrators; `p` prop bag
- [ ] 19. Overlay/modal priority via scattered booleans (coord. brittle)
- [ ] 13. `components/shared/` = primitives + sync feature
- [ ] 11. kind-first TS vs feature-first CSS (touches 4–5 roots p/ change)
- [ ] 20. Misplaced artifacts  (page components, hook-shaped utils, false `use_*`)
- [ ] 21. task_state in renderer (Overdue/blocked rules may belong in core)
- [ ] 22. DB lifecycle: disposable vs durable state undocumented (Migrations + sync policy)
- [ ] 24. Renderer `rpc/client.ts` size (314 LOC / Transport vs endpoint facade )
- [ ] 25. Shortcut keymap duplicate derivation (Component vs hook overlap)
- [ ] 9. `App` hub + `shell/app/lib/` bucket (31 methods)
- [ ] 26. Types imported from `.component.tsx` (sync modal state)
- [ ] 27. No shared overlay primitives yet (Modal chrome duplicated)
- [ ] 28. Micro-dirs** (`core/handoff`, `core/validation`, …)  (Navigation noise)
- [ ] 29. Full `features/` tree migration (High value, not urgent)
- [ ] 30. Split `App` into 5 services (After P0/P1 correctness)
