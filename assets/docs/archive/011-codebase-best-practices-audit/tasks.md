<!-- markdownlint-disable-file -->
# Codebase best-practices audit — Tasks

## Overview

Use this task list to hand implementation to another agent. Implement one phase
at a time, run the phase verification, update this file, run the full quality
gate, and create exactly one commit for that phase before moving on.

Each task item lists acceptance criteria from
[`requirements.md`](requirements.md). The notation `R2.1` means requirement
`R2`, acceptance criterion `1`. An item is complete only when every referenced
acceptance criterion is satisfied, the item-specific instructions are done, and
the phase verification passes.

Do not make policy decisions during implementation. This file fixes the policy
choices the audit left open. If reality contradicts a task instruction, stop
and update this spec before coding around it.

Before any source-code task, load:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-quality-gate/SKILL.md`
- `app-rpc` for RPC work
- `app-testing` for test work
- `electrobun-best-practices` and the routed Electrobun skill for desktop, window, build, or native RPC work
- `mise-tasks` for `mise.toml` work

## Phase workflow

For every phase:

1. Read the phase, its referenced acceptance criteria, and its suggested commit command.
2. Implement only that phase.
3. Run the phase-specific verification commands.
4. Compare the phase result against the baseline and previous phase.
5. Update the phase row in the impact ledger below.
6. Mark that phase's checkboxes in this file.
7. Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
8. Commit only that phase's files with the suggested commit command.
9. Continue to the next phase.

If a phase takes unexpectedly long because setup, tooling, tests, benchmarks,
or task wording are unclear, stop after the current command finishes. Report
the blocker, the command that was slow, elapsed time, and the proposed task
clarification before continuing implementation.

## Impact metrics

Use the same small metric set for baseline, per-phase comparison, and closure.
Do not invent new benchmark tooling for this spec. Record `n/a` when a metric
does not apply to a phase, and record the exact blocker when an environment
cannot run an optional command.

| Metric                 | Command or source                                                                                | Positive impact signal                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Quality gate           | `bash .agents/skills/app-quality-gate/scripts/gate.sh`                                           | Gate remains green and no quality tool is weakened.                                                 |
| Test coverage          | `bun test --coverage`                                                                            | Overall coverage remains stable; touched-file coverage improves or stays above the baseline signal. |
| Focused test surface   | Phase-specific `bun test ...` command                                                            | New behavior has deterministic focused tests, including rejection paths where relevant.             |
| Build security         | `bun run build` and `package.json` scripts                                                       | Strict build is the default; any TLS bypass is isolated in the documented fallback.                 |
| Architecture guards    | `bun run lint:depcruise` and `bun run lint:ast-grep`                                             | New FCIS violations are blocked while current valid imports still pass.                             |
| RPC contract safety    | RPC schema and host tests                                                                        | Runtime validation and TypeScript contracts cover valid and invalid payloads.                       |
| Performance benchmark  | `mise run perf run` and `mise run perf compare`                                                  | Preview-server critical paths stay within thresholds or have a recorded blocker/regression.         |
| Spec coverage backlog  | `mise run test:spec-audit` after phase 7                                                         | Missing non-exempt spec count is visible and does not grow without explanation.                     |
| Preview/e2e confidence | `mise run e2e:preview` when available                                                            | Renderer-risky phases either pass preview e2e or record the exact blocker.                          |
| Cohesion               | `wc -l src/shell/renderer/components/list/list_main.component.tsx` and extracted component count | `ListMain` gets smaller while extracted components keep co-located specs.                           |
| Suppression inventory  | `assets/docs/archive/codebase-quality-audit/tasks.md`                                              | Suppression rows are updated instead of duplicated in this spec.                                    |

## Phase impact ledger

Fill this ledger as part of each phase. Keep entries short and evidence-based.

| Phase                        | Baseline or previous value                                                             | Post-phase value                                                                                                                                                               | Delta or impact                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Baseline                 | n/a                                                                                    | 573 tests, 0 fail, gate all-green, ListMain 375 lines, build had TLS bypass, app_tag_rank 6.25% lines, app_task_yaml 6.67% lines, host.ts 42.5% lines, sync_modal 34.43% lines | Baseline recorded for later comparison.                                                                                                                                                 |
| 1 — Build security           | build had NODE_TLS_REJECT_UNAUTHORIZED=0                                               | build strict (no TLS bypass); build:insecure-local as fallback                                                                                                                 | TLS bypass removed from default; build passes; gate green.                                                                                                                              |
| 2 — RPC bridge envelope      | host.ts 42.5% line coverage; bridge forwarded broad request envelope                   | Host bridge validator rejects non-`/api/`, non-`POST`, malformed payloads; 14 host tests pass                                                                                  | Native/webview bridge is narrow and deterministic; latest perf run passed thresholds.                                                                                                   |
| 3 — Architecture guards      | FCIS rules partly split between prose and ast-grep                                     | dependency-cruiser enforces renderer→app, shared→shell, and route→repository guards                                                                                            | Graph-level FCIS guard classes are executable without weakening ast-grep.                                                                                                               |
| 4 — Preview protocol safety  | Preview fetch accepted any URL parsed by `URL`                                         | Preview fetch returns `null` for malformed, `file:`, `data:`, and `ftp:` URLs                                                                                                  | Unsupported protocols no longer reach `fetch`; protocol tests pass.                                                                                                                     |
| 5 — RPC contract consistency | Route schemas and shared types could drift silently                                    | TypeBox schema tests cover valid/invalid route bodies; local types derive where layer-safe                                                                                     | Contract drift risk reduced without moving shell schemas into shared.                                                                                                                   |
| 6 — Focused coverage pockets | app_tag_rank 6.25%, app_task_yaml 6.67%, host.ts 42.5%, sync_modal 34.43% line signals | Focused app/RPC/renderer tests pass: 104 focused tests, 0 failures                                                                                                             | Low-coverage seams now have direct behavior tests.                                                                                                                                      |
| 7 — Spec audit task          | No repeatable co-located spec report                                                   | `mise run test:spec-audit` and `--strict` pass with 0 missing files                                                                                                            | Co-located spec policy is machine-checkable and currently clean.                                                                                                                        |
| 8 — Electrobun trust docs    | Trusted renderer assumption not local to bootstrap                                     | ELECTROBUN guide and main-window comment document trusted packaged renderer and external-content rules                                                                         | Future desktop work has explicit sandbox/navigation guidance.                                                                                                                           |
| 9 — Preview e2e workflow     | Preview e2e documented but easy to skip silently                                       | TESTING_GUIDE and README require result or exact blocker for renderer-risky changes                                                                                            | Preview e2e remains outside the default gate with reporting guidance.                                                                                                                   |
| 10 — List-shell cohesion     | ListMain 375 lines; list-shell concerns concentrated                                   | ListMain 250 lines; 4 list-section components with co-located specs                                                                                                            | Composition shell is smaller; remaining suppressions stay in codebase-quality-audit.                                                                                                    |
| 11 — Closure                 | Phase ledger and report were stale                                                     | Ledger, report, backlog, benchmark task, and suppression cross-reference updated                                                                                               | Final checks: focused tests pass, spec-audit strict passes, perf run passes thresholds; full gate reaches `lint:ls` then the sandbox reports `bun is unable to write files to tempdir`. |

## Benchmark workflow

Use the benchmark suite when a phase can affect preview-server, RPC, list-query,
renderer-bundle, or stats performance. Phases that do not touch those surfaces
record `n/a` in the impact ledger.

The root `mise.toml` exposes one benchmark task with usage arguments:

- `mise run perf run`
- `mise run perf baseline`
- `mise run perf compare`
- `mise run perf open`

The benchmark task lives only in the root `mise.toml`; do not add or use a
nested `tools/benchmarks/mise.toml`.

If `mise run perf run` fails because `3457` is already in use, retry once with
`mise run perf run --port <free-port>`. If the preview server still cannot
start, record the exact `Bun.serve` error as the benchmark blocker.

## Phase 0 — Baseline and branch hygiene

**Goal:** Record the starting point without changing product behavior.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(audit): Record baseline verification

Changes:
- Record the audit baseline status in the task ledger
- Capture the verification commands used before implementation
- Capture the baseline impact metrics for later phase comparisons

Why:
- Gives later phase commits a clear starting point
- Keeps progress traceable to the audit requirements
- Makes improvement evidence visible instead of anecdotal
EOF
)"
```

