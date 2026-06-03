<!-- markdownlint-disable-file -->

# 003 — list tag facet performance (pending)

**Status:** Blocked until **001-sync-frecency-persistence** is merged to `main`.

**Workflow:** kb-slice. Run **CRG impact-radius** before parallel implement with 002
(shared SQLite / list query surface).

**Scaffold:**

```bash
mise run spec worktree add -- 003-list-tag-facet-performance
mise run spec feature-init -- --id 003 --slug list-tag-facet-performance
```

Legacy parity: `assets/docs/specs/MILESTONE_02/03_list-tag-facet-performance/`
