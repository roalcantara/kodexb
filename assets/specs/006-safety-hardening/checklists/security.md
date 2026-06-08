# Security & Governance Requirements Quality Checklist

**Feature**: 006-safety-hardening
**Created**: 2026-06-07
**Depth**: High Rigor
**Focus**: Principle IX (Electrobun), Principle II (Result/Throw), Operational Resilience

## Requirement Completeness
- [x] CHK001 - Are the exact secrets-regex rules and entropy thresholds (3.5 bits, 20 chars) documented as normative requirements or just implementation notes? [Completeness, Spec §SH-1 AC1]
- [x] CHK002 - Does the spec define the initial set of CVEs for `tools/governance/security/cve.list.yml` or the criteria for adding new ones? [Completeness, Spec §SH-2 AC1]
- [x] CHK003 - Are the "Electrobun external views" explicitly defined or enumerated in the requirements? [Completeness, Spec §Glossary]
- [x] CHK004 - Are the specific "environment-variable literals" (e.g., `process.env.*`) to be blocked by the scrubber exhaustive or illustrative? [Completeness, Spec §SH-4 AC1]
- [x] CHK022 - Is the 'fail-closed' requirement explicitly documented for cases where mandatory local files (like `cve.list.yml` or the secrets rule set) are missing or corrupt? [Completeness, Spec §SH-1 AC1, SH-2 AC1]
- [x] CHK027 - Does the spec define if the `security_run` event should contain the *diff* of findings or the *full* set? [Completeness, Spec §SH-8 AC1]

## Requirement Clarity & Precision (High Rigor)
- [x] CHK005 - Is "perceptibly instant" for pre-commit hooks quantified with a hard latency budget (e.g., 500ms p95)? [Clarity, Spec §SH-1 AC4]
- [x] CHK006 - Is the format of the `HandoffScrubError` message (redacted centre, rule id, offset) specified as a normative contract? [Clarity, Spec §SH-4 AC3]
- [x] CHK007 - Are the specific TypeBox schemas for `HandoffAllowlist` and `Finding` documented or referenced? [Clarity, Spec §SH-5 AC1, §Glossary]
- [x] CHK008 - Is the "best-effort behavior" for event writing (SH-8 AC3) defined such that it satisfies Principle II (Result over throw)? [Consistency, Spec §SH-8 AC3]
- [x] CHK021 - Are the specific regex patterns for scrubbing environment-variable literals (e.g., `process.env.*`) explicitly listed as a normative set? [Clarity, Spec §SH-4 AC1]
- [x] CHK023 - Does the requirement define the exact AST marker (e.g., window ID 'main' or protocol 'views://') used to identify and exempt the 'main window' from Electrobun surface checks? [Clarity, Spec §Glossary, SH-3 AC1]
- [x] CHK026 - Are the criteria for 'high-severity hit' in the handoff scrub quantified with specific rule mappings? [Clarity, Spec §SH-4 AC1]

## Principle IX: Electrobun Security
- [x] CHK009 - Does the spec define the fallback behavior when the AST parser encounters a `BrowserView` with a dynamic/computed key? [Coverage, Spec §SH-3 AC2]
- [x] CHK010 - Are the "non-wildcard navigation allowlist" requirements quantified (e.g., must start with `views://` or a specific domain)? [Clarity, Spec §SH-3 AC1]
- [x] CHK011 - Is the severity of an Electrobun policy violation (High) consistent with the critical nature of Principle IX? [Consistency, Spec §SH-3 AC1]

## Operational Resilience & Failure Modes
- [x] CHK012 - Are requirements defined for when `bun.lock` is malformed or unparseable? [Coverage, Spec §SH-2 AC1]
- [x] CHK013 - Does the spec define behavior for when the secrets scan exceeds the 5MiB limit—should it emit a `Warning` finding or skip silently? [Clarity, Spec §SH-1 AC3]
- [x] CHK014 - Is the behavior for a full `tmp/` disk during event writing explicitly specified to prevent data corruption? [Edge Case, Spec §SH-8 AC3]
- [x] CHK015 - Are requirements specified for concurrent security runs (e.g., two developers committing at once)? [Coverage, Spec §SH-8 AC1]
- [x] CHK024 - Are requirements defined for how the scanner behaves when network access is unavailable (honoring Principle I: Local-first)? [Consistency, Spec §SH-8 AC1]
- [x] CHK025 - Is the behavior specified for when a `handoff-allowlist.yml` is present but contains no entries? [Edge Case, Spec §SH-5 AC1]