- [x] 0.1 Record baseline state.
  - Capture `git status --short`.
  - Confirm whether existing staged changes are part of the current handoff.
  - Do not revert unrelated work.
  - _Acceptance criteria: R12.1_

- [x] 0.2 Re-run baseline verification.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Run `bun test --coverage`.
  - Record exact results in the implementation summary.
  - _Acceptance criteria: R7.5, R12.1_

- [x] 0.3 Capture baseline metrics.
  - Record the phase 0 values in the impact ledger.
  - Include quality gate result, coverage totals, relevant low-coverage file rows, `ListMain` line count, current build-script posture, and current suppression/spec-audit status when available.
  - Use `n/a` for metrics that cannot exist until a later phase, such as `test:spec-audit` before phase 7.
  - _Acceptance criteria: R7.5, R12.1_

- [x] 0.4 Review the source audit report.
  - Read `assets/docs/archive/codebase-best-practices-audit/report.md`.
  - Confirm the task order still matches current project priorities.
  - If the report has drifted, update `report.md` before source changes.
  - _Acceptance criteria: R12.1_

## Phase 1 — Build security decision

**Goal:** Make the default Electrobun build strict and keep any TLS bypass as an explicit local escape hatch.

**Fixed decision:** `bun run build` must not set `NODE_TLS_REJECT_UNAUTHORIZED=0`. Add a separate `build:insecure-local` script with the old behavior only as a documented local fallback. Do not use the fallback in CI or release guidance.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
fix(build): Make Electrobun build strict

