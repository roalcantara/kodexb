<!-- markdownlint-disable-file -->
# Architectural Review & Sustainability Report (v0.10.0)

## 1. Executive Summary

This report presents a critical architectural review of the codebase as we approach the v0.10.0 release. The application is an Electrobun-based, keyboard-driven desktop utility designed for developer productivity, characterized by a clean visual aesthetics system (Andromeda Void) and guided by the **FCIS (Functional Core, Imperative Shell)** architectural pattern.

### Architecture Overview

The system is divided into three distinct boundaries:
1. **Functional Core (`src/core/`)**: Houses pure, synchronous, side-effect-free domain models, parsers, and utilities. Core files have zero I/O access and are easily testable.
2. **Imperative Shell (`src/shell/`)**:
   - **`shell/app/`**: Manages the application lifecycle, filesystems, and databases (`bun:sqlite`). It contains repositories and orchestration services like `ImportService`.
   - **`shell/main/`**: The Electrobun desktop orchestrator. Boots windows, registers global shortcuts, and hosts the Elysia-based RPC API.
   - **`shell/renderer/`**: A React 19 visual interface that interacts with the main process exclusively via the Eden Treaty RPC bridge.
3. **Shared Utilities (`src/shared/`)**: Contains common types, RPC schemas, and logging structures that are safe for both the shell and core to consume.

Overall, the application exhibits **exceptional architectural discipline**. The layer boundaries are enforced programmatically via tooling (`dependency-cruiser` and `ls-lint`), preventing the worst forms of codebase decay. However, as the application moves toward v0.10.0, we have identified key opportunities to reduce type redundancy, improve performance, and relocate misplaced logic to prevent long-term maintenance overhead.

---

## 2. Key Strengths to Preserve

1. **Strict Layer Boundary Isolation**: The programmatic blocking of imports from `shell/` inside `core/` and `shared/` guarantees that business logic remains pure and mock-free. This isolation is a major asset that must not be compromised.
2. **Eden Treaty Type-Safe RPC**: The use of `@elysiajs/eden` allows the React renderer to call backend functions with compile-time type checking. The bridge is unified under a single Electrobun IPC request (`rpcCall`), combining standard web routing paradigms with desktop native efficiency.
3. **Optimized SQLite Foundation**: Authoring raw SQL queries via compiled prepared statements (using `bun:sqlite` with WAL mode enabled) provides high performance without the weight or migration pain of a heavyweight ORM.
4. **Resilient Parsing Pipeline**: The core parsers (`parseSourceFileResilient`) are designed to degrade gracefully, collecting line-level syntax/type errors during YAML sync instead of crashing the entire import process.

---

## 3. Boundary Analysis: Core vs. Shell

While the separation between core business rules and imperative I/O is generally clean, the principle of keeping I/O out of the core has occasionally been applied too aggressively. In several instances, **pure, deterministic mapping, formatting, and normalization logic** has been kept in the Shell simply because it is *called* by an I/O function.

### Misplaced Logic in the Shell

* **Task Source Serialization & Tag Normalization**:
  - **Location**: [app_task_source.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/lib/app_task_source.util.ts)
  - **Code**: `taskToSourceRecord(task: Knowledge)` and `resolveCreateTaskTags(tags: string[])`
  - **Evaluation**: These functions are entirely deterministic and side-effect free. Normalizing tags (lowercasing, replacing dashes, handling defaults) and converting a database model back into a YAML-writable object literal are pure business logic.
  - **Recommendation**: Move these utility functions to `@core/domain/models/knowledges` or `@core/domain/models/entries`. The Shell should only be responsible for reading/writing the file string, while the Core decides *what* string to write and *how* to format the payload.
- **Collision Detection Formatting**:
  - **Location**: [import_collision_warnings.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/db/import_collision_warnings.util.ts)
  - **Code**: `collectHardCollisionWarnings` and `formatHardCollisionWarning`
  - **Evaluation**: While this utility receives database rows, the aggregation, classification, sorting, and string formatting are purely deterministic.
  - **Recommendation**: Extract the classification and warning generation to `src/core/domain/models/entries/collisions/`. The shell should fetch the rows from the DB and pass them to a pure core function that returns the formatted warning strings.

### The Core/Shell Separation Rule of Thumb

