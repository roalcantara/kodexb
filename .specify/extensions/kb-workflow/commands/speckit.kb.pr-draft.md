---
name: "speckit.kb.pr-draft"
description: "After spec gate: push branch and open or refresh a draft PR (review-draft CI)."
---

Run after `mise run spec gate` on the feature directory:

```bash
mise run spec pr-draft -- "${SPECIFY_FEATURE_DIRECTORY}"
```

Requires branch name `NNN-slug`, `gh` CLI, and green spec gate. Draft PRs run **review-draft** jobs in GitHub Actions; mark the PR ready for full Review when appropriate.