Changes:
- Remove the TLS verification bypass from the default build script
- Add a clearly named local fallback for environments that still need it
- Document when the fallback is allowed

Why:
- Keeps the normal build path secure by default
- Preserves a visible escape hatch for local Electrobun build issues
EOF
)"
```

- [x] 1.1 Inspect build context.
  - Read `package.json`, `assets/guides/ELECTROBUN.md`, build-related specs, and the Electrobun build skill.
  - Run the strict build command without `NODE_TLS_REJECT_UNAUTHORIZED=0`.
  - Record whether the strict build passes or the exact failure.
  - _Acceptance criteria: R3.1, R3.4, R10.3, R12.3_

- [x] 1.2 Update build scripts.
  - Change `build` to run `electrobun build` without disabling TLS.
  - Add `build:insecure-local` with `NODE_TLS_REJECT_UNAUTHORIZED=0 electrobun build`.
  - Keep release and CI guidance on the strict build path.
  - _Acceptance criteria: R3.1, R3.2, R12.1_

- [x] 1.3 Document the build decision.
  - Update `assets/guides/ELECTROBUN.md`.
  - State that `build:insecure-local` is a local troubleshooting fallback only.
  - Link or mention `electrobun-best-practices` and Electrobun skill routing.
  - _Acceptance criteria: R3.3, R10.3, R12.1_

- [x] 1.4 Verify phase 1.
  - Run `bun run build`.
  - Run the full quality gate.
  - Update the phase 1 impact ledger row with the strict build result and script-posture delta.
  - _Acceptance criteria: R3.4, R12.1_

## Phase 2 — Desktop RPC bridge envelope

**Goal:** Validate the single Electrobun `rpcCall` bridge before it forwards to the Elysia `RpcApp`.

**Fixed decision:** Implement the bridge-envelope validator in
`src/shell/main/rpc/host.ts`. Allow only `POST` and `/api/` paths. Always set
the forwarded `content-type` header to `application/json`. Optionally forward
caller-provided `accept`. Drop every other caller header.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
fix(rpc): Validate desktop bridge envelope

Changes:
- Validate the Electrobun rpcCall payload before forwarding
- Reject non-api paths and non-POST methods
- Add host bridge tests for accepted and rejected payloads

Why:
- Keeps the native/webview bridge narrow and explicit
- Aligns the desktop transport with Electrobun boundary guidance
EOF
)"
```

