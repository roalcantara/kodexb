---
name: "speckit.kb.handoff"
description: "Ensure handoff.md exists and references spec AC ids after tasks generation."
---

After `/speckit-tasks`, verify `handoff.md` in the feature directory:

1. Lists every `## REQUIREMENT` id from `spec.md` in the AC tracker table.
2. Points implement agents at `spec.md`, `plan.md`, `tasks.md`.
3. Uses path `assets/specs/<NNN-slug>/` (not legacy MILESTONE paths).

If `handoff.md` is missing, create from `assets/specs/_templates/handoff.template.md`.
