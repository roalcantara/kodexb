<!-- markdownlint-disable-file -->

# MILESTONE 02

## ROADMAP `(architectural correctness & hygiene)`

| **TASK**  | **STATUS** | **PTS** | **SUMMARY**                                                                           | **SPEC**                                                                        | **RELEASE** |
| :-------: | :--------: | ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | :---------: |
|     1     |    [ ]     | 🄷 8     | 1/2. Preserve frecency across sync (preserve tables or split DB)                      |                                                                                 |             |
|     2     |    [ ]     | 🄷 8     | 2/1. Task writes: YAML-first or fail RPC; stop swallowing errors                      |                                                                                 |             |
|     3     |    [ ]     | 🄷 5     | 3/3. Tag facets: single SQL `json_each` aggregate                                     |                                                                                 |             |
|           |            | 🄷 1     | 4/14. EMPTY_TAG_COUNTS/EMPTY_ARRAY (`{}` fallback busts `EntryRow` memo)              |                                                                                 |             |
|           |            | 🄷 3     | 6/8. Config contract drift (`configPath`, `display.advisories`) round-trip or remove  |                                                                                 |             |
|           |            | 🄼 3     | 7/15. Handoff clipboard `finally` restore                                             |                                                                                 |             |
|           |            | 🄷 5     | 8/4. `typeUnion()` + derive RPC literals from core tuples                             |                                                                                 |             |
|           |            | 🄷 3     | 5. Move `TaskView` from `@shared/rpc` to core                                         |                                                                                 |             |
|           |            | 🄷 5     | 6. `BindingRef` in core + drop mappers (collision)                                    |                                                                                 |             |
|           |            | 🄷 3     | 7. Move task tag normalize + cycles to core task policy                               |                                                                                 |             |
|           |            | Ⓜ 2     | 16. ListStats byType (Change amplification on new entry types)                        |                                                                                 |             |
|           |            | Ⓜ 2     | 17. 11× `asPromise` shell delegate boilerplate                                        |                                                                                 |             |
|           |            | 🄷 8     | 18. TypeBox in `shared/rpc` + `Static<>` (Gemini path)                                |                                                                                 |             |
|           |            | Ⓜ 3     | 23. Guides drift from implementation (CODESTYLE/FCIS/foundation)                      |                                                                                 |             |
|           |            | Ⓜ 5     | 30. Split `App` into 5 services                                                       |                                                                                 |             |
|           |            | Ⓜ 8     | 10. 17/27 single-caller list hooks (Lint-driven extraction)                           |                                                                                 |             |
|           |            | Ⓜ 8     | 12. `ListMain` + `useListPageShell` dual orchestrators; `p` prop bag                  |                                                                                 |             |
|           |            | Ⓜ 5     | 19. Overlay/modal priority via scattered booleans (coord. brittle)                    |                                                                                 |             |
|           |            | 🄷 5     | 13. `components/shared/` = primitives + sync feature                                  |                                                                                 |             |
|           |            | Ⓜ 13    | 11. kind-first TS vs feature-first CSS (touches 4–5 roots p/ change)                  |                                                                                 |             |
|           |            | 3       | 20. Misplaced artifacts  (page components, hook-shaped utils, false `use_*`)          |                                                                                 |             |
|           |            | 2       | 21. task_state in renderer (Overdue/blocked rules may belong in core)                 |                                                                                 |             |
|           |            | 8       | 22. DB lifecycle: disposable vs durable state undocumented (Migrations + sync policy) |                                                                                 |             |
|           |            | 5       | 24. Renderer `rpc/client.ts` size (314 LOC / Transport vs endpoint facade )           |                                                                                 |             |
|           |            | 2       | 25. Shortcut keymap duplicate derivation (Component vs hook overlap)                  |                                                                                 |             |
|           |            | 🄷 13    | 9. `App` hub + `shell/app/lib/` bucket (31 methods)                                   |                                                                                 |             |
|           |            | 2       | 26. Types imported from `.component.tsx` (sync modal state)                           |                                                                                 |             |
|           |            | 5       | 27. No shared overlay primitives yet (Modal chrome duplicated)                        |                                                                                 |             |
|           |            | 2       | 28. Micro-dirs** (`core/handoff`, `core/validation`, …)  (Navigation noise)           |                                                                                 |             |
|           |            | 21      | 29. Full `features/` tree migration (High value, not urgent)                          |                                                                                 |             |
|           |            | 30      | 30. Split `App` into 5 services (After P0/P1 correctness)                             |                                                                                 |             |
| --------  | ---------- | ------- | ------------------------------------------------------------------------------------  | ------------------------------------------------------------------------------- | ----------- |
| **TOTAL** |            | 175     | (reference only)                                                                      |                                                                                 |             |

---

## FOLDER STRUCTURE