- [x] 2.1 Add the bridge payload validator.
  - Load `app-rpc`, `app-testing`, `electrobun-best-practices`, and the routed Electrobun RPC skill.
  - Validate `RpcCallParams` before `RpcApp.handle()`.
  - Reject malformed payloads, non-`/api/` paths, and non-`POST` methods.
  - Always send `content-type: application/json` to `RpcApp.handle()`.
  - Forward caller-provided `accept` when present.
  - Drop caller-provided `content-type` and every header other than `accept`.
  - _Acceptance criteria: R2.1, R2.2, R2.3, R2.4, R4.1, R12.3, R12.4, R12.5_

- [x] 2.2 Add host bridge tests.
  - Extend `src/shell/main/rpc/host.spec.ts`.
  - Cover successful forwarding.
  - Cover rejected path, method, malformed payload, and filtered headers.
  - Update any existing custom-header test that expects old header pass-through behavior.
  - Keep tests independent of a real Electrobun runtime.
  - _Acceptance criteria: R2.5, R7.3, R12.5_

- [x] 2.3 Verify phase 2.
  - Run `bun test src/shell/main/rpc src/shell/renderer/rpc`.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - Run the full quality gate.
  - Update the phase 2 impact ledger row with focused test results, the number of rejected bridge-envelope cases now covered, and the performance benchmark result or blocker.
  - _Acceptance criteria: R2.5, R12.1_

## Phase 3 — Architecture guard hardening

**Goal:** Encode documented FCIS import boundaries in dependency-cruiser.

**Fixed decision:** Dependency-cruiser owns graph-level FCIS rules. Ast-grep rules remain as literal-pattern helpers and must not be removed.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(arch): Enforce FCIS import guards

Changes:
- Add dependency-cruiser guards for renderer, shared, and route imports
- Document how each guard maps to the FCIS contract
- Keep ast-grep as a complementary literal-pattern check

Why:
- Makes documented architecture boundaries executable
- Reduces reliance on prose and reviewer memory
EOF
)"
```

- [x] 3.1 Add dependency-cruiser rules.
  - Add `renderer -> shell/app` blocking.
  - Add `shared -> shell` blocking.
  - Add route-to-repository blocking for route modules while allowing the approved `App` orchestration path.
  - _Acceptance criteria: R1.1, R1.2, R1.3, R1.4_

- [x] 3.2 Document the guard mapping.
  - Add comments in `.dependency-cruiser.cjs`.
  - Reference the matching FCIS rules in `CLAUDE.md` and `app-context`.
  - Do not add broad exceptions or tool weakening.
  - _Acceptance criteria: R1.4, R12.1_

- [x] 3.3 Verify phase 3.
  - Run `bun run lint:depcruise`.
  - Run `bun run lint:ast-grep`.
  - Run the full quality gate.
  - Update the phase 3 impact ledger row with the guard commands and the new FCIS boundary classes enforced.
  - _Acceptance criteria: R1.1, R1.2, R1.3, R1.4, R12.1_

## Phase 4 — Preview fetch protocol safety

**Goal:** Prevent preview-image fetching from touching unsupported protocols.

**Fixed decision:** `fetchPreviewImageFromUrl()` returns `null` for every protocol except `http:` and `https:`. Malformed URLs must also return `null`.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
fix(preview): Block non-web preview URLs

Changes:
- Restrict preview image fetching to http and https URLs
- Return null for malformed or unsupported URLs
- Add deterministic tests for protocol handling

Why:
- Prevents imported entries from triggering local or data URL fetches
- Matches the existing shell URL allowlist posture
EOF
)"
```

