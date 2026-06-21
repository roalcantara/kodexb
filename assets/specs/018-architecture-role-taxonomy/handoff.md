# Handoff — `018-architecture-role-taxonomy`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
| ROLE-1 AC1 | `role_conformance.script.ts` scans `src/` and emits classification report to `tmp/metrics/role-conformance/` | `bun test packages/ops/src/metrics/harnesses/role-conformance` |
| ROLE-1 AC2 | Success metrics `{ mislabeledUtilCount, utilPurityRatio, enforcedDirRatio, suffixViolations }` emitted, and committed baseline `baseline.json` exists | `test -f tools/metrics/baselines/role-conformance/baseline.json` |
| ROLE-1 AC3 | `mise` task runs baseline and compare subcommands; compare detects regression vs baseline without failing CI | `mise run audit roles compare` |
| ROLE-1 AC4 | Per-file classification is the single input for vocabulary, roadmap, and ls-lint locks | `test -f assets/specs/018-architecture-role-taxonomy/migration-roadmap.md` |
| ROLE-2 AC1 | Vocabulary updated/enhanced (adds `.resolver.ts` definition and example) | `git diff assets/guides/CODESTYLE_GUIDE.md` |
| ROLE-2 AC2 | Naming guide updated to state single-word doctrine and subfolders | `git diff assets/guides/CODESTYLE_GUIDE.md` |
| ROLE-2 AC3 | Naming guide specifies `.util.ts` is reserved for pure stateless side-effect-free helpers | `git diff assets/guides/CODESTYLE_GUIDE.md` |
| ROLE-2 AC4 | Vocabulary and doctrine recorded under `assets/guides/adr/0001-role-suffix-taxonomy.md` | `test -f assets/guides/adr/0001-role-suffix-taxonomy.md` |
| ROLE-3 AC1 | Migration roadmap PR slices defined, with pilot as PR-0 and locks as foundation | `test -f assets/specs/018-architecture-role-taxonomy/migration-roadmap.md` |
| ROLE-3 AC2 | `TODO.md` backlog reordered, re-sequenced, and annotated | `git diff TODO.md` |
| ROLE-3 AC3 | Cross-cutting dependencies recorded in the roadmap | `grep -q "dependency" assets/specs/018-architecture-role-taxonomy/migration-roadmap.md` |
| ROLE-4 AC1 | `.ls-lint.yml` basename regex rules added for conformant dirs | `git diff .ls-lint.yml && bun run lint:ls` |
| ROLE-4 AC2 | `.ls-lint.yml` rules NOT added for has-violations dirs | `git diff .ls-lint.yml` |
| ROLE-4 AC3 | Biome/dependency-cruiser/knip configurations remain unchanged | `git diff biome.jsonc .dependency-cruiser.cjs knip.jsonc` |
| ROLE-5 AC1 | `src/shell/main/handoff` matches single-word layout, no `.util.ts` files, all tests pass | `find src/shell/main/handoff -name '*.util.ts' ! -name '*.spec.ts'` |
| ROLE-5 AC2 | `.ls-lint.yml` rule locks handoff pilot directories | `git diff .ls-lint.yml && bun run lint:ls` |
| ROLE-5 AC3 | Handoff behavior unchanged, metric compare shows mislabeledUtilCount reduced by 7 | `mise run audit roles compare` |
| ROLE-6 AC1 | Naming guide matches finalized suffixes, doctrine, and util purity | `git diff assets/guides/CODESTYLE_GUIDE.md` |
| ROLE-6 AC2 | `TOOLS_GUIDE` documents the `role-conformance` series | `git diff assets/guides/TOOLS_GUIDE.md` |
| ROLE-6 AC3 | `CLAUDE.md` and `AGENTS.md` naming advice references `CODESTYLE_GUIDE` | `git diff CLAUDE.md AGENTS.md` |
