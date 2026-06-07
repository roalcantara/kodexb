# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `assets/specs/<NNN>-<slug>/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
assets/specs/<NNN>-<slug>/
├── spec.md              # Required (/speckit-specify)
├── plan.md              # Required (this file; /speckit-plan)
├── tasks.md             # Required (/speckit-tasks)
├── handoff.md           # Required (acceptance tracker; /speckit-tasks)
├── research.md          # OPTIONAL — Phase 0; create only when Technical Context has unresolved NEEDS CLARIFICATION
├── data-model.md        # OPTIONAL — Phase 1; create only when feature introduces non-trivial data shape
├── quickstart.md        # OPTIONAL — Phase 1; create only for operator-smoke / UI features needing a manual run-through
└── contracts/           # OPTIONAL — Phase 1; create only when cross-module contracts need a dedicated directory
```

> **kb normative quartet:** `spec.md`, `plan.md`, `tasks.md`, `handoff.md`.
> Satellites above are feature-scoped and SHOULD NOT be created when plan
> complexity does not demand them. See
> [`assets/guides/SDD_WORKFLOW_GUIDE.md` § Normative quartet](../../assets/guides/SDD_WORKFLOW_GUIDE.md#normative-quartet).

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## E2e traceability

| Requirement | Feature file                         | Scenario        | Notes              |
| ----------- | ------------------------------------ | --------------- | ------------------ |
| [PREFIX]-1  | `assets/features/e2e/<slug>.feature` | [Scenario name] | `@spec:<slug>` tag |

Normative Gherkin text lives in the **feature file** only — not duplicated here.
Update [`assets/docs/specs/e2e/step-catalog.md`](../../assets/docs/specs/e2e/step-catalog.md)
and [`fixture-manifest.md`](../../assets/docs/specs/e2e/fixture-manifest.md) when e2e
is in scope.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