To maintain clarity:
- **Shell** is responsible for **Triggering and Channeling**: fetching the bytes (DB, file, network) and writing the bytes.
- **Core** is responsible for **Deciding and Translating**: parsing the bytes, checking validity, modifying state objects, and formatting outputs.

---

## 4. Type & Concept Proliferation

A significant pain point in the codebase is the redundant declaration of equivalent models across layers, increasing cognitive load and creating a change-amplification risk.

### 4.1 Duplicate Definition of `BindingRef`

The chord-shortcut binding reference structure is defined **three separate times** with identical properties:

1. **Shared Type**: `BindingRef` in [desktop_rpc_schema.ts](file:///Users/roalcantara/Work/bun/kb/src/shared/rpc/desktop_rpc_schema.ts#L125)
2. **Repository Type**: `BindingRef` in [binding.repository.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/db/binding.repository.ts#L92)
3. **Core Model Type**: `BindingRef` in [collision.detector.ts](file:///Users/roalcantara/Work/bun/kb/src/core/domain/models/entries/collisions/collision.detector.ts#L3)

This duplication requires explicit, manual mapping functions (like `toCoreBindingRef`) and introduces potential drift if shortcut features are extended.
- **Solution**: Declare the canonical `BindingRef` in `@core/domain/models/entries/schemas/shortcut.schema.ts` (or as a shared type in `@shared/rpc`) and import it across all repositories and collision detectors.

### 4.2 Redundant Schema & Type Definitions in RPC

To guarantee runtime payload validation, the RPC layer uses two parallel declarations:
- Hand-written TypeScript types in `src/shared/rpc/desktop_rpc_schema.ts` (e.g. `ListOpts`, `ConfigPatch`, `TaskCreateInput`).
- Sinclair TypeBox schemas in `src/shell/main/rpc/schemas.ts` (e.g. `listOptsSchema`, `configPatchSchema`, `taskCreateSchema`).

To prevent these from going out of sync, the codebase relies on custom contract test suites (`src/shell/main/rpc/schemas.spec.ts`) asserting shape alignment.
- **Solution**: Move the TypeBox schemas from the Shell (`shell/main/rpc/schemas.ts`) to Shared (`src/shared/rpc/schemas.ts`). Use TypeBox's native type generator:

  ```typescript
  import { type Static, Type } from '@sinclair/typebox';

  export const listOptsSchema = Type.Object({ ... });
  export type ListOpts = Static<typeof listOptsSchema>;
  ```

  This single source of truth entirely eliminates the hand-written TypeScript types, the manual maintenance, and the contract testing boilerplate.

### 4.3 Conceptual Upward Dependency

In [filter_by_view.util.ts](file:///Users/roalcantara/Work/bun/kb/src/core/domain/models/knowledges/task_views/filter_by_view.util.ts), the Core imports `TaskView` from `@shared/rpc`.
- **Evaluation**: `TaskView` (e.g. 'today', 'overdue') is a core domain query concept, not an RPC transport detail.
- **Solution**: Define the `TaskView` type and `TASK_VIEW_VALUES` in `src/core/domain/models/knowledges/task_views/` and let `@shared/rpc` import it from `@core`.

---

## 5. Performance Bottlenecks & Code Smells

### ⚠️ Critical Performance Smell: Quadratic Tag Faceting (`O(T * E)`)

When a user types a query or toggles filters, the application calculates the tag counts displayed in the UI dropdown to guide selection.

- **The Code**: [list_stats_tag_facets.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/lib/list_stats_tag_facets.util.ts)
- **The Mechanism**:
  1. The code calls `getTagCounts(raw)` to get all distinct tag keys (say, **$T$** tags).
  2. It iterates over every tag. For each tag, it calls `countKnowledgeForOpts` with the current filters plus that tag.
  3. `countKnowledgeForOpts` executes a complete SQLite query (`findAll` with `limit = -1`, which parses and filters all rows).
- **The Impact**:
  If a user has **50 tags** in their database, the application will run **50 distinct SQL queries** every time they press a key. In a keyboard-driven application where instant response (under 16ms) is paramount, this creates severe UI thread blockages and input lag.
- **The Optimization**:
  SQLite has built-in support for JSON structures. We can calculate the counts of all tags for the filtered dataset in a **single query** using SQLite's `json_each` table-valued function:

  ```sql
  SELECT json_each.value AS tag, COUNT(*) AS cnt
  FROM knowledges k
  JOIN json_each(k.tags) AS json_each
  WHERE k.id IN (
    -- Subquery matching current search, types, and taskView filters
    SELECT id FROM knowledges ...
  )
  GROUP BY json_each.value
  ```

  By fetching this count in a single query, we reduce database round-trips from **$T$** to **1**, shifting the complexity from a heavy sequential loop to an optimized database index operation.

---

## 6. Rails-Inspired Conventions

The Ruby on Rails philosophy teaches us that developer velocity is maximized when common patterns are standardized under solid conventions, reducing cognitive overhead and boilerplate.

### 6.1 Unified TypeBox Schemas

Instead of separation for the sake of abstract purity, we should embrace **Convention-over-Configuration** by standardizing our data schemas. Having TypeBox schemas co-located in `src/shared/` or `src/core/` and exposing their inferred types globally creates an ergonomic environment similar to how Rails ActiveRecord models automatically project database schemas into application code.

### 6.2 Eliminating RPC boilerplate

Currently, adding an RPC route requires:

1. Defining the schema in `schemas.ts`
2. Registering the route in `routes/*.routes.ts`
3. Exposing a client-side wrapper in `src/shell/renderer/rpc/client.ts`

While Eden Treaty allows direct proxying of Elysia (`rpc.api.myRoute.post()`), the renderer wraps these in custom functions. We can simplify this process by using Eden Treaty directly in renderer hooks or creating an automatically generated delegate, drastically reducing the boilerplate in `client.ts`.

---

## 7. Prioritized Recommendations & ROI

| Priority | Area         | Recommendation                                                                                                                                                                | Effort | Impact   | ROI           |
| :------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :------- | :------------ |
| **1**    | Performance  | **Aggregated SQL Tag Faceting**: Rewrite `buildTagFacetCounts` to use a single aggregate query with `json_each` rather than $T$ loops.                                        | Low    | Critical | **Very High** |
| **2**    | Types        | **Consolidate RPC Types & Schemas**: Relocate TypeBox schemas to `shared/` and infer TypeScript types via `Static<typeof schema>`, deleting the duplicate hand-written types. | Medium | High     | **High**      |
| **3**    | Boundary     | **Refactor Core/Shell Misplacements**: Move pure task-tag resolution, source record formatting, and collision formatting into the Core.                                       | Low    | Medium   | **High**      |
| **4**    | Types        | **Deduplicate `BindingRef`**: Define `BindingRef` once in Core or Shared and import it across repository, detector, and UI files.                                             | Low    | Medium   | **Medium**    |
| **5**    | Architecture | **Correct Upward Dependency**: Move `TaskView` and its associated values from `@shared/rpc` to the Core.                                                                      | Low    | Low      | **Medium**    |

---

## 8. Refactoring Roadmap

### Phase 1: High-Impact / Low-Effort (Immediate Win)

1. **Optimize Tag Facet Count**: Rewrite `buildTagFacetCounts` in [list_stats_tag_facets.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/lib/list_stats_tag_facets.util.ts) to aggregate using SQLite's native `json_each` operation.
2. **Move Pure Utilities to Core**:
   - Migrate `taskToSourceRecord` and `resolveCreateTaskTags` from [app_task_source.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/lib/app_task_source.util.ts) into a pure module in `@core/domain/models/knowledges/task_views/` or `@core/domain/models/entries/parsers/`.
   - Move warning formatting from [import_collision_warnings.util.ts](file:///Users/roalcantara/Work/bun/kb/src/shell/app/db/import_collision_warnings.util.ts) into the core collision detector package.

### Phase 2: High-Impact / Medium-to-High Effort (v0.10.0 Polish)

1. **Unify RPC Schemas and Types**:
   - Migrate schemas in `src/shell/main/rpc/schemas.ts` to `src/shared/rpc/schemas.ts`.
   - Delete redundant type files and infer types dynamically with `Static`.
   - Update the Eden Treaty typing references and verify compilation across renderer and main.
2. **De-duplicate `BindingRef`**:
   - Replace the three occurrences of the `BindingRef` type declaration with a single imported reference.

### Phase 3: Nice-to-Have / Maintainability Polish (v0.11.0+)

1. **Incorporate Convention over Configuration in RPC**:
   - Explore auto-mounting route directories in Elysia to avoid manually writing import hooks for every route category.
   - Directly consume the `treaty` client in React context/hooks to minimize wrapper code.
