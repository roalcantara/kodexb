# Handoff — `020-architecture-consolidation`

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md) · **Tasks:** [tasks.md](./tasks.md)

This is the **single handoff + follow-ups log** for 020. Hand it to the
implementer **at the start**: they fill the **Status** + **Evidence** columns as
each acceptance criterion is satisfied. Reviewers append to **Follow-ups** during
and after review. Every change is **behaviour-frozen**; `mise run audit roles
compare` must never regress; no new `// biome-ignore`; biome caps only tighten.

## Acceptance criteria → evidence (implementer fills Status/Evidence)

| ID | Done when (short) | Evidence command | Status |
| --- | --- | --- | --- |
| ARCH-0 AC1 | core computes `structuralSuppressionCount`/`maxFileLoc`/`oversizedFileCount` | `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts` | ✅ |
| ARCH-0 AC2 | `compare` flags a rise in any of the three | `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts` ; `mise run audit roles compare` (PASS) | ✅ |
| ARCH-0 AC3 | baseline committed at 13/322/6 + TOOLS_GUIDE row | `cat tools/metrics/baselines/role-conformance/baseline.json` ; `rg role-conformance assets/guides/TOOLS_GUIDE.md` | ✅ (13/323/6 live; see Follow-up #1) |
| ARCH-1 AC1 | `TaskView` core-owned | `rg "@shared/rpc" src/core \| rg TaskView` → 0 ; `bun test src/core` | ✅ |
| ARCH-1 AC2 | one `BindingRef` def | `rg 'type BindingRef\|interface BindingRef' src` → 1 ; `bun test src/shell/app/db` | ✅ |
| ARCH-1 AC3 | task policy in core | `bun test src/shell/app/db/task.repository.spec.ts` | ✅ |
| ARCH-1 AC4 | overdue/blocked in core | `rg taskIsOverdue src/shell/renderer` (core import) ; `bun test src/shell/renderer` | ☐ |
| ARCH-1 AC5 | literalUnion derivation | `bun test src/shared/rpc` ; `bun run typecheck` | ☐ |
| ARCH-1 AC6 | response types schema-derived; 0 shared→core | `bun run lint:depcruise` ; `bun test src/shared/rpc` | ✅ (BindingRef schema-derived; depcruise 0 violations) |
| ARCH-1 AC7 | `ListStats.byType` (producer+consumers) | `rg 'stats\.(bookmark\|command\|cheat\|task\|shortcut)\b' src/shell/renderer` → 0 ; `bun test src/shell/app src/shell/renderer` | ☐ |
| ARCH-2 AC1 | `App` ≤160 facade + cap tightened | `wc -l src/shell/app/app.ts` ; `bun test src/shell/app src/shell/main/rpc` | ☐ |
| ARCH-2 AC2 | `app/lib` domain subfolders, no `app_` | `find src/shell/app/lib -maxdepth 1 -name 'app_*'` → 0 ; `bun run lint:ls` | ☐ |
| ARCH-2 AC3 | Promise.resolve boilerplate collapsed | `rg -c 'return Promise\.resolve' src/shell/app/app.ts` ; route specs green | ☐ |
| ARCH-3 AC1 | `client.ts` transport vs facade split | `wc -l src/shell/renderer/rpc/client.ts` ; `bun test src/shell/renderer/rpc` | ☐ |
| ARCH-4 AC1 | named contracts replace `p`; `ListMain` split | `bun test src/shell/renderer/components/list src/shell/renderer/hooks/list` | ☐ |
| ARCH-4 AC2 | list suppressions removed (no new ignores) | `rg 'biome-ignore' src/shell/renderer/components/list src/shell/renderer/hooks/list` ; `bun run lint:biome` | ☐ |
| ARCH-4 AC3 | list page consumes `stats.byType` | `rg 'stats\.(bookmark\|command\|cheat\|task\|shortcut)\b' src/shell/renderer/{components,hooks,utils}/list` → 0 | ☐ |
| ARCH-5 AC1 | one overlay coordinator | renderer specs green ; coordinator owns overlay state | ☐ |
| ARCH-5 AC2 | shared overlay primitive; jscpd ↓ | `bun run lint` (jscpd stage) ; renderer specs green | ☐ |
| ARCH-5 AC3 | no type imports from `.component.tsx` | `rg "from '\\./.*\\.component'" src/shell/renderer --glob '!*.spec.*'` ; `bun run typecheck` | ☐ |
| ARCH-6 AC1 | redundant folder-prefixes dropped | `find …/components/list -name 'list_*'` & `find …/actions -name 'entry_action_*'` → 0 ; `bun run lint:ls` | ☐ |
| ARCH-6 AC2 | `components/shared` primitives vs sync split | `bun test src/shell/renderer` ; STYLING/CODESTYLE note added | ☐ |
| ARCH-6 AC3 | `actions` role suffixes + single keymap | `bun run lint:ls` ; `mise run audit roles compare` (mislabeled 0) | ☐ |
| ARCH-6 AC4 | `shell_hooks.util.ts` decomposed by domain | `rg shell_hooks src` → 0 ; `bun run lint:ls` ; `bun test src/shell/main src/shell/app` | ☐ |
| DoD 1–7 | all ACs + ratcheted baseline + duplicate P3-7 fixed + catalog key | `mise run spec ready assets/specs/020-architecture-consolidation --key architecture_consolidation` | ☐ |

## Closeout metrics (fill at DoD)

| Metric | Baseline | Final |
| --- | --- | --- |
| `structuralSuppressionCount` | 13 | _ |
| `maxFileLoc` | 323 | _ |
| `oversizedFileCount` (>250, non-test) | 6 | _ |
| jscpd % (`src/shell/renderer`) | _ | _ |
| duplicate `BindingRef` / `TaskView` | 2 / 3 | _ / _ |
| new `any`/`as`/`@ts-expect-error` (touched) | — | _ |
| `mislabeledUtilCount` | 0 | 0 |

> Baseline captured live by Phase 0 (T102) at git_sha `b536c34d`. Spec/plan
> wrote 13/322/6 from an earlier snapshot; live measurement is 13/323/6 (+1 LOC
> in `maxFileLoc` due to a post-snapshot edit). Behaviour-frozen rule:
> baseline follows the live measurement, not the spec prose.

## Follow-ups (append during/after review)

> One row per issue found during implementation or review. Status: `open` →
> `fixed` (commit) / `deferred` (new TODO item) / `wontfix` (rationale).

| # | Phase/AC | Finding | Severity | Status | Resolution |
| --- | --- | --- | --- | --- | --- |
| 1 | ARCH-0 AC3 | Live `maxFileLoc` measures 323 vs spec's 322 (post-snapshot edit) | low | fixed | Baseline ratcheted to live 13/323/6; spec prose left as-is (closeout metrics table authoritative) |
