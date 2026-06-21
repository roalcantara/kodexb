# Spec Kit workspace (`.specify/`)

kb's **vanilla Spec Kit** configuration: templates, workflows, extensions, and
constitution memory. Feature specs live under `assets/specs/NNN-<slug>/` — this
folder is the engine that drives `/speckit-*` commands and `mise run spec …`.

**Operator workflow:** [`assets/guides/WORKFLOW_SDD_GUIDE.md`](../assets/guides/WORKFLOW_SDD_GUIDE.md).
**Document layers:** [`assets/guides/DOC_AUTHORITY.md`](../assets/guides/DOC_AUTHORITY.md).
**Binding principles:** [`memory/constitution.md`](memory/constitution.md).

## Active feature pointer

[`feature.json`](feature.json) — `feature_directory` names the current in-flight
spec folder (for example `assets/specs/018-architecture-role-taxonomy`).

## Folder map

- **`templates/`** — Spec Kit quartet templates (`spec`, `plan`, `tasks`, checklist, constitution).
- **`workflows/`** — Registered workflow definitions (`speckit/`, `orchestrated-handoff/`, …).
- **`workflow-catalogs.yml`** — Workflow registry consumed by Spec Kit and governance lint.
- **`memory/`** — Project constitution (`constitution.md`).
- **`scripts/bash/`** — Shared bash helpers (`common.sh`, feature setup, prerequisites).
- **`extensions/`** — Optional Spec Kit extensions (see [`extensions.yml`](extensions.yml)):
  - [`extensions/git/`](extensions/git/README.md) — branch, commit, remote hooks.
  - [`extensions/agent-context/`](extensions/agent-context/README.md) — agent context sync.
  - [`extensions/catalog-lifecycle/`](extensions/catalog-lifecycle/extension.yml) — catalog register command.
- **`integrations/`** — Editor/agent manifests (`speckit`, `cursor-agent`, `opencode`).
- **`extensions.yml`** — Installed extensions and hook wiring.

## kb usage (one-liner)

Cursor: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, …
Terminal: `mise run spec lint`, `mise run spec gate`, `mise run spec conform`, and the
SDD hub tasks documented in [`WORKFLOW_SDD_GUIDE.md`](../assets/guides/WORKFLOW_SDD_GUIDE.md).

## Related workflow docs

| Guide                                                                                 | Question                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`WORKFLOW_SDD_GUIDE.md`](../assets/guides/WORKFLOW_SDD_GUIDE.md)                     | How do I build/ship a feature with Spec Kit?                           |
| [`WORKFLOW_RUNTIME_GUIDE.md`](../assets/guides/WORKFLOW_RUNTIME_GUIDE.md)             | How does the workflow runtime work (profiles, packages, orchestrator)? |
| [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../assets/guides/WORKFLOW_OBSERVABILITY_GUIDE.md) | What was recorded during a run (NDJSON, runs CLI)?                     |
