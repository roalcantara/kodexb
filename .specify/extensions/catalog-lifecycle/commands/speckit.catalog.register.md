---
description: "Register an in-progress catalog entry for the active feature before implementation"
---

# Register catalog entry

Idempotently append an `in-progress` row to [`assets/catalog/catalog.yaml`](../../../assets/catalog/catalog.yaml)
when the active feature slug is not yet registered.

## Execution

- **Bash**: `.specify/extensions/catalog-lifecycle/scripts/bash/catalog-register.sh`

Resolves the feature directory from `.specify/feature.json`, then runs
`mise run catalog register`.
