---
name: "speckit.kb.preflight"
description: "Preflight before implement: handoff, feature path, spec lint advisory."
---

Before `/speckit-implement`:

1. Confirm `.specify/feature.json` → `feature_directory` under `assets/specs/[0-9][0-9][0-9]-*`.
2. Confirm `handoff.md` and `tasks.md` exist.
3. Run `bun tools/spec/lint.ts "$FEATURE_DIR"` (advisory unless operator runs `mise run spec gate`).

Do not auto-commit; operator runs `mise run spec commit` after gate approval.
