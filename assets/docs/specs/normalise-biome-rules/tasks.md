<!-- markdownlint-disable-file -->
# Normalise Biome rules — Tasks

## Overview

Use this task list to adopt additional Biome rules one rule at a time. Each
phase must baseline the rule, fix or explicitly defer findings, update
`biome.jsonc`, verify the whole project, update this file, and create one
commit before moving to the next rule.

Before editing code or configuration, load:

- `.agents/skills/kb-context/SKILL.md`
- `.agents/skills/kb-testing/SKILL.md` for test-rule phases
- `.agents/skills/kb-quality-gate/SKILL.md`
- `biome-developer`
- `subagent-driven-development`
- `docs-writer` when editing Markdown

## Phase workflow

For every rule phase:

1. Read the rule phase and referenced requirements.
2. Run the baseline probe exactly as listed.
3. Record baseline count in the rule ledger.
4. Fix only that rule's findings or record path-specific exceptions.
5. Enable only that rule in `biome.jsonc`.
6. Run the rule-specific probe again.
7. Run `bun test`, `bun run lint`, and `bun run build`.
8. Update this file with final count, exceptions, and verification evidence.
9. Commit only that rule phase.
10. Start the next rule only after the commit succeeds.

If any phase becomes unexpectedly slow, stop and report the exact command,
elapsed time, suspected cause, and smallest proposed split.

## Rule ledger

| Phase | Rule | Baseline | Final | Config status | Exceptions | Verification |
| --- | --- | ---: | ---: | --- | --- | --- |
| 0 | Inventory | Pending refresh | n/a | n/a | n/a | Pending |
| 1 | `nursery/useConsistentTestIt` | Pending refresh | Pending | Pending | Pending | Pending |
| 2 | `suspicious/noSkippedTests` | Pending refresh | Pending | Pending | Pending | Pending |
| 3 | `nursery/noIdenticalTestTitle` | Pending refresh | Pending | Pending | Pending | Pending |
| 4 | `nursery/useTestHooksInOrder` | Pending refresh | Pending | Pending | Pending | Pending |
| 5 | `nursery/useTestHooksOnTop` | Pending refresh | Pending | Pending | Pending | Pending |
| 6 | `complexity/noExcessiveNestedTestSuites` | Pending refresh | Pending | Pending | Pending | Pending |
| 7 | `nursery/noConditionalExpect` | Pending refresh | Pending | Pending | Pending | Pending |
| 8 | `suspicious/noConsole` | Pending refresh | Pending | Pending | Pending | Pending |
| 9 | `style/noProcessEnv` | Pending refresh | Pending | Pending | Pending | Pending |
| 10 | `a11y/noNoninteractiveElementInteractions` | Pending refresh | Pending | Pending | Pending | Pending |
| 11 | `suspicious/noImportCycles` | Pending refresh | Pending | Pending | Pending | Pending |
| 12 | Playwright nursery rules | Pending refresh | Pending | Pending | Pending | Pending |
| 13 | Closure | n/a | n/a | Pending | Pending | Pending |

## Phase 0 — Refresh Biome baseline

**Goal:** Record the current rule surface before changing `biome.jsonc`.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(biome): Record rule adoption baseline

Changes:
- Add the Biome rule adoption spec
- Record rule probes and migration order
- Define one-rule verification and commit workflow

Why:
- Gives future lint hardening a measurable path
- Prevents broad rule activation without cleanup evidence
EOF
)"
```

- [ ] 0.1 Record current Biome setup.
  - Execute exactly:

    ```sh
    bunx biome --version
    bunx biome lint src --reporter=summary
    git diff -- biome.jsonc
    ```

  - Record the Biome version and any existing local `biome.jsonc` changes.
  - _Acceptance criteria: NB-1.1_

- [ ] 0.2 Refresh candidate probes.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useConsistentTestIt --reporter=summary
    bunx biome lint src --only=suspicious/noSkippedTests --reporter=summary
    bunx biome lint src --only=nursery/noIdenticalTestTitle --reporter=summary
    bunx biome lint src --only=nursery/useTestHooksInOrder --reporter=summary
    bunx biome lint src --only=nursery/useTestHooksOnTop --reporter=summary
    bunx biome lint src --only=complexity/noExcessiveNestedTestSuites --reporter=summary
    bunx biome lint src --only=nursery/noConditionalExpect --reporter=summary
    bunx biome lint src --only=suspicious/noConsole --reporter=summary
    bunx biome lint src --only=style/noProcessEnv --reporter=summary
    bunx biome lint src --only=a11y/noNoninteractiveElementInteractions --reporter=summary
    bunx biome lint src --only=suspicious/noImportCycles --reporter=summary
    bunx biome lint e2e --only=nursery/noPlaywrightElementHandle --only=nursery/noPlaywrightEval --only=nursery/noPlaywrightForceOption --only=nursery/noPlaywrightMissingAwait --only=nursery/noPlaywrightNetworkidle --only=nursery/noPlaywrightPagePause --only=nursery/noPlaywrightUselessAwait --only=nursery/noPlaywrightWaitForNavigation --only=nursery/noPlaywrightWaitForSelector --only=nursery/noPlaywrightWaitForTimeout --reporter=summary
    ```

  - Update the rule ledger with current counts.
  - _Acceptance criteria: NB-1.2, NB-1.3_

