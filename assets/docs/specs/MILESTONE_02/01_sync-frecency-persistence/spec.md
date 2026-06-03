# Feature Specification: Sync frecency persistence

**Feature Branch**: `fix/sync-frecency-persistence`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: `01_sync-frecency-persistence`

**Related artifacts**: `requirements.md` (normative SF-*), `design.md`, `tasks.md`, `handoff.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 — List ranking remembers my usage after sync (Priority: P1)

As someone who uses the knowledge list daily, I browse and open entries so the app
learns which items matter to me. When I sync updated content from my source files,
I expect the list to still feel “warm” for entries I use often—not reset as if I
had never opened anything.

**Why this priority**: Sync currently wipes learned visit history. That breaks trust
in frecency-based sorting and is called out as a critical correctness gap for v0.10.0.

**Independent Test**: Seed usage on several entries, run a full source sync, open the
list again, and confirm previously visited entries still rank ahead of cold entries
with the same filters applied.

**Acceptance Scenarios**:

1. **Given** the user has opened and ranked several entries through normal use,
   **When** they run a full sync that rebuilds the catalog from sources,
   **Then** entries that still exist after sync SHALL keep the ranking influence of
   their pre-sync visit history.

2. **Given** an entry had visit history before sync,
   **When** that entry is removed from source files and sync completes,
   **Then** visit history for that removed entry SHALL NOT remain attached to the
   catalog (orphan cleanup).

---

### User Story 2 — Shortcut usage survives catalog rebuild (Priority: P2)

As someone who relies on keyboard shortcuts and binding ranking, I use shortcuts
repeatedly so the app learns which bindings I prefer. When I sync, I expect shortcut
ranking to continue reflecting that usage.

**Why this priority**: Bindings are a separate learned surface from entry list
frecency; both are wiped today by the same rebuild.

**Independent Test**: Record binding usage, sync, and verify preferred bindings still
surface with prior usage weight for bindings that remain valid after import.

**Acceptance Scenarios**:

1. **Given** binding usage has been recorded before sync,
   **When** full sync completes and those bindings still exist,
   **Then** binding usage ranking SHALL reflect pre-sync usage (not a blank slate).

---

### User Story 3 — Sync remains dependable (Priority: P3)

As a user, I trigger sync to refresh my catalog from disk. Sync must still finish
successfully and report the same completion semantics I already rely on—preserving
learned state must not break or hang sync.

**Why this priority**: Durability is additive; regressions on import completion block
release regardless of frecency fix quality.

**Independent Test**: Run existing sync/import acceptance paths with frecency
preservation enabled; sync reaches terminal success with unchanged user-visible
outcome shape.

**Acceptance Scenarios**:

1. **Given** a valid sources directory and a normal sync trigger,
   **When** sync runs with frecency preservation enabled,
   **Then** sync SHALL complete with the same success/failure reporting behavior as
   before this feature (no hang, no silent failure).

---

### Edge Cases

- **First sync / no prior usage**: Sync completes; list behaves as today (no false
  “restored” rows).
- **Entry identity changes across import**: Visit history SHALL attach to the same
  logical entry (stable catalog key), not to a stale internal identifier.
- **All sources empty or import failure**: Learned state handling SHALL NOT prevent
  surfacing the import error; no partial restore that corrupts ranking.
- **Removed entries**: Orphan visit rows for entries no longer in the catalog SHALL
  be removed during restore/cleanup.
- **Bindings removed by import**: Binding usage rows for bindings that no longer
  exist SHALL NOT remain indefinitely.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST preserve entry visit history (counts, recency, ranking
  influence) across a full source sync for every entry that still exists in the
  catalog after import.

- **FR-002**: The system MUST remove entry visit history for entries that no longer
  exist in the catalog after sync (orphan cleanup).

- **FR-003**: The system MUST preserve binding usage ranking across full source sync
  for bindings that still exist after import.

- **FR-004**: The system MUST remap preserved entry visit history to the correct
  catalog entry when internal identifiers change but the stable entry key is unchanged.

- **FR-005**: Full source sync MUST continue to rebuild catalog content from sources
  (authoritative files remain the source of truth for what exists in the catalog).

- **FR-006**: Full source sync MUST complete with the same user-visible completion
  semantics as today (success, failure, and progress completion behavior unchanged).

- **FR-007**: The system MUST NOT require users to re-visit every entry after each
  sync to regain personalized list ordering.

### Key Entities

- **Catalog entry**: A knowledge item in the user’s library; identified by a stable
  key across sync; may receive a new internal id after import.

- **Entry visit history**: Learned local data describing how often and how recently
  the user engaged with an entry; drives list frecency ranking; not stored in source
  files.

- **Binding**: A keyboard shortcut target; identified by a stable binding identity;
  may accumulate learned usage ranking.

- **Binding usage history**: Learned local data for shortcut ranking; not stored in
  source files.

- **Full source sync**: User-triggered operation that rebuilds the catalog projection
  from on-disk sources while handling learned local state per this spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a controlled before/after sync test, 100% of entries with pre-sync
  visit history that remain in the catalog still show ranking influence equivalent to
  pre-sync (same relative order among those entries under fixed filters).

- **SC-002**: In a controlled test, 100% of binding usage rows for bindings still
  present after sync retain their pre-sync usage weight (not reset to zero).

- **SC-003**: In manual smoke (open app → use list → sync → re-open list), a maintainer
  can confirm the list still “feels warm” for frequently used entries without
  re-visiting every item (PASS/FAIL rubric in `handoff.md`).

- **SC-004**: All existing sync/import acceptance tests continue to pass with zero
  regressions on completion behavior.

- **SC-005**: After sync removes an entry from sources, zero orphan visit-history
  records remain for that entry in automated orphan-cleanup tests.

## Assumptions

- **Scope**: Full source sync only; incremental or delta sync is out of scope.
- **Algorithm**: Frecency scoring formulas and weights are unchanged; only durability
  of learned tables across rebuild is in scope.
- **Storage model**: Learned state stays in the same application database file using
  snapshot-and-restore around rebuild (not a separate durable database file in v1).
- **Authority**: Source files define catalog membership; learned tables are never
  written back to YAML.
- **M01 sync**: Import resilience, progress, and RPC completion requirements from the
  existing sync milestone remain in force; this feature adds local-state durability
  (SF-* in `requirements.md`).
- **Verification**: Milestone proof is integration tests plus quality gate; optional
  end-to-end Gherkin scenario is stretch only.

## Out of scope

- Changing how frecency scores are calculated.
- Incremental sync or partial catalog updates.
- A second database file dedicated to learned state (deferred follow-up).
- Sync progress UI or messaging changes.
