# Review audit — 010-workflow-packages (WEP-10 fix) — 2026-06-03

Verdict: **REQUEST_CHANGES** · Branch: `feature/010-workflow-packages` · `b29f59fb..ac331267` · focus: governance-tools + packages

## Scope

Review handoff: `assets/specs/010-workflow-packages/review/review-010-bun-pm-handoff.md` (P0 catalog/biome/gate; P1 CI/guide/lock). Agent claimed all P0/P1 complete at `ac331267`.

## AC matrix

| ID         | Status  | Note                                                                                                                             |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| WEP-1 AC1  | PASS    | 81 + 167 package tests                                                                                                           |
| WEP-2 AC1  | PASS    | ast-grep exit 0                                                                                                                  |
| WEP-3 AC1  | PARTIAL | Full-repo depcruise exit 10 (10 pre-existing `src/core` TypeBox/compiler imports); `packages/workflow-*` scoped: 0 violations    |
| WEP-4 AC1  | PASS    | 51 governance workflow tests                                                                                                     |
| WEP-5 AC1  | PASS    | spec lint 0 errors                                                                                                               |
| WEP-6 AC1  | PASS    | catalog validate OK                                                                                                              |
| WEP-7 AC1  | SKIP    | Evidence command uses invalid `run` workflow + `--profile`; `orchestrated-handoff --feature smoke-feature` prints next step only |
| WEP-8 AC1  | PARTIAL | Same depcruise evidence as WEP-3; `profile_guide_crossref` not imported under `packages/`                                        |
| WEP-9 AC1  | FAIL    | `mise run spec gate` exit 1 (lint:jscpd + lint:depcruise)                                                                        |
| WEP-10 AC1 | PASS    | `bun install` OK; `workspaces.catalog` + `catalog:` in workspace manifests; `bun.lock` catalog section                           |

## WEP-10 fix handoff — Before done

| Command                                                        | Exit | Note              |
| -------------------------------------------------------------- | ---- | ----------------- |
| `cd packages/workflow-core && bun test`                        | 0    | 81 pass           |
| `cd ../workflow-runtime && bun test`                           | 0    | 167 pass          |
| `bun test --config /dev/null tools/governance/specs/workflow/` | 0    | 51 pass           |
| `mise run spec lint assets/specs/010-workflow-packages`        | 0    |                   |
| `mise run spec gate assets/specs/010-workflow-packages`        | 1    | lint chain fails  |
| `bash .agents/skills/app-quality-gate/scripts/gate.sh`         | 1    | jscpd + depcruise |

## P0/P1 checklist (review handoff)

| Item                      | Status | Note                                                                      |
| ------------------------- | ------ | ------------------------------------------------------------------------- |
| P0.1 Root catalog         | PASS   | `package.json` `workspaces.catalog` for xstate, typebox, yaml             |
| P0.2 Workspace `catalog:` | PASS   | Both `packages/workflow-*/package.json`                                   |
| P0.3 Biome / gate         | FAIL   | Biome clean; gate still red (jscpd 17 clones in packages; depcruise)      |
| P0.4 Evidence commands    | FAIL   | gate + spec gate not clean                                                |
| P1.5 CI `bun ci`          | PASS   | `smoke.yml` uses `bun ci`; still runs standalone `spec gate` (acceptable) |
| P1.6 WORKFLOW_GUIDE       | PASS   | Catalog + bunfig section present                                          |
| P1.7 `bun.lock`           | PASS   | Catalog entries present; knip reports unused catalog key `yaml` (minor)   |

## Blockers

- `packages/workflow-*/src/*.spec.ts` | jscpd 17 clones (0.23% > 0% threshold); main had 0 clones | Extract shared test helpers / dedupe orchestrator + machine spec blocks
- `gate.sh` / P0.3 | Agent claimed exit 0; actual exit 1 | Fix jscpd before merge; re-run full gate
- `mise run spec gate` / WEP-9 | Exit 1 via same lint chain | Unblocks when gate green
- `bun run lint:depcruise` / WEP-3 evidence | 10 errors in `src/core/**` (also on `main`) | Pre-existing; either fix core TypeBox imports or maintainer `APPROVED:` for gate depcruise on this PR scope

## Fix handoff

```text
Fix handoff — 010 Bun PM (WEP-10) — review ac331267

Load: app-context + mise-tasks

P0: packages/workflow-runtime/src/orchestrator.script.spec.ts (+ core machine/evidence specs) | jscpd 17 clones | extract fixtures/helpers; target 0 clones repo-wide
Verify: bun run lint:jscpd

P0: gate.sh | still exit 1 after jscpd fix if depcruise blocks | confirm depcruise on main; fix or scoped exemption with maintainer approval
Verify: bash .agents/skills/app-quality-gate/scripts/gate.sh

P1: handoff.md WEP-7 Evidence | invalid `spec workflow run --profile` | use `mise run spec workflow orchestrated-handoff --feature tools/__tests__/fixtures/workflow/smoke-feature`
Verify: mise run spec lint assets/specs/010-workflow-packages

Out of scope: 011-mise-sdd-cli; root dependency catalog migration beyond workflow shared deps

Before done: full Before done block from review-010-bun-pm-handoff.md (all exit 0)

Do not commit unless asked.
```

## Diff paths

101 files `b29f59fb..ac331267` — packages/workflow-*, governance shims, smoke.yml, WORKFLOW_GUIDE, 010 spec bundle, biome.jsonc, bun.lock, package.json workspaces.catalog.