- [x] 4.1 Add protocol allowlist behavior.
  - Update `src/shell/app/lib/app_preview_fetch.util.ts`.
  - Preserve current `http:`, `https:`, and YouTube behavior.
  - Return `null` for `file:`, `data:`, unsupported protocols, and malformed URLs without calling `fetch`.
  - _Acceptance criteria: R8.1, R8.2, R8.3_

- [x] 4.2 Add direct preview-fetch tests.
  - Create or update `src/shell/app/lib/app_preview_fetch.util.spec.ts`.
  - Cover valid HTTPS, YouTube thumbnail handling, unsupported protocols, malformed input, failed fetch, and Open Graph parsing.
  - Use deterministic fetch stubs; do not require network.
  - _Acceptance criteria: R8.4, R7.5, R12.5_

- [x] 4.3 Verify phase 4.
  - Run `bun test src/shell/app/lib/app_preview_fetch.util.spec.ts`.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - Run the full quality gate.
  - Update the phase 4 impact ledger row with protocol cases covered, the fetch-suppression behavior for unsupported protocols, and the performance benchmark result or blocker.
  - _Acceptance criteria: R8.1, R8.2, R8.3, R8.4, R12.1_

## Phase 5 — RPC schema and type consistency

**Goal:** Reduce RPC type/schema drift without violating FCIS.

**Fixed decision:** Do not move shell route schemas into `src/shared` in this phase. Derive local route types from TypeBox for every touched `src/shell/main/rpc/` schema that currently has a duplicated hand-written payload type. Document any shared types that must stay separate because renderer code imports them.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
refactor(rpc): Align RPC contracts

Changes:
- Derive safe local RPC payload types from TypeBox schemas
- Document shared RPC types that intentionally remain separate
- Add contract tests for valid and invalid route bodies

Why:
- Reduces schema/type drift without breaking FCIS boundaries
- Makes future RPC route changes easier to validate
EOF
)"
```

- [x] 5.1 Inventory duplicated RPC payload contracts.
  - Compare `src/shell/main/rpc/schemas.ts` with `src/shared/rpc/app_rpc_schema.ts`.
  - Add a short contract note near the relevant schemas or types.
  - Explain why renderer-imported shared types cannot import shell schemas.
  - _Acceptance criteria: R4.1, R4.4_

- [x] 5.2 Derive local route types where layer-safe.
  - Use `Static<typeof schema>` inside `src/shell/main/rpc/` for every touched schema with a duplicated hand-written payload type.
  - Do not introduce runtime imports from shell into shared or core layers.
  - Do not rename public RPC methods in this phase.
  - _Acceptance criteria: R4.1, R4.2, R12.4_

- [x] 5.3 Add route-contract tests.
  - Create `src/shell/main/rpc/schemas.spec.ts` for schema-level contract tests.
  - Cover representative valid and invalid bodies for list filters, config patch, task payloads, shell-surface routes, and bridge payloads.
  - _Acceptance criteria: R4.3, R7.5, R12.5_

- [x] 5.4 Verify phase 5.
  - Run `bun test src/shell/main/rpc src/shell/renderer/rpc`.
  - Run `bun run typecheck`.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - Run the full quality gate.
  - Update the phase 5 impact ledger row with contract-test results, the duplicated payload types removed or documented, and the performance benchmark result or blocker.
  - _Acceptance criteria: R4.1, R4.2, R4.3, R4.4, R12.1_

## Phase 6 — Focused coverage pockets

**Goal:** Add direct tests around low-coverage app and renderer seams.

**Fixed decision:** This phase adds tests only. Do not refactor production code unless a test exposes a real bug that must be fixed for the test to pass.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(audit): Cover low-coverage seams

Changes:
- Add focused tests for tag suggestions and task YAML helpers
- Add sync UI state coverage without a real Electrobun runtime
- Record coverage results for the touched files

Why:
- Protects important app and renderer seams before later refactors
- Improves confidence in the best-practices audit follow-up
EOF
)"
```

