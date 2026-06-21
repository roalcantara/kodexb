<!-- markdownlint-disable-file -->

# Safety hardening — security subgate + handoff scrub

**Feature Branch**: `feat/006-safety-hardening`
**Release**: v0.14.0 (target)
**Status**: Draft

## Clarifications

### Session 2026-06-07
- Q: How should the initial CVE list criteria be defined? → A: Define by specific package name and version range.
- Q: How should secret scanning be enforced after the planning pivot? → A: Use HK gitleaks builtin for secret scanning; keep `spec security` focused on dependency + Electrobun checks.

**Input**: Add a deterministic `mise run spec security` subgate (dependency audit + Electrobun surface check) with secret scanning enforced by the HK gitleaks builtin, and a `spec handoff-scrub` validator wired into `spec handoff-generate`, closing the two highest-leverage safety gaps identified during the Spec Kit setup evaluation: H1 (no automated security checks in `spec gate`) and H2 (worker-handoff prompts dispatched unscrubbed).

## Introduction

The current `mise run spec gate` chains `lint`, `trace`, and `app-quality-gate` (Biome, knip, ast-grep, tsc, jscpd, src tests). It is intentionally deterministic and ship-blocking. What it does **not** cover:

- **Secrets**: nothing scans staged or tracked files for credentials before commit, before merge, or in CI. The repo ships an Electrobun launcher with RPC + webviews; a leaked token has higher blast radius than for a typical Node CLI.
- **Dependencies**: `bun.lock` deltas are reviewed by humans only. No automated check against known-bad CVEs or pin-violations.
- **Electrobun surface**: [Principle IX][principle-ix] mandates `sandbox: true`, partition isolation, and navigation allowlists for external webviews. It is **enforced by review only** today. AST drift in [electrobun.config.ts](../../../electrobun.config.ts) cannot be detected by lint.
- **Handoff prompts**: `mise run spec handoff-generate` writes `tmp/handoffs/opencode-{slug}-{focus}.md` and optionally dispatches to opencode. There is no documented sanitisation pass — secrets, absolute filesystem paths outside the repo, and environment-variable literals could land in a prompt body, then in an external process, then in transcripts the operator does not control.

This spec adds two deterministic governance scripts under `tools/governance/security/`:

1. **`spec security`** — runs two checks (dependencies, Electrobun surface), aggregates `Finding[]`, returns a single exit code. Secret scanning is enforced separately via the HK `gitleaks` builtin. Wired into the local `hk` pre-commit hook (changed-files mode), `mise run spec gate` (full sweep, `--strict`), and `.github/workflows/review.yml` (full sweep, `--strict`, `--base $GITHUB_BASE_REF`).
2. **`spec handoff-scrub`** — validates a handoff prompt body before it is written to `tmp/handoffs/`. On any high-severity hit it throws `HandoffScrubError`; no file is written and no dispatch is attempted. Wired into `handoff_generate.script.ts` between the prompt-render step and the write step.

Both scripts mirror the layout, flag conventions, and observability shape of the existing 005-workflow-observability + spec-lint/trace/audit scripts. No new runtime dependencies are introduced beyond an AST parser (already vendored) and an in-tree secrets regex set bootstrapped from the gitleaks default rules.

