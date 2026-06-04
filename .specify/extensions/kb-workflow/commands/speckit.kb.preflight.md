---
name: "speckit.kb.preflight"
description: "Preflight before implement: handoff, feature path, spec lint advisory."
---

Before `/speckit-implement`:

1. Confirm `.specify/feature.json` → `feature_directory` under `assets/specs/[0-9][0-9][0-9]-*`.
2. Confirm `spec.md`, `plan.md`, `tasks.md`, and handoff at `artifacts/tasks/handoff.md` (or legacy `handoff.md`).
3. Confirm `/speckit-analyze` ran after tasks with **0 CRITICAL** (re-run if tasks changed).
4. Run `mise run spec audit --strict "$FEATURE_DIR"` (handoff + task order).
5. Run `bun tools/spec/lint.ts "$FEATURE_DIR"` (advisory; `mise run spec gate` is authoritative before PR).

Do not auto-commit; operator commits when asked ([`GIT_COMMITS_GUIDE.md`](../../../assets/guides/GIT_COMMITS_GUIDE.md)).

After implementation and green `mise run spec gate`, run `/speckit-kb-pr-draft` or `mise run spec pr-draft` to push and open a **draft PR** (triggers review-draft CI).