- [x] 6.1 Add tag suggestion tests.
  - Add direct tests for `app_tag_rank.util.ts`.
  - Add direct tests for `app_tag_suggest.util.ts`.
  - Cover entries with existing tags, entries without tags, co-occurrence ranking, keyword fallback, and duplicate normalization.
  - _Acceptance criteria: R7.1, R7.5, R12.5_

- [x] 6.2 Add task YAML tests.
  - Add direct tests for `app_task_yaml.util.ts`.
  - Cover create, update, remove, missing section, missing key, and stable file formatting.
  - Use temporary files from existing test helpers.
  - _Acceptance criteria: R7.2, R7.5, R12.5_

- [x] 6.3 Add sync UI state tests.
  - Extend tests for `sync_modal.component.tsx` and `use_list_page_stats_sync.hook.ts`.
  - Cover active progress, completion, failure display, dismissal, and stats refresh behavior.
  - Avoid a real Electrobun runtime.
  - _Acceptance criteria: R7.4, R11.3, R12.5_

- [x] 6.4 Verify phase 6.
  - Run focused tests for touched files.
  - Run `bun test --coverage`.
  - Confirm touched files improve or maintain their coverage signal.
  - Run the full quality gate.
  - Update the phase 6 impact ledger row with before/after coverage for the touched files.
  - _Acceptance criteria: R7.5, R12.1_

## Phase 7 — Co-located spec audit task

**Goal:** Add a repeatable report for non-exempt source files that lack co-located specs.

**Fixed decision:** Implement a public `mise run test:spec-audit` task. The default mode is report-only and exits `0`. Add a `--strict` flag that exits non-zero when missing specs are found. Document the policy in `assets/guides/TESTING_GUIDE.md`; do not document the policy in `DoD.md` in this phase.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(test): Add spec-audit task

Changes:
- Add a mise task that reports source files without co-located specs
- Document explicit exemptions in the testing guide
- Provide a strict mode for future gate adoption

Why:
- Makes the co-located spec rule visible and repeatable
- Avoids turning the report into a blocking gate before review
EOF
)"
```

- [x] 7.1 Document source/spec exemptions.
  - Update `assets/guides/TESTING_GUIDE.md`.
  - Exempt only barrels, pure type files, schema-only modules, constants, and generated data.
  - State that `test:spec-audit` is report-only by default and strict with `--strict`.
  - _Acceptance criteria: R6.2, R6.3, R12.1_

- [x] 7.2 Add the repeatable audit command.
  - Add `[tasks."test:spec-audit"]` to `mise.toml`.
  - Use task arguments with `--strict`.
  - Print stable, sorted output.
  - In default mode, exit `0` after printing missing non-exempt files.
  - In strict mode, exit non-zero when missing non-exempt files exist.
  - _Acceptance criteria: R6.1, R6.3, R6.4, R12.2_

- [x] 7.3 Add the initial missing-spec backlog.
  - Run `mise run test:spec-audit`.
  - Add the highest-value missing specs to this task file under a new backlog subsection inside phase 7.
  - Do not require immediate specs for every exempt module.
  - _Acceptance criteria: R6.1, R6.2, R7.5_

### Phase 7 backlog result

`mise run test:spec-audit` and `mise run test:spec-audit --strict` currently
report zero missing non-exempt co-located specs. There is no phase 7 missing-spec
backlog to seed at closure time.

- [x] 7.4 Verify phase 7.
  - Run `mise run test:spec-audit`.
  - Run `mise run test:spec-audit --strict` and record whether it fails due to the known backlog.
  - Run `bun run lint:mise`.
  - Run the full quality gate.
  - Update the phase 7 impact ledger row with the missing-spec count and strict mode result.
  - _Acceptance criteria: R6.1, R6.2, R6.3, R6.4, R12.1, R12.2_

## Phase 8 — Electrobun trust-boundary documentation

**Goal:** Document why the main window uses trusted packaged renderer content and what future external content must do.

**Fixed decision:** Add the primary policy to `assets/guides/ELECTROBUN.md`. Add only a short pointer comment near `BrowserWindow` construction in `src/shell/main/main.ts`.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(electrobun): Document renderer trust

Changes:
- Document the trusted packaged renderer assumption
- Add the external-content sandbox and navigation policy
- Point the main window bootstrap to the Electrobun guide

Why:
- Prevents future desktop work from guessing the trust boundary
- Keeps Electrobun secure defaults visible for external content
EOF
)"
```