The constitution is amended from v1.3.2 to **v1.4.0** to register the new gate row and to bind [Principle IX][principle-ix] to its machine-checked equivalent. The amendment lands in [Slice 5](#slice-ordering) after the scripts exist, so the gate has teeth on the day it becomes required.

## Out of scope

- **SBOM emission** (CycloneDX / SPDX) — useful for supply-chain provenance; deferred to a follow-up spec. The dependency check writes a delta summary, not a full bill of materials.
- **SAST beyond regex secrets** — Semgrep / CodeQL-style semantic SAST is out of MVP. The secrets check uses regex + Shannon-entropy heuristics, which is the same posture as gitleaks and is sufficient for credential discovery.
- **License-policy enforcement** on `bun.lock` deltas — license review stays manual.
- **Runtime / behavioural security** (e.g. CSP audit on rendered HTML, network egress allowlists) — distinct from the source-time gate this spec ships.
- **Field-level redaction in handoff bodies** — H2 is hard-fail by design. A redact-and-emit policy was considered and rejected during brainstorming because it ships partially-degraded prompts to the worker without operator awareness. A future spec may add an opt-in `--redact` mode.
- **Multi-provider handoff dispatch** beyond opencode — inherits the 004 OHW-4 v2 boundary; the scrubber operates on the file body and is provider-agnostic, so this remains a true non-goal.
- **LLM-based check classification** — every check in v1 is deterministic. Probabilistic classifiers are out of scope.
- **Per-feature `handoff-allowlist.yml`** beyond literal-string exemptions. No glob support, no regex support; literal strings only. The allowlist is a security-relevant surface and intentionally minimal.

## Glossary

| Term                         | Meaning                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Finding**                  | One TypeBox-validated record emitted by a check: `{ id, severity, file, line?, rule, message }`.                                              |
| **Severity**                 | One of `critical \| high \| medium \| low`. `critical`/`high` always fail. `medium` fails under `--strict` (default in CI + `spec gate`).     |
| **Security run**             | One invocation of `tools/governance/security/scan.script.ts`. Emits one `security_run` event to `tmp/security/`.                              |
| **Handoff scrub**            | One invocation of `tools/governance/security/handoff_scrub.script.ts` against a prompt body. Throws on hit; no return value for hits.         |
| **Per-feature allowlist**    | Optional `assets/specs/<NNN-slug>/handoff-allowlist.yml`. TypeBox-validated. Names literal-string exemptions only. Missing file = strict.     |
| **Electrobun external view** | Any `BrowserView` or auxiliary `BrowserWindow` declared in [electrobun.config.ts](../../../electrobun.config.ts) that is not the main window (identified by id `main` or protocol `views://shell`). |
| **Changed-files mode**       | `spec security --changed-only [--base SHA]`. Restricts dependency and Electrobun-surface checks to files changed against `--base`; secrets are scanned by HK gitleaks. |
| **Lockfile delta**           | The set of added or version-bumped entries in `bun.lock` between `--base` and `HEAD`. The dependency check operates on this delta only.       |

---

## REQUIREMENT SH-1: Secret scan blocks committed credentials

**User story:** As a maintainer, I want every commit and every PR to be screened
for committed credentials so that a leak never reaches `main`.

### Acceptance criteria

1. WHEN `hk` is invoked (pre-commit or `check`), THEN the `gitleaks` builtin SHALL scan the staged/changed files and SHALL block the operation on any detected secret.
   - **Measure:** Seeded secret in a staged file (e.g. `sample.bad.txt`) causes `hk` to fail with a non-zero exit code.
   - **Evidence:** `hk check` output on a branch with a test secret.

2. WHEN a match falls inside `tools/governance/security/fixtures/` or any directory listed in the default exemption set (including `.git/`, `node_modules/`, and `.electrobun-cache/`), THEN no `Finding` SHALL be emitted for that match. The authoritative set of excluded paths is defined in `rules_loader.script.ts`.
   - **Measure:** Table-driven test asserts zero findings on `*.allowed.txt` fixtures and on every path under the exemption set.
   - **Evidence:** Same spec; exemption-table coverage.

3. WHEN the scanner encounters a binary file (NUL byte in first 4 KiB) or a file larger than 5 MiB, THEN it SHALL skip the file and emit no `Finding` for it.
   - **Measure:** Binary fixture (`secrets/binary.bad.bin`) and oversize fixture produce zero findings.
   - **Evidence:** Same spec; binary-skip and size-skip cases.

4. WHEN `--changed-only --base <SHA>` is passed, THEN the scanner SHALL only inspect files in the diff against `<SHA>` and the wall-time SHALL stay under 500 ms at p95 over 100 iterations on a populated fixture.
   - **Measure:** Bench harness following `tools/metrics/harnesses/perf/perf.script.ts`; populated fixture seeded via `mkdtempSync`.
   - **Evidence:** New perf script under `tools/governance/security/perf/secrets_perf.script.ts` + committed baseline JSON.

---

## REQUIREMENT SH-2: Dependency audit blocks known-bad lockfile deltas

**User story:** As a maintainer, I want every change to `bun.lock` to be checked
against an in-tree CVE list and, when available, against `bun audit`, so that
known-bad versions cannot land silently.

### Acceptance criteria

1. WHEN `mise run spec security --strict` runs and `bun.lock` has changed against `--base`, THEN `checks/dependencies.script.ts` SHALL parse the delta, match each added or bumped entry against the in-tree CVE list at `tools/governance/security/cve.list.yml`, and emit one `Finding` of severity `critical` per match.
   - **CVE criteria:** The initial set for `cve.list.yml` SHALL include known malicious or highly vulnerable packages identified during the 0.13.x audit (e.g. `event-stream` malicious versions). New entries are added by human maintainers based on advisory alerts.
   - **Edge case:** IF `bun.lock` is malformed or unparseable, THEN the check SHALL emit one `Finding` of severity `critical` and exit 1.
   - **Measure:** Fixture `bun.lock.cve.snapshot` produces ≥ 1 `Finding`; clean fixture produces zero.
   - **Evidence:** `bun test --config /dev/null tools/governance/security/checks/dependencies.script.spec.ts`.

2. WHEN the `bun audit` subcommand is available on `$PATH` and exits cleanly, THEN its JSON output SHALL be parsed and each reported advisory of severity `critical`, `high`, or `medium` SHALL produce one `Finding` at matching severity.
   - **Measure:** Fake-bun shim emits a deterministic JSON advisory; assertion covers the round-trip.
   - **Evidence:** Same spec; `bun audit` shim test.

3. WHEN a `bun audit` advisory and an in-tree CVE-list hit refer to the same package/version tuple, THEN the dependency check SHALL emit one deduplicated `Finding` at the higher severity of the two sources.
   - **Measure:** Fixture with overlapping advisory + CVE-list hit emits exactly one finding with max severity.
   - **Evidence:** Same spec; overlap-precedence case.

4. WHEN `bun audit` is unavailable or exits non-zero, THEN the check SHALL log the absence to stderr and fall back to the in-tree CVE list only, without changing the exit code that the CVE-list pass would have produced on its own.
   - **Measure:** Missing-shim test asserts the script still exits 0 on a clean lockfile and 1 on a CVE-list match.
   - **Evidence:** Same spec; missing-shim case.

5. WHEN `bun.lock` is unchanged against `--base`, THEN the dependency check SHALL emit zero `Finding`s and complete in under 50 ms at p95.
   - **Measure:** Bench harness over no-delta path.
   - **Evidence:** Same perf harness as SH-1 AC4 with a `dependencies-noop` scope.

---

## REQUIREMENT SH-3: Electrobun-surface check enforces Principle IX

**User story:** As a maintainer of the Electrobun shell, I want
[electrobun.config.ts](../../../electrobun.config.ts) to be machine-checked for
`sandbox`, `partition`, and `navigation` settings so that AST drift on
auxiliary webviews cannot weaken the security posture documented in Principle IX.

### Acceptance criteria

1. WHEN `mise run spec security --strict` runs, THEN `checks/electrobun_surface.script.ts` SHALL AST-parse [electrobun.config.ts](../../../electrobun.config.ts), enumerate every Electrobun external view, and assert that each one declares `sandbox: true`, a non-empty `partition` string, and a non-wildcard `navigation` allowlist (MUST NOT contain `*` or match any protocol other than `views://` or `https://`).
   - **Measure:** Compliant fixture (`electrobun/config.compliant.ts`) produces zero findings; each non-compliant fixture (`config.missing_sandbox.ts`, `config.empty_partition.ts`, `config.wildcard_navigation.ts`) produces exactly one `Finding` of severity `high`.
   - **Evidence:** `bun test --config /dev/null tools/governance/security/checks/electrobun_surface.script.spec.ts`.

2. WHEN a `BrowserView` or auxiliary `BrowserWindow` is declared but the AST shape is unrecognised (renamed property, computed key), THEN the check SHALL emit one `Finding` of severity `medium` naming the unrecognised node and SHALL NOT silently pass.
   - **Measure:** Unknown-shape fixture produces exactly one `medium` finding; the message names the source line.
   - **Evidence:** Same spec; unknown-shape case.

3. WHEN [electrobun.config.ts](../../../electrobun.config.ts) cannot be parsed (syntax error, missing file), THEN the check SHALL emit one `Finding` of severity `critical` and SHALL NOT throw.
   - **Measure:** Corrupt-fixture test asserts exit 1 with one critical finding, not a stack trace.
   - **Evidence:** Same spec; corrupt-fixture case.

---

## REQUIREMENT SH-4: Handoff scrub refuses sensitive emit

**User story:** As an operator dispatching a worker handoff, I want any prompt
body containing secrets, paths outside the repo, or environment-variable
literals to be refused at emit-time, before any file is written or any
external process is invoked.

### Acceptance criteria

1. WHEN `mise run spec handoff-generate` is invoked and the rendered prompt body matches any secrets-regex rule (defined in `checks/secrets.rules.ts` following gitleaks patterns), contains any filesystem path (absolute or relative) whose canonicalised form does not resolve under the repo root or `${HOME}`, or contains an environment-variable literal that appears outside of markdown inline-code or code-block segments (`process.env.X`, `Bun.env.X`, `$ENV_VAR`), THEN `scrubPrompt` SHALL throw `HandoffScrubError`, no file SHALL be written under `tmp/handoffs/`, and no dispatch SHALL be invoked.
   - **Literals in Code Blocks:** Literals inside backticks are permitted for documentation purposes only if they do not match a known secret.
   - **Rules Mapping:** Matches against `secrets.rules.ts` with severity ≥ `high` are considered high-severity hits and SHALL block the emit.
   - **Measure:** Four fixtures (`handoff.with_secret.md`, `handoff.with_abs_path.md`, `handoff.with_rel_escape.md`, `handoff.with_env_literal.md`) each cause `scrubPrompt` to throw; post-throw `Bun.file(target).exists()` is `false`; dispatch shim is never called.
   - **Evidence:** `bun test --config /dev/null tools/governance/security/handoff_scrub.script.spec.ts`.

2. WHEN the prompt body is clean, THEN `scrubPrompt` SHALL return without throwing, the file SHALL be written to its target path, and the existing `handoff_written` event from 005-WOBS-3 SHALL fire unchanged.
   - **Measure:** Clean fixture (`handoff.clean.md`) round-trip; assert file exists and the 005 event is emitted exactly once.
   - **Evidence:** Same spec; clean-path case.

3. WHEN `HandoffScrubError` is thrown, THEN the error message SHALL name the rule id, the offending substring (truncated to 32 chars with the centre redacted), and the byte offset within the prompt body.
   - **Measure:** Catch-and-assert test on each fixture; message shape matches the documented format string.
   - **Evidence:** Same spec; error-shape case.

---

## REQUIREMENT SH-5: Per-feature allowlist is optional, validated, and literal-only

**User story:** As a maintainer of a feature that legitimately references a
test fixture path or a documented constant inside its handoff body, I want a
narrow, auditable exemption mechanism that cannot accidentally turn into a
glob-based bypass.

### Acceptance criteria

1. WHEN a feature directory contains `assets/specs/<NNN-slug>/handoff-allowlist.yml`, THEN the scrubber SHALL load it, validate it against a TypeBox `HandoffAllowlist` schema, and treat each entry as a literal-string exemption against scrubber rules of severity ≤ `high`.
   - **Empty allowlist:** If the file exists but contains no entries, it SHALL be treated as an empty set (no exemptions) and SHALL NOT cause a validation error.
   - **Measure:** Fixture allowlist exempts a `with_secret.md` fixture; scrubber returns without throwing; an audit row naming the matched allowlist entry and rule id is appended to the `metadata` field of the `security_run` event (SH-8).
   - **Evidence:** Same `handoff_scrub.script.spec.ts`; allowlist-happy-path case.

2. WHEN the allowlist file fails TypeBox validation (unknown keys, non-string entry, missing required `entries` field), THEN the scrubber SHALL throw `HandoffAllowlistError` and SHALL NOT proceed to scrub. Allowlist failure is fatal, not a soft warning.
   - **Measure:** Malformed-allowlist fixture causes throw; no file is written.
   - **Evidence:** Same spec; malformed-allowlist case.

3. WHEN an allowlist entry contains a glob character (`*`, `?`, `[`), a regex anchor (`^`, `$`), or any non-literal token, THEN TypeBox validation SHALL reject the file under AC2 above.
   - **Measure:** Glob-entry fixture and regex-entry fixture each cause `HandoffAllowlistError`.
   - **Evidence:** Same spec; non-literal-entry cases.

---

## REQUIREMENT SH-6: `spec gate` and `spec handoff-generate` chain the new scripts

**User story:** As a maintainer running the canonical gate, I want
`mise run spec gate` to include `spec security --strict`; as an operator
running `spec handoff-generate`, I want the scrubber to run on every emit.

### Acceptance criteria

1. WHEN `mise run spec gate <featureDir>` is invoked, THEN it SHALL run `spec lint --strict`, then `spec trace --strict`, then `spec security --strict`, then the existing `app-quality-gate` step, exiting non-zero on the first failure.
   - **Measure:** Gate invocation with a CVE-list-positive fixture exits 1 at the `spec security` step; lint and trace still run; app-quality-gate is not reached.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/audit.script.spec.ts` (extended) plus a smoke run of `mise run spec gate assets/specs/006-safety-hardening`.

2. WHEN `mise run spec handoff-generate --feature <dir> --focus <focus>` is invoked, THEN `scrubPrompt` SHALL run between prompt render and file write, and on throw the generator SHALL exit 1 with the `HandoffScrubError` message printed to stderr.
   - **Measure:** Forced-fail integration test asserts exit 1, no file written, error printed.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/handoff_generate.script.spec.ts` (extended).

---

## REQUIREMENT SH-7: hk pre-commit and CI run the security subgate

**User story:** As a developer committing locally and as a reviewer reading a
PR, I want the security subgate to run automatically — locally on staged files,
and in CI on the full diff against the base ref.

### Acceptance criteria

1. WHEN `hk` is invoked as the pre-commit hook, THEN it SHALL run `mise run spec security --changed-only --strict` against staged files and SHALL block the commit on non-zero exit.
   - **Measure:** [hk.pkl](../../../hk.pkl) declares the new step; integration smoke seeds a staged secrets-positive file and asserts the commit is blocked.
   - **Evidence:** `mise run hk check` smoke + spec assertion in `tools/governance/security/scan.script.spec.ts`.

2. WHEN `.github/workflows/review.yml` runs on a pull request, THEN a `security` job SHALL invoke `mise run spec security --strict --base "$GITHUB_BASE_REF"` and the job SHALL be a required check on `main`.
   - **Measure:** Workflow YAML declares the job; branch-protection note added under [CI_GUIDE.md](../../guides/CI_GUIDE.md).
   - **Evidence:** PR diff review of `.github/workflows/review.yml` + green run on this feature's own PR + branch protection settings evidence stored in `tmp/reviews/security/required-checks.md` and/or linked screenshot showing `security` as required.
   - **Boundary:** Branch protection settings are repository configuration and are enforced outside source code; this feature treats them as required operational evidence.

3. WHEN `hk` is bypassed via `--no-verify`, THEN the CI `security` job SHALL still detect the same findings.
   - **Measure:** Manually-pushed branch with a fixture-secret in history fails the CI `security` job.
   - **Evidence:** PR review demonstrates the bypass path is caught.

---

## REQUIREMENT SH-8: Security events emit to `tmp/security/` with bounded retention

**User story:** As a maintainer investigating a failed gate, I want a queryable
record of every security run so I can replay decisions without rerunning the
scripts.

### Acceptance criteria

1. WHEN a security run completes (pass or fail), THEN a `security_run` event SHALL be appended to `tmp/security/<YYYY-MM-DD>/<run_id>.ndjson` carrying `ts`, `phase` (`scan|handoff-scrub`), `trigger` (`hk|gate|ci|handoff-emit`), `findings` (full `Finding[]`), `findings_count`, `severity_max`, `exit_code`, `duration_ms`, nullable `feature` slug, `branch`, `commit_sha`, and nullable `base_ref`.
   - **Concurrency:** Event writes SHALL use atomic file appending (`O_APPEND`) or unique file names per run id to prevent corruption from concurrent runs.
   - **Local-first:** The security scan SHALL NOT require network access to run (Principle I). `bun audit` failures due to no network SHALL be handled gracefully per SH-2 AC4.
   - **Measure:** Round-trip test renders an event, runs `Value.Check`, writes JSON, re-reads, and asserts `Value.Check` passes a second time.
   - **Evidence:** `bun test --config /dev/null tools/governance/security/scan.script.spec.ts` (event-shape case).

2. WHEN events are written, THEN the `tmp/` parent SHALL be excluded from git and `hk.pkl`, and retention SHALL reuse the helper introduced in [005-workflow-observability](../005-workflow-observability/spec.md) WOBS-5 — date directories older than 30 days are pruned by an explicit subcommand and lazily on the next list call.
   - **Measure:** Backdated date directories under `tmp/security/` are removed by the shared prune helper.
   - **Evidence:** Same spec; prune fixture reuses the 005 helper.

3. WHEN an event write fails (disk full, permission denied), THEN the originating script SHALL still complete with the exit code it would have produced without instrumentation, logging the failure to stderr.
   - **Measure:** Stub-writer injection test asserts exit code is unchanged on writer-throw.
   - **Evidence:** Same spec; stub-writer case.

---

## REQUIREMENT SH-9: No existing deterministic gate is weakened

**User story:** As a maintainer of the existing quality gate, I do not want the
security subgate's introduction to change the failure semantics of any
script that ships today.

### Acceptance criteria

1. WHEN the security subgate lands, THEN [`tools/governance/specs/lint.script.ts`](../../../tools/governance/specs/lint.script.ts), [`tools/governance/specs/trace.script.ts`](../../../tools/governance/specs/trace.script.ts), [`tools/governance/specs/audit.script.ts`](../../../tools/governance/specs/audit.script.ts), and [`.agents/skills/app-quality-gate/scripts/gate.sh`](../../../.agents/skills/app-quality-gate/scripts/gate.sh) SHALL be unchanged in their failure semantics — only the wrapper that chains them in `mise run spec gate` is modified.
   - **Measure:** Diff review confirms no exit-code logic changes in those four files; full `bash .agents/skills/app-quality-gate/scripts/gate.sh` stays green.
   - **Evidence:** PR diff + green gate run.

2. WHEN `spec security` returns a `low`-severity-only run under `--strict`, THEN the exit code SHALL be 0 (only `medium` and above gate under `--strict`; `critical`/`high` always gate).
   - **Measure:** Low-only fixture asserts exit 0 with `--strict`.
   - **Evidence:** `bun test --config /dev/null tools/governance/security/scan.script.spec.ts` (severity-matrix case).

---

## REQUIREMENT SH-10: Constitution amendment binds Principle IX to the executable check

**User story:** As a reader of [the constitution](../../../.specify/memory/constitution.md),
I want Principle IX's Electrobun security clause to point at the machine-checked
gate that enforces it, and I want the Quality Gates → Review table to name the
security subgate so the binding is explicit.

### Acceptance criteria

1. WHEN slice 5 lands, THEN [constitution.md](../../../.specify/memory/constitution.md) SHALL bump from v1.3.2 to v1.4.0, Principle IX SHALL gain a clause naming `mise run spec security` (`electrobun_surface.script`) as the enforcement mechanism, and the Quality Gates → Review table SHALL gain a `Security subgate` row marked `REQUIRED`.
   - **Measure:** Diff review of the constitution; version line reads `1.4.0`; the new clause and table row are present.
   - **Evidence:** PR diff; amendment log entry appended to [spec-kit-constitution-log.md](../../docs/specs/spec-kit-constitution-log.md).

2. WHEN slice 5 lands, THEN [WORKFLOW_SDD_GUIDE.md § Deterministic gates](../../guides/WORKFLOW_SDD_GUIDE.md#deterministic-gates-authoritative) SHALL list `mise run spec security` and [orchestrated-handoff § Dispatch](../../guides/WORKFLOW_SDD_GUIDE.md#dispatch) SHALL reference `spec handoff-scrub` as the emit-time validator.
   - **Measure:** Guide diff review; both anchors present and resolved.
   - **Evidence:** PR diff.

---

## REQUIREMENT SH-11: Full-sweep security run monitors for performance regressions

**User story:** As a maintainer running the full gate in CI, I want to ensure
that the security scan does not regress in performance as the check suite
grows, so that CI wall-time stays predictable.

### Acceptance criteria

1. WHEN `mise run spec security --strict` is invoked, THEN the wall-time SHALL be benchmarked against a baseline JSON committed under `tools/metrics/baselines/perf/security.json`.
   - **Enforcement:** Regression evaluation SHALL read `policy.regression_pct` from `tools/metrics/baselines/perf/security.json` and SHALL be enforced by the perf workflow step in `.github/workflows/review.yml`.
   - **Measure:** A 25% regression against the baseline fails the perf-baseline check, following the same pattern as 005-WOBS-8.
   - **Evidence:** CI logs from `.github/workflows/review.yml` (perf job).

---

## REQUIREMENT SH-12: `spec ready` consolidates all verification gates

**User story:** As a maintainer, I want a single command to run all quality
and security checks so I can verify readiness before reporting a task as done.

### Acceptance criteria

1. WHEN `mise run spec ready <featureDir>` is invoked, IT SHALL invoke `spec gate <featureDir>` (as defined in SH-6) and then run readiness-specific validations (catalog/tag checks).
   - **Measure:** Invocation on a clean feature exits 0; failure in `spec gate` or any readiness-specific validation blocks subsequent steps and exits non-zero.
   - **Evidence:** Integration run on `assets/specs/006-safety-hardening`.

---

## Verification strategy

This feature is release-gated by deterministic script/test evidence. Every requirement above ships release-blocking evidence as a deterministic `bun test` run plus, for SH-1 AC4, SH-2 AC4, and SH-11, a perf-harness baseline. No new Gherkin flows are required.

Cross-artifact drift is treated as a release blocker for this feature: before implementation completion, run `/speckit.analyze 006-safety-hardening` and require 0 CRITICAL and 0 HIGH findings.

## Slice ordering

Tracer-bullet slices for [tasks.md](tasks.md). Each slice is independently
shippable; each leaves the gate strictly stronger than before, never weaker.

1. **Slice 1 — secrets check end-to-end.** `secrets.script.ts` + `scan.script.ts`
   skeleton + `Finding` schema + JSONL emit + hk pre-commit step + CI step.
   Smallest viable security subgate; proves the wiring.
2. **Slice 2 — dependency audit.** Adds `dependencies.script.ts` + CVE list +
   `bun audit` shim path. Reuses the scan-script harness from slice 1.
3. **Slice 3 — Electrobun-surface check.** Adds `electrobun_surface.script.ts`
   AST parser + fixtures. No `spec gate` change yet; lands behind a feature flag
   if needed to keep slice 3 reviewable in isolation.
4. **Slice 4 — handoff scrub.** New `handoff_scrub.script.ts` + per-feature
   allowlist schema + integration into `handoff_generate.script.ts`.
5. **Slice 5 — constitution amendment + guide updates + `spec gate` chain.**
   Flips `spec gate` to require `spec security --strict`; bumps constitution
   to v1.4.0; updates [WORKFLOW_SDD_GUIDE.md](../../guides/WORKFLOW_SDD_GUIDE.md),
   [DoD.md](../../guides/DoD.md), and [CI_GUIDE.md](../../guides/CI_GUIDE.md).

## Performance / non-functional notes

- `spec security --changed-only` MUST complete in under 500 ms at p95 over 100
  iterations on a populated fixture (SH-1 AC4). This is the latency budget for
  the hk pre-commit hook; anything slower defeats the local fast-fail.
- `spec security --strict` (full sweep) has no hard p95 target but SHALL be
   benchmarked against a baseline JSON committed under
   `tools/metrics/baselines/perf/security.json`; regression evaluation reads
   `policy.regression_pct` from that baseline and is enforced in
   `.github/workflows/review.yml` via the perf baseline check path.
- `scrubPrompt` MUST complete in under 50 ms at p95 over 100 iterations on a
  typical handoff body (≤ 50 KiB). Scrub is on the interactive path; latency
  here is felt by every `spec handoff-generate` invocation.
- No new runtime dependencies. AST parsing reuses whatever is already in
  `tools/` (`ts-morph` or `@babel/parser` — selected during slice 3 after a
  one-line dependency audit, recorded in [tasks.md](tasks.md)). Secrets regex
  set is in-tree, sourced from the gitleaks default rules at a pinned commit
  documented in `tools/governance/security/checks/secrets.rules.ts`.
- All scripts honour the existing `--json` flag convention from
  [`lint.script.ts`](../../../tools/governance/specs/lint.script.ts) for
  CI consumption.

## Assumptions

- `bun.lock` is the canonical lockfile. If the project moves to a different
  lockfile format, SH-2 needs revisiting.
- `electrobun.config.ts` remains the single declaration point for Electrobun
  views. If view declarations migrate to a different module, SH-3's AST anchor
  needs updating; that is a follow-up spec, not a regression here.
- `hk` continues to honour `mise run` invocations in its pre-commit step. If
  hk is replaced, SH-7 AC1 needs to be re-wired to whatever takes its place.

## Decisions Log

| #    | Question                                                                                         | Status | Notes                                                                          |
| ---- | ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| OQ-1 | Does Bun ship a `bun audit` subcommand on the target version? If not, fallback is CVE-list only. | Closed | Resolved in Slice 2: fallback behavior retained per SH-2 AC4.                  |
| OQ-2 | Which AST parser does `tools/` already vendor — `ts-morph` or `@babel/parser`?                   | Closed | Resolved in Slice 3: parser selected and recorded in implementation notes.     |
| OQ-3 | Should the per-feature allowlist also gate the `spec security` checks (not just scrub)?          | Closed | Resolved in Slice 1 review: allowlist does not apply to spec security scanner. |

[principle-ix]: ../../../.specify/memory/constitution.md#ix-electrobun-security--distribution
