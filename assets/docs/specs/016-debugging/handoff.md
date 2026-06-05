<!-- markdownlint-disable-file -->
# Debug logging mode — Handoff prompt

Use this prompt to hand the implementation to another agent. The full SDD
artifacts live alongside this file: [`requirements.md`](requirements.md),
[`design.md`](design.md), and [`tasks.md`](tasks.md). The receiving agent
executes `tasks.md` phase by phase; the EARS acceptance criteria in
`requirements.md` are the invariant outputs that prevent drift.

```md
You are taking over `assets/docs/specs/debugging/`.

## Goal

Add a Rails-style debug logging mode to the kb Electrobun desktop app: a
single environment-variable dial (`LOG_LEVEL`) that, when set, emits
verbose logs covering every RPC request (start / params / response /
status / duration) and every SQL query (full SQL / bind values at trace /
row count / duration), with all related lines correlated by a per-request
short `requestId`. Default verbosity stays terse; nothing changes in
production unless the dial is turned.

Logging code stays inside `src/shared/logging/`. The renderer configures
independently from main and is unaffected by `LOG_LEVEL` in this spec.

## Required reading (in this order, with the Read tool)

Workspace rules (already always-applied; re-read for grounding):
- `CLAUDE.md`
- `AGENTS.md`

SDD artifacts for this spec:
- `assets/docs/specs/debugging/requirements.md` — EARS acceptance criteria
  (DBG-1 … DBG-8). These are the invariant outputs.
- `assets/docs/specs/debugging/design.md` — normative technical contract.
  Concrete values everywhere; no placeholders.
- `assets/docs/specs/debugging/tasks.md` — phase-by-phase checklist with
  individual acceptance criteria per task and `_Requirements:_` traceability.

Project skills (under `.agents/skills/`):
- `app-context/SKILL.md` — FCIS layout, RPC bridge, naming
- `app-rpc/SKILL.md` — Elysia routes + Eden Treaty mirroring
- `app-testing/SKILL.md` — `bun:test`, Fishery factories, no-mock rule
- `app-quality-gate/SKILL.md` — the only valid "done" oracle

Global skills (under `~/.claude/skills/` or `~/.agents/skills/`):
- `spec-driven-development` — consult when sanity-checking the artifacts
- `systematic-debugging` — load if a phase surfaces unexpected behavior
- `receiving-code-review` — load when applying review feedback
- `mise-tasks` — load only if `mise.toml` is touched

In-repo guides:
- `assets/guides/CODESTYLE_GUIDE.md` — file naming + FCIS suffix vocabulary
- `assets/guides/TESTING_GUIDE.md` — Better Specs + Fishery patterns
- `assets/guides/FISHERY_GUIDE.md` — `factoryFor` usage
- `assets/guides/GIT_COMMITS_GUIDE.md` — Conventional Commits
- `assets/guides/DoD.md` — Definition of Done
- `assets/docs/specs/foundation/design.md` — architectural decisions
- `assets/docs/specs/foundation/requirements.md` — EARS template (V1-1…V1-8)

Existing code to study before writing anything:
- `src/shared/logging/` — current 4-file logging layer
  (`console.logger.ts`, `log_verbosity.ts`, `logtape.adapter.ts`,
  `index.ts`)
- `src/shell/main/rpc/server.ts` — current RPC server; contains the
  `rpcErrorContract` definition that gets lifted in Task 1.6
- `src/shell/main/rpc/host.ts` — Electrobun ↔ Elysia bridge (no edits in
  this spec; read to understand the request-context entry point)
- `tools/preview/server.script.ts` — preview server (must mirror main RPC)
- `src/shell/app/db/entry.repository.ts` — example repository for the
  DB instrumentation migration (Phase 3)
- `src/shell/main/main.ts` — current `createLogger` call site
- `electrobun.config.ts` — `useCef` opt-in (CEF enables Chrome DevTools)
- `package.json` — dependencies; `@logtape/logtape`,
  `@logtape/pretty`, `@logtape/elysia` are installed; **do not add new
  logging deps in this spec**

## Hard project conventions (failing any of these is a stop-and-report)

- **Validation**: TypeBox only (`t.*` in Elysia routes; `Type.Object` +
  `Value.Check` elsewhere). **`zod` is not a dependency. Never import it.**
- **Database**: `bun:sqlite` directly with typed prepared statements
  (`db.query<RowType, [Params]>(sql)`). **No Drizzle, no
  drizzle-typebox, no drizzle-kit, no drizzle-seed.**
- **Test factories**: Fishery via `factoryFor` from `@testing`. **Never**
  mock `AppService`, `bun:sqlite`, or HTTP ports. **YAML fixtures only
  for `ImportService` e2e specs.**
- **Naming**: file/folder snake_case enforced by Biome + ls-lint;
  `<name>.<artifact>.ts` per `assets/guides/CODESTYLE_GUIDE.md`.
- **No `KB`-prefixed identifiers** (constants, types, functions,
  variables, parameters). kb has actively been removing this prefix; do
  not reintroduce. `tools/naming_allowlist.txt` SHALL NOT be expanded.
- **Logging**: use `getLogger(['kb', '<area>', …])` from `@shared/logging`.
  **Never** `console.*` in `src/`. **Never** introduce a new `createLogger`.
- **RPC mirroring**: every new route in `src/shell/main/rpc/server.ts`
  must also exist in `tools/preview/server.script.ts` (this spec adds no
  routes, but Task 2.2 changes plugin composition — both files stay in
  lockstep).
- **Layer rules** (dependency-cruiser + ast-grep enforce):
  - `renderer/` → `shell/app/` is forbidden; use `@rpc/client`
    (Eden Treaty)
  - `core/` → `shell/` is forbidden; pure functions only
  - `shared/` → `shell/` is forbidden; shared utilities are pure
  - `*.routes.ts` → `*.repository.ts` directly is forbidden; go through
    AppService

## Workflow

The work is partitioned into six phases by `tasks.md`:

| Phase | Scope                                                                                                                                                                                                                     | Verification                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | Capture baseline (git status, `bun test`, `tsc`, `knip`, default log surface).                                                                                                                                            | Four baseline outputs recorded.                                                                                                                                                         |
| **1** | Infrastructure — new files in `src/shared/logging/`, lift `rpcErrorContract`, wire `configureSync` at main + renderer entry. `createLogger` still works unchanged.                                                        | `bun test` + `bunx tsc --noEmit` + quality gate green; `LOG_LEVEL=verbose bun run dev` matches the Phase 0 default surface (no regression yet).                                         |
| **2** | Mount `rpcCommonPlugins` on `createRpcServer` + preview server.                                                                                                                                                           | `LOG_LEVEL=verbose bun run dev` shows `Started`/`Completed` per RPC; `LOG_LEVEL=debug` adds `Parameters`; error path flushes the fingers-crossed buffer.                                |
| **3** | Refactor each repository to `repositoryStmts(db, 'Noun', { …sql })`.                                                                                                                                                      | `LOG_LEVEL=debug bun run dev` shows one SQL line per query; default-overhead benchmark within 2 % of baseline.                                                                          |
| **4** | Replace `createLogger()` calls in 6 files with `getLogger([…])`; delete `console.logger.ts` + spec; update barrel.                                                                                                        | `bunx knip` clean of `createLogger` leakage; `bunx tsc --noEmit` clean; `rg "createLogger" src/ tools/` empty.                                                                          |
| **5** | Documentation cascade: `CLAUDE.md`, `AGENTS.md`, `README.md`, `CODESTYLE_GUIDE.md`, `TESTING_GUIDE.md`, `foundation/design.md` + `roadmap.md`, `SKILLS.md`/`SKILLS.yaml`, new `LOGGING_GUIDE.md`, new `app-logging` skill. | Reviewer pass + quality gate.                                                                                                                                                           |
| **6** | Closure — run the closure command set and a four-level smoke test.                                                                                                                                                        | `bun test` + `bunx tsc --noEmit` + `bunx knip` + quality gate + `git diff --check` all exit 0; verbosity smoke test matches the four format examples in `design.md` §"Log line format". |

Open `tasks.md` and execute each task in order. After each phase (or each
logical sub-chunk in Phase 3 and Phase 5), commit using the
`/commit-staged` kb slash command — see `.cursor/commands/commit-staged.md`.
The slash command runs `bash .agents/skills/app-quality-gate/scripts/gate.sh`
first, then `git commit`, then the `hk` commit-message policy.

Mark a task complete only when its acceptance criteria pass. Add an
`Evidence:` bullet under each completed task with the changed files and
the exact commands you ran.

## Constraints

- TypeBox only — **never** import `zod` (it is not a dependency).
- Test factories via Fishery `factoryFor`; **never** mock `AppService`,
  real DB I/O, or HTTP ports.
- **No `KB`-prefixed identifiers** anywhere.
- Co-located `<name>.spec.ts(x)` for every new file (except trivial
  re-export-only modules like `logger.ts`).
- Each new Elysia route in `src/shell/main/rpc/server.ts` must also
  exist in `tools/preview/server.script.ts` (this spec changes plugin
  composition; both files stay in lockstep).
- Never weaken the quality stack: Biome, knip, dependency-cruiser,
  ast-grep, ls-lint, jscpd, `tsc` strictness. If a finding looks
  legitimate, fix the code, not the config.
- One commit per phase (Phase 1, 2, 4) or per logical sub-chunk
  (Phase 3 = one per repository; Phase 5 = four chunks per `tasks.md`
  Task 5.12); conventional-commit subjects ≤ 50 chars; see
  `assets/guides/GIT_COMMITS_GUIDE.md` and `hk.pkl`.
- Never push to main; never force-push; never skip hooks (no
  `--no-verify`).
- Commit message policy is enforced by `hk` (see
  `tools/hooks/commit_message.script.ts`); the policy is **not** a
  substitute for `bash .agents/skills/app-quality-gate/scripts/gate.sh`.

## Stop and report if

- Any task fails its acceptance criteria after a reasonable attempt to
  fix the underlying code.
- A task requires changes to files not listed in `design.md` §
  "File structure" or §"Call-site migration map".
- The quality gate produces unexpected findings (record the rule +
  count; propose the smallest fix rather than adding suppressions).
- A test relies on a mock or stub of `AppService` / `bun:sqlite` /
  HTTP — refactor instead.
- `LOG_LEVEL=trace` produces unreadable output (it might; flag for
  redesign rather than ship as-is).
- The renderer logging triggers any webview-side error involving
  `node:async_hooks` (we explicitly avoid it in `renderer.config.ts`;
  if a transitive dep pulls it in, surface this).
- The fingers-crossed flush emits records out of order, or floods the
  console under load.
- The Eden Treaty type inference breaks after Task 2.1 (the renderer
  client in `src/shell/renderer/rpc/client.ts` should pick up the new
  plugin composition transparently; if not, stop and report).
- The default-overhead benchmark in Task 3.5 regresses by more than
  2 % (DBG-8 §5).

When stopping, report:
- the exact command;
- the file and line where the failure surfaced;
- elapsed time if performance is involved;
- suspected cause;
- proposed smallest split or deferral decision.

## Completion criteria

The work is complete only when every box in `tasks.md` is checked with
evidence, and:

- `bun test` passes.
- `bunx tsc --noEmit` passes.
- `bunx knip` reports no `createLogger`-related leakage.
- `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.
- `git diff --check` exits 0.
- `LOG_LEVEL=verbose bun run dev` produces `Started`/`Completed` lines
  per RPC, correlated by `req=`.
- `LOG_LEVEL=debug bun run dev` adds full SQL lines correlated by
  `req=`.
- `LOG_LEVEL=trace bun run dev` adds bind values and the first-row
  representation.
- `LOG_LEVEL` unset produces only `warning`+ output; the fingers-crossed
  buffer flushes on errors.
- `CLAUDE.md` and `AGENTS.md` reflect the new policy.
- `assets/guides/LOGGING_GUIDE.md` exists and includes the
  Observability roadmap section per `requirements.md` DBG-7 §2.
- `.agents/skills/app-logging/SKILL.md` exists and is registered in
  `assets/guides/SKILLS.md` + `assets/catalog/SKILLS.yaml`.
- The receiving agent has run the closure command set from Task 6.1
  and recorded its output in `tasks.md`.
```
