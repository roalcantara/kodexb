# src kernel & DRY — Tasks

Dependency-ordered task index. Full steps, code, and acceptance gates live in
[`plan.md`](./plan.md); requirements in [`spec.md`](./spec.md). Check a box only
when that task's **Acceptance gate** in `plan.md` passes.

## Phase A — SRC-1 schema kernel
- [X] **T1** `literalUnion` builder + `@shared/typebox` alias — *gate:* SRC-1 AC1(partial), AC3
- [X] **T2** `strictObject` builder + barrel — *gate:* SRC-1 AC2(partial)

## Phase B — SRC-1 adoption
- [X] **T3** Adopt builders in `schemas.ts` (0 `Type.Literal`, 0 `additionalProperties`) — *gate:* SRC-1 AC1, AC2
- [ ] **T4** Adopt `literalUnion` in 5 core schema files (global `Type.Literal` ≤ 12) — *gate:* SRC-1 AC4

## Phase C — SRC-2 single-source payload types
- [ ] **T5** Relocate `ENTRY_TYPE_VALUES` to `@shared/constants`, re-export from core — *gate:* SRC-2 AC1
- [ ] **T6** Move request-payload schemas to `@shared/rpc/payload_schemas`, re-export from `schemas.ts` — *gate:* SRC-2 AC2
- [ ] **T7** Derive 6 payload types via `Static<>`; update CONTRACT NOTE + drift test — *gate:* SRC-2 AC3, AC4, AC5

## Phase D — SRC-3 client call kernel
- [ ] **T8** Add `call<T>` in `client.ts`; convert 32 wrappers (0 `.then(unwrap) as Promise`) — *gate:* SRC-3 AC1, AC2, AC3

## Phase E — SRC-4 app.ts internal DRY
- [ ] **T9** Private `App.raw()`; replace 10 destructures; record new app.ts LOC — *gate:* SRC-4 AC1, AC2, AC3

## Phase F — SRC-5 thin-file consolidation
- [ ] **T10** Thin-file inventory (bucket every ≤15-LOC non-spec file) — *gate:* SRC-5 AC1
- [ ] **T11** Execute mergeable merges (file count −≥4, no rule edits) — *gate:* SRC-5 AC2, AC3

## Phase G — SRC-6 Biome hardening
- [ ] **T12** Renderer `noProcessEnv` → error; lower `app.ts` cap (only `biome.jsonc` edit) — *gate:* SRC-6 AC1, AC2, AC3

## Phase H — Closeout
- [ ] **T13** Closeout metrics, register `src_kernel_dry` catalog key, full `mise run spec ready` gate — *gate:* DoD 1–6

**Hard invariants (every task):** behaviour frozen (baseline spec green → green);
no edits to `.ls-lint.yml`, `.dependency-cruiser.cjs`, `knip.jsonc`, or ast-grep
rules; `biome.jsonc` only in T12; commit after each green task.