- [ ] 0.3 Record deferred broad domains.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=react --reporter=summary
    bunx biome lint src --only=nursery/useExplicitType --reporter=summary
    bunx biome lint src --only=correctness/noUnresolvedImports --only=correctness/noUndeclaredDependencies --reporter=summary
    ```

  - Record why `react`, `types`, `useExplicitType`, unresolved imports, and
    undeclared dependencies are deferred from this migration.
  - _Acceptance criteria: NB-1.4_

## Phase 1 — Enforce `it()` examples

**Rule:** `nursery/useConsistentTestIt`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Enforce it examples

Changes:
- Enable Biome's consistent test/it rule
- Configure tests to prefer it() examples
- Record the rule verification evidence

Why:
- Machine-checks the Better Specs convention
- Prevents test() from returning after cleanup
EOF
)"
```

- [ ] 1.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useConsistentTestIt --reporter=summary
    ```

  - If findings appear, convert behavior examples to `it()` before editing
    `biome.jsonc`.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.3_

- [ ] 1.2 Enable the rule.
  - Add `nursery.useConsistentTestIt` to `biome.jsonc`.
  - Configure it to prefer `it` for examples and `it` inside `describe` blocks.
  - _Acceptance criteria: NB-2.2, NB-2.3, NB-3.3_

- [ ] 1.3 Verify and commit.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useConsistentTestIt --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 2 — Prevent skipped tests

**Rule:** `suspicious/noSkippedTests`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Prevent skipped specs

Changes:
- Enable Biome's skipped-test guard
- Verify no committed skipped examples remain
- Record the rule verification evidence

Why:
- Keeps focused or skipped specs out of the main branch
- Makes test coverage failures visible immediately
EOF
)"
```

- [ ] 2.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noSkippedTests --reporter=summary
    ```

  - Remove `.skip`, `xit`, or equivalent skipped examples unless a
    path-specific exception is recorded. Focused examples such as `.only` are
    covered by Biome's already-recommended `suspicious/noFocusedTests` rule and
    are not the policy change for this phase.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.4_

- [ ] 2.2 Enable and verify.
  - Add `suspicious.noSkippedTests` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noSkippedTests --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 3 — Prevent duplicate test titles

**Rule:** `nursery/noIdenticalTestTitle`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Prevent duplicate spec titles

Changes:
- Enable Biome's duplicate test-title guard
- Rename any ambiguous duplicate examples
- Record the rule verification evidence

Why:
- Keeps failing spec output self-describing
- Supports the Better Specs documentation style
EOF
)"
```

- [ ] 3.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/noIdenticalTestTitle --reporter=summary
    ```

  - Rename duplicate examples by moving shared context into `describe` blocks
    or making the behavior text more specific.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.1_

- [ ] 3.2 Enable and verify.
  - Add `nursery.noIdenticalTestTitle` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/noIdenticalTestTitle --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 4 — Keep test hooks ordered

**Rule:** `nursery/useTestHooksInOrder`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Enforce hook ordering

Changes:
- Enable Biome's test hook ordering rule
- Move setup and teardown hooks into canonical order
- Record the rule verification evidence

Why:
- Keeps spec setup predictable
- Reduces hidden state in nested suites
EOF
)"
```

- [ ] 4.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useTestHooksInOrder --reporter=summary
    ```

  - Reorder hooks without changing setup semantics.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.5_

- [ ] 4.2 Enable and verify.
  - Add `nursery.useTestHooksInOrder` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useTestHooksInOrder --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 5 — Keep test hooks at the top

**Rule:** `nursery/useTestHooksOnTop`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Keep hooks above examples

Changes:
- Enable Biome's test hook placement rule
- Move setup hooks above examples in affected suites
- Record the rule verification evidence

Why:
- Makes spec setup visible before assertions
- Matches the repository's Better Specs structure
EOF
)"
```

- [ ] 5.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useTestHooksOnTop --reporter=summary
    ```

  - Move hooks to the top of their suite or situation group.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.5_

- [ ] 5.2 Enable and verify.
  - Add `nursery.useTestHooksOnTop` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/useTestHooksOnTop --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 6 — Limit nested test suites

**Rule:** `complexity/noExcessiveNestedTestSuites`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Limit nested spec suites

Changes:
- Enable Biome's nested test-suite guard
- Flatten overly nested describe structures if present
- Record the rule verification evidence

Why:
- Keeps Better Specs hierarchy readable
- Prevents deeply nested setup from obscuring behavior
EOF
)"
```