- [x] 8.1 Document the trusted renderer assumption.
  - Update `assets/guides/ELECTROBUN.md`.
  - Add a concise comment near `BrowserWindow({ url: 'views://shell/index.html' })`.
  - State that the main renderer is trusted packaged app content.
  - _Acceptance criteria: R10.1, R12.3_

- [x] 8.2 Document external-content requirements.
  - In `assets/guides/ELECTROBUN.md`, state that future external content must use sandboxing, partition isolation, and navigation allowlists.
  - Link or reference `.agents/skills/electrobun-best-practices/SKILL.md` and `.cursor/electrobun-skill-routing.md`.
  - _Acceptance criteria: R10.2, R10.3_

- [x] 8.3 Verify phase 8.
  - Run `bun run typecheck`.
  - Run `git diff --check -- assets/guides/ELECTROBUN.md src/shell/main/main.ts`.
  - Run the full quality gate.
  - Update the phase 8 impact ledger row with the documented trust-boundary surfaces.
  - _Acceptance criteria: R10.1, R10.2, R10.3, R12.1_

## Phase 9 — Preview e2e workflow visibility

**Goal:** Make preview e2e expectations visible without adding new CI.

**Fixed decision:** This phase is documentation-only. Do not add a CI workflow. Update `assets/guides/TESTING_GUIDE.md` and `README.md` to say when to run `mise run e2e:preview` and how to report blockers.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(test): Clarify preview e2e workflow

Changes:
- Document when renderer-risky changes need preview e2e checks
- Explain how to report Chromium or preview-data blockers
- Keep preview e2e separate from the default quality gate

Why:
- Makes manual preview validation expectations explicit
- Avoids slowing the default gate while preserving coverage guidance
EOF
)"
```

- [x] 9.1 Update preview e2e guidance.
  - Update `assets/guides/TESTING_GUIDE.md`.
  - Update `README.md` task guidance.
  - State that list navigation, filters, task sheet, and preview tooling changes must report `mise run e2e:preview` results or exact blockers.
  - _Acceptance criteria: R11.1, R11.3_

- [x] 9.2 Keep preview e2e outside the default gate.
  - Do not modify the default quality gate to run Playwright.
  - Do not add a CI workflow in this phase.
  - Document that a future maintainer-triggered workflow can be added later.
  - _Acceptance criteria: R11.2_

- [x] 9.3 Verify phase 9.
  - Run `git diff --check -- assets/guides/TESTING_GUIDE.md README.md`.
  - Run `mise run e2e:preview` if Chromium and preview data are available.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - If preview e2e cannot run, record the exact blocker in the phase summary.
  - Run the full quality gate.
  - Update the phase 9 impact ledger row with the preview e2e result, performance benchmark result, or exact blocker.
  - _Acceptance criteria: R11.1, R11.2, R11.3, R12.1_

## Phase 10 — Renderer list-shell cohesion

**Goal:** Split `ListMain` into focused renderer components without changing behavior.

**Fixed decision:** Extract these files:

- `list_search_filter_chrome.component.tsx`
- `list_results_body.component.tsx`
- `list_footer.component.tsx`
- `list_overlay_hosts.component.tsx`

Each new component must have a co-located spec unless phase 7's audit policy has already marked it exempt, which these files are not.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
refactor(list): Split list shell sections

Changes:
- Split ListMain into focused search, results, footer, and overlay sections
- Preserve keyboard, virtual list, detail, and overlay behavior
- Update renderer specs and the suppression cleanup ledger

Why:
- Reduces the main list shell's cohesion hotspot
- Makes future list UI changes easier to review
EOF
)"
```

