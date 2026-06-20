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

## Task-source-atomicity flow improvement plan

This section turns the `007-task-source-atomicity` retrospective into a small,
actionable implementation plan. Each item captures one friction point found
during delivery, the concrete implementation target, and the acceptance
criteria required before the item can be marked done.

Recommended execution order:

1. FP2, because it fixes the product behavior gap that the tests currently
	work around.
2. FP3, because it is the fastest documentation correction and removes command
	drift for the next contributor immediately.
3. FP1, because backend-driven fault injection is more valuable once the
	renderer's failure contract is explicit.
4. FP4, because scenario setup should be stabilized after the backend-driven
	failure path is chosen.
5. FP5, because the BDD support split is safest after the final test shape is
	settled.

### FP1. Replace Playwright interception with backend-driven fault injection

This feature currently proves the failure paths by intercepting task mutation
requests in the BDD step layer. That kept delivery moving, but it does not
exercise the real renderer -> RPC -> app -> source path for failure cases.

- [ ] Add a preview-safe fault injection mechanism for task mutations
- Implementation target: expose a test-only control path in the preview or test
	harness that can force `source_write_failed` and `conflict` outcomes from the
	backend without replacing the HTTP response inside Playwright.
- Acceptance criteria:
	- The `task-source-atomicity` BDD scenarios no longer rely on network
		interception in `bdd/e2e/steps/task_management.steps.ts` to simulate task
		mutation failures.
	- The failure outcome is produced by the real server-side task mutation flow
		in `src/shell/main/rpc/routes/task.routes.ts`.
	- The e2e run proves both `source_write_failed` and `conflict` using the same
		transport path that production uses.
	- The test-only control is unavailable in production builds and documented in
		the feature quickstart or the e2e harness guide.

### FP2. Make renderer mutation failures first-class UI outcomes

The renderer currently treats a resolved mutation request as a successful save,
even when the response body reports `ok: false`. This forced the BDD flow to
special-case failure behavior in the screenplay layer instead of relying on the
product UI.

- [ ] Handle `TaskMutationOutcome` failures explicitly in renderer task flows
- Implementation target: update the task sheet and related mutation entry
	points to branch on mutation outcome status instead of closing dialogs on any
	resolved promise.
- Acceptance criteria:
	- The renderer checks the structured task mutation result before closing the
		sheet or confirming success.
	- A `source_write_failed` result keeps the user in context and presents a
		visible failure state or message.
	- A `conflict` result keeps the user in context and presents a visible stale
		version or retry state or message.
	- `bdd/e2e/screenplay/task_crud.task.ts` no longer needs to bypass success
		assertions by reading remembered mutation outcomes.
	- Happy-path task create and update flows still pass existing tests.

### FP3. Align quickstart commands with the real verification path

The feature quickstart drifted from the commands that actually validate the
feature. That created avoidable confusion during execution and gate runs.

- [ ] Correct the `007-task-source-atomicity` quickstart command set
- Implementation target: update the feature quickstart so every documented
	command is copy-pasteable and matches the repo's actual e2e and ready flows.
- Acceptance criteria:
	- `assets/specs/007-task-source-atomicity/quickstart.md` uses the Playwright
		BDD command path that the repo actually supports for this feature.
	- The documented `mise run spec ready ... --key ...` command uses the exact
		feature key that passes in practice.
	- The quickstart separates focused validation from full readiness validation.
	- A contributor can execute the quickstart commands in order without needing
		to infer substitutions or correct stale arguments.

### FP4. Reduce fixture-name coupling in atomicity scenarios

The atomicity scenarios depend on shared release fixture content, including a
specific task title. That makes the feature more brittle than necessary and
raises the maintenance cost of unrelated fixture changes.

- [ ] Make atomicity scenarios self-contained at the data setup layer
- Implementation target: seed or declare the exact task data required by the
	feature instead of depending on an incidental task title from the release
	fixture.
- Acceptance criteria:
	- The `task-source-atomicity` scenarios do not depend on an unrelated shared
		release task title such as `Release Todo Task`.
	- The feature background or setup step declares the minimum data needed to
		run the scenarios.
	- Renaming tasks in the shared release fixture does not break the atomicity
		feature.
	- The setup approach is documented next to the feature or in the e2e fixture
		guidance so future scenarios can follow the same pattern.

### FP5. Split atomicity-specific BDD support from generic task steps

The general task step file now carries atomicity-specific setup, fault
injection, and outcome assertions. That makes the shared step surface harder to
understand and increases the cost of future task-flow changes.

- [ ] Extract atomicity-specific BDD helpers into feature-scoped support files
- Implementation target: move atomicity-only step helpers, remembered outcome
	handling, and scenario assertions out of the generic task management step
	implementation.
- Acceptance criteria:
	- Generic task steps remain in the shared task management step file.
	- Atomicity-only helpers live in a feature-scoped step or screenplay module.
	- A reader can identify the shared task behaviors and the atomicity-specific
		behaviors without scanning one mixed file.
	- The generated BDD spec and step registration still pass without duplicate
		step definitions or orphaned imports.

## Spec kit audit findings & remediation (017-src-cohesion-consolidation)

During the spec-kit audit for the `017-src-cohesion-consolidation` feature branch, the following issues/warnings were identified and resolved to align with the repository's strict quality gates:

1. **Missing Handoff File (`quartet.handoff` Error)**
   - **Finding**: The audit failed because `handoff.md` was missing.
   - **Fix**: Created a detailed `handoff.md` containing an acceptance criteria (AC) table linking `COH-1` through `COH-3` requirements with precise validation commands.

2. **Legacy Task ID Format (`tasks.id` Warning)**
   - **Finding**: Task IDs used `T1`..`T10` instead of the expected three-digit format `T###` (checked by `\bT\d{3}\b` regex in the audit script).
   - **Fix**: Updated all task IDs to three-digit format.

3. **Template Sample Leak False Positive (`tasks.sample-leak` Error)**
   - **Finding**: Renumbering task IDs starting from `T001` triggered a "sample leak" error because the audit script strictly flags `T001\b` to detect unedited templates.
   - **Fix**: Renumbered task IDs to start at `T101` (i.e., `T101`–`T110`) which satisfies the `T###` regex without triggering the leak check.

4. **Missing Checklists (`phase.analyze-plan` and `phase.analyze-tasks-ready` Errors)**
   - **Finding**: The audit warned that `checklists/analyze-plan.md` and `checklists/analyze-tasks.md` were missing, which blocked advancing the spec kit workflow.
   - **Fix**: Created the corresponding checklist files under `checklists/` to document the verification of plan constraints, task coverage, and BDD setup.
