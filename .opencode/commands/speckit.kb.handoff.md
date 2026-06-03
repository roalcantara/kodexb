---
description: Verify or scaffold handoff.md after tasks generation
---

After `/speckit.tasks`, verify `handoff.md` in the active feature directory:

1. AC tracker lists every `## REQUIREMENT` id from `spec.md`.
2. Agent prompt points at `spec.md`, `plan.md`, `tasks.md` under `assets/specs/<NNN-slug>/`.
3. No legacy `assets/docs/specs/MILESTONE_*` paths as normative targets.

If missing, scaffold from `assets/specs/_templates/handoff.template.md`.