- [x] 10.1 Refresh suppression cleanup inventory.
  - Read `assets/docs/archive/codebase-quality-audit/`.
  - Refresh rows for `ListMain`, list hooks, task sheet, sync modal, and view navigation against the current branch.
  - Do not create a second suppression inventory.
  - _Acceptance criteria: R5.1, R5.3, R5.4, R9.1_

- [x] 10.2 Extract search and filter chrome.
  - Create `list_search_filter_chrome.component.tsx`.
  - Preserve search input, filter chip, back button, and focus behavior.
  - Add `list_search_filter_chrome.component.spec.tsx`.
  - _Acceptance criteria: R7.5, R9.1, R9.2, R12.5_

- [x] 10.3 Extract list body and empty states.
  - Create `list_results_body.component.tsx`.
  - Preserve virtual padding, visible rows, sentinel, selection, and empty states.
  - Add `list_results_body.component.spec.tsx`.
  - _Acceptance criteria: R7.5, R9.1, R9.3, R12.5_

- [x] 10.4 Extract footer and overlay hosts.
  - Create `list_footer.component.tsx`.
  - Create `list_overlay_hosts.component.tsx`.
  - Preserve keyboard hint text, task sheet, settings host, command palette, sync modal, and action toast behavior.
  - Add co-located specs for both components.
  - _Acceptance criteria: R7.5, R9.1, R9.4, R12.5_

- [x] 10.5 Verify phase 10.
  - Run focused renderer tests for changed files.
  - Run `mise run e2e:preview` when available.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - Run the full quality gate.
  - Update `assets/docs/archive/codebase-quality-audit/tasks.md` with the current partial extraction status; do not mark suppression rows complete until the related suppressions are actually removed.
  - Update the phase 10 impact ledger row with `ListMain` line-count delta, extracted component count, co-located spec count, preview e2e result or blocker, and performance benchmark result or blocker.
  - _Acceptance criteria: R5.2, R5.3, R9.5, R11.1, R11.3, R12.1_

## Phase 11 — Closure

**Goal:** Record final audit state and handoff evidence.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(audit): Record implementation closure

Changes:
- Mark completed audit tasks and summarize remaining follow-ups
- Record final verification commands and results
- Link any work delegated to the suppression cleanup spec

Why:
- Leaves the best-practices audit ready for review or continuation
- Keeps future agents from re-discovering already completed work
EOF
)"
```

- [x] 11.1 Re-run all audit verification.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Run `bun test --coverage`.
  - Run `mise run test:spec-audit` if phase 7 added it.
  - Run `mise run e2e:preview` if the environment supports it.
  - Run `mise run perf run`.
  - Run `mise run perf compare` when `tools/benchmarks/results/baseline.json` exists.
  - Update the phase 11 impact ledger row with the final comparison against
    the phase 0 baseline.
  - _Acceptance criteria: R6.1, R7.5, R11.1, R11.3, R12.1_

- [x] 11.2 Update audit documentation.
  - Update `report.md` with completed items and remaining follow-ups.
  - Mark completed tasks in this file.
  - If work moved to `assets/docs/archive/codebase-quality-audit/`, link the
    exact rows or tasks.
  - _Acceptance criteria: R5.2, R5.4, R12.1_

- [x] 11.3 Prepare handoff summary.
  - Summarize changed files by phase.
  - Include verification commands and results.
  - Call out any skipped preview e2e or build checks with exact reasons.
  - _Acceptance criteria: R11.1, R11.3, R12.1_