- [ ] 6.1 Probe and clean the rule.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=complexity/noExcessiveNestedTestSuites --reporter=summary
    ```

  - Flatten excessive nesting by extracting shared setup or splitting specs.
  - _Acceptance criteria: NB-1.2, NB-2.1, NB-3.1_

- [ ] 6.2 Enable and verify.
  - Add `complexity.noExcessiveNestedTestSuites` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=complexity/noExcessiveNestedTestSuites --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 7 — Remove conditional expectations

**Rule:** `nursery/noConditionalExpect`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Remove conditional expects

Changes:
- Rewrite conditional assertions into explicit examples
- Enable Biome's conditional expect guard
- Record the rule verification evidence

Why:
- Prevents specs that pass without running assertions
- Makes each behavior path visible in test output
EOF
)"
```

- [ ] 7.1 Probe and classify findings.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/noConditionalExpect --reporter=summary
    ```

  - Classify each finding by file and rewrite shape: split examples, table
    rows, helper extraction, or path-specific exception.
  - _Acceptance criteria: NB-1.2, NB-1.3, NB-3.2_

- [ ] 7.2 Rewrite findings.
  - Replace conditional `expect` calls with explicit examples.
  - Do not silence the rule with broad suppressions.
  - Run focused `bun test <path>` for each touched file.
  - _Acceptance criteria: NB-2.1, NB-3.2_

- [ ] 7.3 Enable and verify.
  - Add `nursery.noConditionalExpect` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=nursery/noConditionalExpect --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 8 — Restrict direct console usage

**Rule:** `suspicious/noConsole`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(biome): Restrict console usage

Changes:
- Enable Biome's console usage guard
- Keep direct console access isolated to the logger adapter
- Record the rule verification evidence

Why:
- Preserves the shared logging boundary
- Prevents ad hoc console output in production code
EOF
)"
```

- [ ] 8.1 Probe and classify findings.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noConsole --reporter=summary
    ```

  - If findings are limited to `src/shared/logging/console.logger.ts`, record
    that file as the logger-adapter exception.
  - _Acceptance criteria: NB-1.2, NB-1.3, NB-4.1_

- [ ] 8.2 Enable with the narrowest exception.
  - Add `suspicious.noConsole` to `biome.jsonc`.
  - Add a file override only for the logger adapter if direct console calls are
    the adapter's production responsibility.
  - _Acceptance criteria: NB-2.2, NB-4.1_

- [ ] 8.3 Verify and commit.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noConsole --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 9 — Restrict direct environment access

**Rule:** `style/noProcessEnv`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(biome): Restrict process env access

Changes:
- Enable Biome's process.env guard
- Keep environment reads at documented boundaries
- Record the rule verification evidence

Why:
- Keeps configuration access centralized
- Prevents hidden runtime dependencies across layers
EOF
)"
```

- [ ] 9.1 Probe and classify findings.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=style/noProcessEnv --reporter=summary
    ```

  - Classify each direct environment read as config boundary, logging boundary,
    code smell, or defer.
  - _Acceptance criteria: NB-1.2, NB-1.3, NB-4.2_

- [ ] 9.2 Enable with narrow exceptions or wrappers.
  - Prefer moving direct environment access into existing config helpers.
  - Inspect the existing renderer override for `style.noProcessEnv`. Keep it
    only if renderer files intentionally need direct environment access;
    otherwise narrow or remove it while enabling the rule.
  - If an exception remains, add the narrowest file override and record why.
  - _Acceptance criteria: NB-2.1, NB-2.2, NB-4.2_

- [ ] 9.3 Verify and commit.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=style/noProcessEnv --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 10 — Fix noninteractive element interactions

**Rule:** `a11y/noNoninteractiveElementInteractions`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
fix(a11y): Use interactive renderer elements

Changes:
- Fix noninteractive element interaction findings
- Enable Biome's interaction accessibility guard
- Record the rule verification evidence

Why:
- Improves keyboard and assistive technology behavior
- Prevents clickable noninteractive elements from returning
EOF
)"
```

