# Fix handoff — 011-mise-sdd-cli (mixed) — review wip

**Branch:** `feature/011-mise-sdd-cli` · **Base commit:** `f18c5638` · **WIP uncommitted**

Prior: `review-011-mise-sdd-cli-mixed-f18c5638.md` — **P0 CLI rules 00–07 DONE** on WIP.

Load: **app-context** + **mise-tasks**

Do not commit unless asked.

---

## P0 — before merge (dogfood only)

| ID | Task |
| --- | --- |
| P0-1 | MSC-8: run `mise run spec workflow run assets/specs/011-mise-sdd-cli` with at least one allowlisted stage; archive log under `tmp/workflow-runs/` |
| P0-2 | MSC-9: drive workflow to terminal gate; record `run_id` + stage timeline in `handoff.md` |
| P0-3 | Commit WIP as focused commits: `mise.toml`+dispatch, `app`/`policy` bins, tests, handoff/tasks sync |

## P1 — phase 5 docs (same PR or follow-up per operator)

- MSC-DOCS-01–04: guides, `.github`, agent entry docs — post-011 command names
- MSC-TEST-05: smoke.yml if still stale
- MSC-CLOSEOUT-02: PR body lists MSC-1…MSC-9 + run id

## Verify (dogfood gate)

```sh
mise run spec workflow run assets/specs/011-mise-sdd-cli --dry-run
mise run spec workflow run assets/specs/011-mise-sdd-cli
ls tmp/workflow-runs/*/
grep run_id assets/specs/011-mise-sdd-cli/handoff.md
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Out of scope

- Manual `catalog.yaml` registration for 011