```tree
assets/docs/specs/MILESTONE_02/
   |
   ├── 01_scope-feature/                              # (NN_scope-feature) A SPEC DRIVEN DEVELOPMENT (SDD) SPECIFICATION
   |   ├── DESIGN.md                                  # Normative technical contract
   |   ├── HANDOFF.md                                 # Agent-oriented step-by-step plan (optional)
   |   ├── REQUIREMENTS.md                            # EARS-style behavior and acceptance criteria
   |   └── TASKS.md                                   # Ordered verification work
   ├── 02_scope-feature/                              # ...
   |   ├── DESIGN.md
   |   ├── HANDOFF.md
   |   ├── REQUIREMENTS.md
   |   └── TASKS.md
   |   ...
   └── README.md                                       # OVERVIEW, ROADMAP, etc.
```

---

## OVERVIEW

- This folder contains all the specifications for the **MILESTONE 02 ROADMAP**
- Each **subfolder** is a specification for a increment of the MILESTONE 02 roadmap.
- Each specification reune **SDD** artifacts which describe the **technical contract** for the increment.

### [SPEC DRIVEN DEVELOPMENT (SDD)](../../../.agents/skills/spec-driven-development/SKILL.md)

In a nutshell, **SDD** consists of (at least) the following artifacts:

- **REQUIREMENTS.MD:** Captures user stories, acceptance criteria, or bug analysis in **EARS _(Easy Approach to Requirements Syntax)_** notation
- **DESIGN.MD:** Documents technical architecture, sequence diagrams, and implementation considerations
- **TASKS.MD:** Provides a detailed implementation plan with discrete, trackable tasks
- **HANDOFF.MD:** Agent-oriented step-by-step plan (optional)
- **IMPLEMENTATION-PLAN.MD:** Detailed implementation plan (optional)

#### REQUIREMENTS.MD

**PURPOSE:** Captures user stories, acceptance criteria, or bug analysis in **EARS** notation

   ```markdown
   **USER STORY:** As a new user, I want to create an account, so that I can access personalized features.

   **ACCEPTANCE CRITERIA:**
   1. WHEN user provides valid email and password THEN system SHALL create new account
   2. WHEN user provides existing email THEN system SHALL display "email already registered" error
   3. WHEN user provides password shorter than 8 characters THEN system SHALL display "password too short" error
   4. WHEN account creation succeeds THEN system SHALL send confirmation email
   ```

6. **`Measure:`** — command, test file, or observable artifact (no `“verify manually”` without steps)
7. **`Evidence:`** — exact `bun test <path>` path or e2e tag

Orphan checks in `tasks.md` only are **spec debt** (global policy).

### `DESIGN.MD`

> **PURPOSE:** Create a comprehensive technical plan for implementation

**Design Document Structure:**
```markdown
## Overview
[High-level summary of approach]

## Architecture
[System components and their relationships]

## Components and Interfaces
[Detailed component descriptions]

## Data Models
[Data structures and validation rules]

## Error Handling
[Error scenarios and response strategies]

## Testing Strategy
[Testing approach for different layers]

### Decision: [Title]
**Context:** [Situation requiring decision]
**Options Considered:**
1. [Option 1] - Pros: [benefits] / Cons: [drawbacks]
2. [Option 2] - Pros: [benefits] / Cons: [drawbacks]
**Decision:** [Chosen option]
**Rationale:** [Why this was selected]
```

### `TASKS.MD`

> **PURPOSE:** Break design into actionable, sequential implementation steps

1. Phases numbered **1, 2, 3…**
2. Each task: **Requirements**, **Work**, **Done when** (bullet list matching AC), **Evidence** (command).
3. Checkbox `- [ ]` only for human tracking; **Done when** is normative.
4. One PR per task group when possible (≤ 400 LOC diff).

```markdown
- [ ] **TASK 1**. [Epic/Major Component]
- [ ] 1.1 [Specific implementation task]
  - [Implementation details]
  - [Files/components to create]
  - _Requirements: [Requirement references]_
```

### `HANDOFF.MD` _(optional)_

> **PURPOSE:** Provide complete implementation context to the next agent

Use [`_templates/handoff.template.md`](../.bak/MILESTONE_02/_templates/handoff.template.md) when switching agents mid-spec.

### `IMPLEMENTATION-PLAN.MD` _(optional)_

> **PURPOSE:** Provide a detailed implementation plan to the next agent

Only when >3 files touch multiple layers; otherwise `tasks.md` is enough.

---

## [Review workflow](../../../.agents/skills/verification-before-completion/SKILL.md)

Before merging implementation PRs for M02 specs:

1. Author completes `tasks.md` items with evidence pasted in PR or `handoff`.
2. Reviewer loads [`_templates/review.template.md`](../.bak/MILESTONE_02/_templates/review.template.md).
3. Run [`mise run app gates --quality`](../../../.agents/skills/app-quality-gate/scripts/gate.sh) on the tree being merged.
4. Confirm every **Done when** maps to a **Requirement AC** id.

---

## M02 scope (from consolidated review)

## TEMPLATES

- [Handoff template](../.bak/MILESTONE_02/_templates/handoff.template.md) — skill: `session-handoff` / `handoff` optional
- [Review template](../.bak/MILESTONE_02/_templates/review.template.md) — skill: `app-quality-gate`, `receiving-code-review`