- [ ] 10.1 Probe and classify findings.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=a11y/noNoninteractiveElementInteractions --reporter=summary
    ```

  - Classify each finding by preferred fix: use `button`, use `a`, add role and
    keyboard behavior, or path-specific exception.
  - _Acceptance criteria: NB-1.2, NB-1.3, NB-4.4_

- [ ] 10.2 Fix renderer semantics.
  - Prefer semantic interactive elements over ARIA patches.
  - Run focused renderer tests for every touched component.
  - _Acceptance criteria: NB-2.1, NB-4.4_

- [ ] 10.3 Enable and verify.
  - Add `a11y.noNoninteractiveElementInteractions` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=a11y/noNoninteractiveElementInteractions --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 11 — Evaluate import cycles

**Rule:** `suspicious/noImportCycles`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(biome): Evaluate import cycle guard

Changes:
- Resolve or document current Biome import-cycle findings
- Enable the rule only if findings are fully closed
- Record dependency-cruiser overlap and verification evidence

Why:
- Keeps module boundaries acyclic when Biome can enforce them
- Avoids duplicating dependency-cruiser without evidence
EOF
)"
```

- [ ] 11.1 Probe and compare with dependency-cruiser.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noImportCycles --reporter=summary
    bun run lint:depcruise
    ```

  - Record whether dependency-cruiser already catches the same cycles.
  - _Acceptance criteria: NB-1.2, NB-1.3, NB-4.3_

- [ ] 11.2 Fix or defer.
  - If cycles are small and local, fix them without changing behavior.
  - If cycles require broader architectural changes, defer the rule and record
    a follow-up instead of enabling it.
  - _Acceptance criteria: NB-1.4, NB-2.1, NB-4.3_

- [ ] 11.3 Verify and commit.
  - If the rule is enabled, add `suspicious.noImportCycles` to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint src --only=suspicious/noImportCycles --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 12 — Optional Playwright guard

**Rules:** selected Playwright nursery rules for `e2e`

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(biome): Guard Playwright specs

Changes:
- Enable selected Biome Playwright guards for e2e specs
- Verify current preview tests satisfy the rules
- Record the rule verification evidence

Why:
- Prevents flaky Playwright patterns
- Keeps preview e2e tests aligned with Biome guidance
EOF
)"
```

- [ ] 12.1 Probe Playwright rules.
  - Execute exactly:

    ```sh
    bunx biome lint e2e --only=nursery/noPlaywrightElementHandle --only=nursery/noPlaywrightEval --only=nursery/noPlaywrightForceOption --only=nursery/noPlaywrightMissingAwait --only=nursery/noPlaywrightNetworkidle --only=nursery/noPlaywrightPagePause --only=nursery/noPlaywrightUselessAwait --only=nursery/noPlaywrightWaitForNavigation --only=nursery/noPlaywrightWaitForSelector --only=nursery/noPlaywrightWaitForTimeout --reporter=summary
    ```

  - Adopt only rules that are zero-findings or can be fixed in this phase.
  - _Acceptance criteria: NB-1.2, NB-1.3_

- [ ] 12.2 Enable and verify selected rules.
  - Add selected Playwright rules to `biome.jsonc`.
  - Execute exactly:

    ```sh
    bunx biome lint e2e --only=nursery/noPlaywrightElementHandle --only=nursery/noPlaywrightEval --only=nursery/noPlaywrightForceOption --only=nursery/noPlaywrightMissingAwait --only=nursery/noPlaywrightNetworkidle --only=nursery/noPlaywrightPagePause --only=nursery/noPlaywrightUselessAwait --only=nursery/noPlaywrightWaitForNavigation --only=nursery/noPlaywrightWaitForSelector --only=nursery/noPlaywrightWaitForTimeout --reporter=summary
    bun test
    bun run lint
    bun run build
    git diff --check
    ```

  - Update the ledger and commit this phase only.
  - _Acceptance criteria: NB-2.2, NB-2.5, NB-5.1, NB-5.2, NB-5.4_

## Phase 13 — Final closure

**Goal:** Confirm every adopted rule is active, useful, and covered by the
project quality gate.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(biome): Close rule adoption spec

Changes:
- Record final Biome rule adoption status
- Capture deferred rules and follow-up rationale
- Verify lint, test, and build closure

Why:
- Keeps the lint hardening work auditable
- Documents why noisy rules were not adopted yet
EOF
)"
```

- [ ] 13.1 Run final adopted-rule probes.
  - Execute every probe for each enabled rule in the ledger.
  - Record final counts as zero or path-specific exception counts.
  - _Acceptance criteria: NB-2.5, NB-5.1_

- [ ] 13.2 Run final project verification.
  - Execute exactly:

    ```sh
    bun test
    bun run lint
    bun run build
    git diff --check
    bash .agents/skills/kb-quality-gate/scripts/gate.sh
    ```

  - Record results in the ledger.
  - _Acceptance criteria: NB-5.2, NB-5.3_

- [ ] 13.3 Record deferred rules.
  - Keep the deferred list in `design.md` and the ledger current.
  - Include the reason and the smallest future spec or phase that could adopt
    each deferred rule.
  - _Acceptance criteria: NB-1.4_
