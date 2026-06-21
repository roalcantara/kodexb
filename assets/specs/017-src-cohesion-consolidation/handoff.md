# Handoff — `017-src-cohesion-consolidation`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
| COH-1 AC1 | RPC logging plugins merged to `src/shared/logging/rpc.plugin.ts` | `bun test src/shared/logging && test ! -f src/shared/logging/rpc.middleware.ts` |
| COH-1 AC2 | `renderer_build_env.ts` folded into `renderer.config.ts` | `test ! -f src/shared/logging/renderer_build_env.ts && bun test src/shared/logging` |
| COH-1 AC3 | `index.ts` re-exports logtape from `./logger` | `rg -c "from '@logtape/logtape'" src/shared/logging/index.ts` |
| COH-1 AC4 | Barrel export names remain identical | `bun run typecheck` |
| COH-1 AC5 | Logging behaviour and RPC error envelopes are unchanged | `bun test src/shared/logging` |
| COH-2 AC1 | `cohesion-inventory.md` created with A/B/keep classifications | `test -f assets/specs/017-src-cohesion-consolidation/cohesion-inventory.md` |
| COH-2 AC2 | `doc.*.parser.ts` unified under `doc.parser.ts` and `buildPreamble` | `test ! -f src/core/domain/models/knowledges/detail/doc.task.parser.ts && bun test src/core/domain/models/knowledges/detail` |
| COH-2 AC3 | Tag-ranking helpers encapsulated as private inside `rank_suggested_tags.util.ts` | `test ! -f src/core/domain/models/knowledges/tags/cooccurrence.util.ts && bun test src/core/domain/models/knowledges/tags` |
| COH-2 AC4 | View predicates encapsulated as private inside `filter_by_view.util.ts` | `test ! -f src/core/domain/models/knowledges/task_views/is_actionable.util.ts && bun test src/core/domain/models/knowledges/task_views` |
| COH-2 AC5 | `list_opts` and `shared/constants` left unmerged | `git status --porcelain src/core/helpers/list_opts src/shared/constants` |
| COH-2 AC6 | No rules/dependency configs modified and net COH-2 file count drops by 8 | `git diff --name-only biome.jsonc .dependency-cruiser.cjs knip.jsonc` |
| COH-3 AC1 | `lslint-spike.md` created with expressibility findings | `test -f assets/specs/017-src-cohesion-consolidation/lslint-spike.md` |
| COH-3 AC2 | Suffix failure table recorded in spike doc | `grep -q "util" assets/specs/017-src-cohesion-consolidation/lslint-spike.md` |
| COH-3 AC3 | ls-lint rules conditionally strengthened and offenders renamed | `bun run lint:ls` |
| COH-3 AC4 | ls-lint changes deferred, rules untouched | `git diff .ls-lint.yml` |
