---
name: "speckit.kb.audit"
description: "Run deterministic spec audit after tasks (handoff, task order, lint)."
---

After `/speckit-tasks` and before `/speckit-analyze`:

```bash
mise run spec audit --strict -- "${SPECIFY_FEATURE_DIRECTORY}"
```

Exit non-zero on errors. Then run `/speckit-analyze` for cross-artifact review.
