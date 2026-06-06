<!-- markdownlint-disable-file -->
# Normalise Biome rules — Requirements

## Introduction

The repository already runs Biome as part of the quality stack, but recent
testing normalisation work showed that some Better Specs and safety conventions
can be enforced directly by Biome. This spec defines an incremental migration
for adopting additional Biome rules one rule at a time.

The migration must be conservative. A rule is only adopted after its current
findings are understood, fixed or explicitly excepted, and the full project
verification passes. The implementation must not enable broad rule groups or
domains just because a few rules in that group are useful.

## Out of scope

- Replacing `tools/test_spec_style_audit.ts` or the Better Specs cleanup in
  `assets/docs/archive/normalise-specs/`.
- Adding ESLint, Jest ESLint plugins, or another lint runner.
- Enabling whole Biome domains such as `react = "all"` or `types = "all"`.
- Weakening existing Biome, knip, dependency-cruiser, ast-grep, ls-lint, jscpd,
  or TypeScript checks.
- Adding broad `biome-ignore` suppressions to make a rule pass.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement NB-1: Rule inventory

### Acceptance criteria

1. WHEN the work starts, THEN the implementer SHALL record the active Biome
   version, current `biome.jsonc` rule configuration, and candidate rule list.
2. WHEN a candidate rule is considered, THEN the implementer SHALL run a
   rule-specific `bunx biome lint ... --only=<group/rule> --reporter=summary`
   probe and record the finding count.
3. WHEN a candidate rule reports findings, THEN the implementer SHALL classify
   each finding as fix now, path-specific exception, false positive, or defer.
4. IF a rule is deferred, THEN the implementer SHALL record the reason and
   SHALL NOT add it to `biome.jsonc`.

## Requirement NB-2: One-rule adoption workflow

### Acceptance criteria

1. WHEN a rule is adopted, THEN the implementer SHALL fix or path-specifically
   except every current finding before enabling the rule.
2. WHEN a rule is enabled, THEN the implementer SHALL add only that rule's
   `biome.jsonc` change in the same phase as its cleanup.
3. WHEN a rule has options, THEN the implementer SHALL document the selected
   options and why they match project policy.
4. IF a rule requires many source changes, THEN the implementer SHALL split the
   cleanup by source layer before changing unrelated rules.
5. WHEN a rule phase completes, THEN the implementer SHALL update
   `tasks.md` with baseline count, final count, touched files, exceptions, and
   verification results.

## Requirement NB-3: Test-rule enforcement

### Acceptance criteria

1. WHEN test rules are adopted, THEN they SHALL preserve the project policy of
   using `bun:test`, `it()` behavior examples, nested `describe` groups, and
   Better Specs-style situation blocks.
2. WHEN `nursery/noConditionalExpect` is adopted, THEN conditional assertions
   SHALL be rewritten into explicit examples, table rows, or setup helpers.
3. WHEN `nursery/useConsistentTestIt` is adopted, THEN it SHALL require
   `it()` for examples and SHALL NOT permit `test()` as the default behavior
   API.
4. WHEN skipped-test rules are adopted, THEN committed focused or skipped
   examples SHALL fail lint unless a path-specific exception is recorded.
5. WHEN hook-order rules are adopted, THEN setup and teardown SHALL remain at
   the top of the suite or situation group they configure.

## Requirement NB-4: Cross-layer safety rules

### Acceptance criteria

1. WHEN `suspicious/noConsole` is adopted, THEN production code SHALL avoid
   direct console calls except inside the dedicated console logger adapter.
2. WHEN `style/noProcessEnv` is adopted, THEN direct environment access SHALL
   be restricted to documented configuration and logging entry points.
3. WHEN `suspicious/noImportCycles` is adopted, THEN every current import cycle
   SHALL be fixed or the rule SHALL remain deferred with dependency-cruiser
   coverage documented.
4. WHEN accessibility rules are adopted, THEN renderer components SHALL use
   semantic interactive elements or explicit keyboard and role behavior rather
   than suppressing the rule.

## Requirement NB-5: Verification and commits

### Acceptance criteria

1. WHEN a rule phase changes code or config, THEN the implementer SHALL run the
   rule-specific Biome probe after the fix.
2. WHEN a rule phase completes, THEN the implementer SHALL run `bun test`,
   `bun run lint`, and `bun run build` before committing.
3. WHEN verification fails, THEN the implementer SHALL fix the failure or
   revert that rule phase before starting another rule.
4. WHEN a rule phase commits, THEN the commit SHALL contain only that rule's
   cleanup, configuration, and task-ledger updates.
5. IF any command becomes unexpectedly slow, THEN the implementer SHALL stop
   and report the command, elapsed time, suspected cause, and smallest
   proposed split.
