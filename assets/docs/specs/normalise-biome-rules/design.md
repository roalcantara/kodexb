<!-- markdownlint-disable-file -->
# Normalise Biome rules — Design

## Overview

This migration adopts additional Biome rules as small, measurable rule phases.
Each phase starts with a rule-specific probe, fixes or defers that rule's
findings, enables the rule in `biome.jsonc`, verifies the whole project, and
commits before the next rule begins.

The design intentionally avoids wholesale domain activation. Biome domains and
groups are useful discovery mechanisms, but this repository already has several
architectural guards. The migration therefore treats each new rule as a policy
change that must earn its place in the quality gate.

## Sources

- [Biome linter](https://biomejs.dev/linter/) — rule groups, severities,
  `--only`, and safe or unsafe fixes.
- [Biome domains](https://biomejs.dev/linter/domains/) — domain activation and
  domain-specific rule lists.
- [noConditionalExpect](https://biomejs.dev/linter/rules/no-conditional-expect/)
  — test assertion flow rule.
- [useConsistentTestIt](https://biomejs.dev/linter/rules/use-consistent-test-it/)
  — `test` versus `it` consistency rule.
- [noSkippedTests](https://biomejs.dev/linter/rules/no-skipped-tests/) —
  committed skipped-test guard.

## Current baseline

The initial probes against the current repository produced these findings:

| Probe | Current result | Decision |
| --- | ---: | --- |
| `nursery/useConsistentTestIt` on `src` | 0 findings | Enable early |
| `suspicious/noSkippedTests` on `src` | 0 findings | Enable early |
| `nursery/noConditionalExpect` plus related test rules on `src` | 19 `noConditionalExpect` findings | Fix first |
| `a11y` group on `src` | 4 `noNoninteractiveElementInteractions` findings | Fix targeted rule first |
| Playwright nursery rules on `e2e` | 0 findings | Enable selected rules if useful |
| `suspicious/noConsole` on `src` | 15 findings in `src/shared/logging/console.logger.ts` | Enable with adapter exception |
| `style/noProcessEnv` on `src` | 2 findings | Enable with config/logging exceptions |
| `suspicious/noImportCycles` on `src` | 12 findings | Fix or defer after dependency-cruiser review |
| `react` domain on `src` | 22 errors, 11 warnings, 109 infos | Defer domain-wide adoption |
| `nursery/useExplicitType` on `src` | 367 errors | Defer |
| `correctness/noUnresolvedImports` and `noUndeclaredDependencies` on `src` | 260 errors | Defer until aliases are supported |

The implementer must refresh these counts before editing because the codebase
may have changed.

## Rule adoption model

Each rule phase follows the same model:

1. Run the rule-specific probe exactly as listed in `tasks.md`.
2. Record the baseline count in the rule ledger.
3. Fix findings in source files, or record path-specific exceptions.
4. Add the rule to `biome.jsonc` only after the cleanup is complete.
5. Run the rule-specific probe again.
6. Run `bun test`, `bun run lint`, and `bun run build`.
7. Update the task ledger with final count and verification.
8. Commit the phase.

If a rule has no current findings, the phase still records the zero-count probe
before enabling the rule.

## Configuration strategy

Add rules under their existing Biome groups. Prefer explicit rule entries over
new domain-wide settings so reviewers can see the exact policy being adopted.

Use `error` for rules that the project expects to block CI immediately. Use
`warn` only when the phase intentionally starts as a warning migration and the
task ledger names the follow-up phase that will make it an error.

Do not add broad overrides. Acceptable overrides must be narrow and explained:

- `noConsole` may be disabled only for the console logger adapter if that file
  is the production implementation of the logging port.
- `noProcessEnv` may be disabled only for documented configuration or logging
  boundary files.
- Test helper overrides must point to helper directories or specific files, not
  all specs.

## Candidate sequence

The sequence starts with low-risk test rules, then moves to rules that require
source cleanup:

1. `nursery/useConsistentTestIt`.
2. `suspicious/noSkippedTests`.
3. `nursery/noIdenticalTestTitle`.
4. `nursery/useTestHooksInOrder`.
5. `nursery/useTestHooksOnTop`.
6. `complexity/noExcessiveNestedTestSuites`.
7. `nursery/noConditionalExpect`.
8. `suspicious/noConsole`.
9. `style/noProcessEnv`.
10. `a11y/noNoninteractiveElementInteractions`.
11. `suspicious/noImportCycles`.
12. Optional Playwright nursery rules for `e2e`.

React domain and TypeScript explicit-type rules are intentionally outside the
first adoption sequence because the baseline is too noisy for a safe
one-rule-at-a-time migration.

## Subagent workflow

The implementation must use `subagent-driven-development`. The controller
assigns one rule phase to one implementer subagent. After that subagent
finishes, run two reviews:

1. Spec-compliance review: confirms the rule phase followed this spec,
   `tasks.md`, and the referenced requirements.
2. Code-quality review: checks behavior preservation, rule configuration, and
   test quality.

Only mark a phase complete after both reviews pass and the phase commit exists.

## Verification strategy

Every phase must run:

```sh
bun test
bun run lint
bun run build
```

In addition, each phase runs its rule-specific Biome probe before and after
the fix. The final closure phase runs all adopted rule probes plus the full
quality gate.

If `bun run build` is not runnable on the current host, the implementer must
record the exact blocker and run the closest supported build-smoke command
already used by the repository.
