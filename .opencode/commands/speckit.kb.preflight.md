---
description: Preflight before implement — handoff, feature path, advisory spec lint
---

Before `/speckit.implement`:

1. Read `.specify/feature.json` — `feature_directory` must be under `assets/specs/[0-9][0-9][0-9]-*/`.
2. Confirm `handoff.md` and `tasks.md` exist in that directory.
3. Run `mise run spec lint --strict <feature_dir>` (advisory; gate uses `mise run spec gate <feature_dir>`).

Do not auto-commit; operator runs commit only after gate approval.
