# Handoff — `019-role-suffix-migration`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
| MIGR-1 AC1 | `isPureUtil` SHALL NOT treat that line as I/O (strip/ignore `import type` lines before matching) | `New cases in role_conformance_core.script.spec.ts` |
| MIGR-1 AC2 | it SHALL NOT be flagged; runtime I/O modules (`node:fs`, `node:fs/promises`, `node:child_process`, `node:os`, `node:net`, `node:http(s)`), value imports of `bun:sqlite`/`electrobun`, `Bun.$`/`Bun.spawn`, and `fetch(` SHALL still flag | `Co-located spec cases for each; green.` |
| MIGR-1 AC3 | the baseline SHALL be regenerated and the resulting `mislabeledUtilCount` SHALL drop to reflect removal of the false positives | `tools/metrics/baselines/role-conformance/baseline.json` |
| MIGR-2 AC1 | exactly the 8 `rename` rows SHALL be renamed and the 6 `keep` rows SHALL remain `.util` | `Diff + the regenerated harness report flags 0 files after MIGR-1.` |
| MIGR-2 AC2 | it SHALL match a `CODESTYLE_GUIDE` role definition (reviewer-verifiable) and SHALL NOT introduce a new suffix | `Reviewer cross-check vs CODESTYLE_GUIDE § File Naming.` |
| MIGR-3 AC1 | its co-located spec SHALL be renamed to match (e.g. `app_sync.util.spec.ts` → `app_sync.service.spec.ts`) and all importers updated | `bun test` |
| MIGR-3 AC2 | no function body, export name, or signature SHALL change (rename/move only) | `Pre-existing specs pass unchanged (besides import/filename edits).` |
| MIGR-4 AC1 | each SHALL have an `.ls-lint.yml` rule allowing exactly the suffixes its files now carry | `.ls-lint.yml` |
| MIGR-4 AC2 | Biome/dependency-cruiser/knip configs SHALL be unchanged | `Diff.` |
| MIGR-5 AC1 | `mislabeledUtilCount` SHALL be **0** | `baseline.json` |
| MIGR-5 AC2 | it SHALL be regenerated at the final state (real `git_sha`) so future `compare` guards 0 and the current `enforcedDirRatio` | `Committed baseline.json + closeout-metrics.txt recording before/after.` |
| MIGR-5 AC3 | it SHALL still be `.util` | `find src -name "*.util.ts" ! -name "*.spec.*"` |
| MIGR-6 AC1 | any mismatch SHALL be fixed in the guides (guides win over stale agent entrypoints) | `Guide diffs; mise run app gates green.` |
| MIGR-6 AC2 | `TODO.md` P1 SHALL be updated to mark the rename slices and the guide cross-check `[x]` | `TODO.md` |