## Measurability & Traceability
- [x] CHK016 - Can the 25% performance regression target be objectively verified using existing project benchmarks? [Measurability, Spec §SH-11 AC1]
- [x] CHK017 - Are all AC Measure/Evidence strings linked to executable commands (`bun test`, `mise run`)? [Traceability, Spec §SH-1 to SH-11]
- [x] CHK018 - Does the "handoff-allowlist.yml" literal-only requirement include a machine-checked negative constraint (rejecting globs)? [Measurability, Spec §SH-5 AC3]
- [x] CHK028 - Are the requirements for the 'in-tree secrets regex set' consistent with the performance budget (500ms p95)? [Consistency, Spec §SH-1 AC4]

## Consistency & Integration
- [x] CHK019 - Is the insertion of `spec security` into `spec gate` consistent with the "deterministic gate" policy in the Constitution? [Consistency, Spec §SH-6 AC1]
- [x] CHK020 - Do the `changed-files` mode requirements align with how `hk` determines staged files? [Consistency, Spec §SH-7 AC1]

## Post-Remediation Consistency Sweep (Requirements Quality)
- [x] CHK029 - Are the documented check-module names consistent across spec, plan, and tasks (including `.script.ts` / `.script.spec.ts` suffixes) for all security checks? [Consistency, Spec §SH-2/SH-3, Gap]
- [x] CHK030 - Does the plan summary enumerate the same number of `spec security` checks as the normative spec text? [Consistency, Spec §Introduction, Plan §Summary]
- [x] CHK031 - Is the event persistence contract (`tmp/security/<YYYY-MM-DD>/<run_id>.ndjson`) consistently specified in both spec and plan without alternate path variants? [Consistency, Spec §SH-8 AC1, Plan §Technical Context]
- [x] CHK032 - Are branch-protection requirements for the `security` CI check captured as explicit requirements evidence, not only implied by workflow YAML changes? [Completeness, Spec §SH-7 AC2]
- [x] CHK033 - Does the checklist traceability table in plan include all active requirements (including SH-12) rather than a partial range? [Completeness, Plan §E2e traceability]
- [x] CHK034 - Is `spec ready` behavior specified once as a delegated contract (via `spec gate`) and referenced consistently wherever readiness is described? [Clarity, Spec §SH-12, Plan §Feature deltas]
- [x] CHK035 - Are performance baseline source-of-truth requirements aligned to a single committed baseline path and policy field (`policy.regression_pct`)? [Clarity, Spec §SH-11 AC1]
- [x] CHK036 - Are requirements explicit about what remains manual (repository branch protection settings) versus what is machine-enforced in-repo? [Ambiguity, Spec §SH-7 AC2, Tasks §T029A]

## Release-Gate Readiness Requirements (Second Pass)
- [x] CHK037 - Are normative pass/fail thresholds for each `spec security` severity level explicitly stated in one place without conflicting wording elsewhere? [Consistency, Spec §Glossary, Spec §SH-9 AC2]
- [x] CHK038 - Does the requirements set clearly distinguish changed-files mode obligations from full-sweep CI obligations so implementers cannot swap scopes accidentally? [Clarity, Spec §Glossary, Spec §SH-7]
- [x] CHK039 - Are requirements explicit about where branch-protection evidence is stored and what format is acceptable for review (text export, screenshot, or both)? [Measurability, Spec §SH-7 AC2, Tasks §T029A]
- [x] CHK040 - Is the contract for `spec ready` acceptance complete about ordering and short-circuit behavior when `spec gate` fails before readiness-specific checks? [Completeness, Spec §SH-12 AC1]
- [x] CHK041 - Are requirements explicit on whether `security_run` event metadata must include branch, commit SHA, and base ref for replayability in CI investigations? [Gap, Spec §SH-8 AC1]
- [x] CHK042 - Is the dependency-audit requirement clear on precedence when `bun audit` and CVE-list checks disagree in severity for the same package? [Ambiguity, Spec §SH-2 AC2-AC3]
- [x] CHK043 - Are requirements explicit about whether scrubber allowlist exemptions must be echoed in event metadata for auditability? [Traceability, Spec §SH-5 AC1, Spec §SH-8 AC1]
- [x] CHK044 - Do the requirements define acceptance criteria for documentation drift detection so plan/spec/task mismatches are prevented systematically, not ad hoc? [Gap, Plan §Feature deltas, Tasks §Phase 9]
