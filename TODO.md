<!-- markdownlint-disable-file -->
# Spec system backlog

Migration metadata for the legacy spec library and document authority work.
**Not** an agent entrypoint — see [`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md).

Inventory: `mise run audit rogue-refs` (diagnostic).

| Id | Trigger to close | Owner |
|---|---|---|
| P0-e2e-contracts | ast-grep green on permanent docs; e2e metrics JSON under `tools/metrics/baselines/e2e-quality/`; guides describe commands not scratchpad paths | TESTING_GUIDE |
| P0-fcis-architecture | No CLAUDE / app-context links to legacy foundation spec; FCIS rules live in guides | FCIS.guide |
| P1-logging | LOGGING_GUIDE self-contained; no inbound legacy debugging spec links | LOGGING_GUIDE |
| P1-styling | STYLING_GUIDE self-contained; no inbound design-polishing spec links | STYLING_GUIDE |
| P1-crg | CRG.md self-contained for graph tooling policy | CRG.md |
| P1-ci | CI_GUIDE self-contained for packaging pipeline policy | CI_GUIDE |
| P2-archive-rename | Rogue refs green; `library_manifest` stable; usage telemetry reviewed | DOC_AUTHORITY |
| P2-built-layer | Shipped feature records promoted per doc-promotion policy | DOC_AUTHORITY |
| P2-spec-kit-active | In-flight work only under `assets/specs/NNN-slug/`; legacy tree task-scoped | SDD_WORKFLOW_GUIDE |
