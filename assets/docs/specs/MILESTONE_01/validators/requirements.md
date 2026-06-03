<!-- markdownlint-disable-file -->
# Validators — Requirements (TypeBox migration & workspace flatten)

## INTRODUCTION

This refactor amends Phase 3 (`feat(core): Add domain types, schemas, parsers`,
HEAD `33c3a63` on branch `chore-add-domain`) so the foundation domain layer is
TypeBox-native from day one. Zod was chosen during initial scaffolding but
should never have been adopted; correcting the choice in-place keeps history
honest. Three changes ship together:

1. Replace Zod with TypeBox throughout `src/core/`.
2. Flatten the workspace — delete the 3 nested `package.json` files; root
   `package.json` owns ALL dependencies.
3. Apply `type-fest` aggressively where it clarifies untrusted shapes and
   inferred TypeBox types.

The work amends the existing Phase 3 commit. No new commit lands on the branch.

---

## OUT OF SCOPE

- The 5 quarantined stashes (Phases 4–7 + misc-docs). Their re-application is
  a future concern.
- `src/shell/app/db/import.service.ts` (lives in the `phase-4-data-layer`
  stash). When unstashed it will need its own Zod→TypeBox pass; foundation
  docs already capture that obligation.
- Behaviour changes to the YAML parsing pipeline. Public API of
  `parseSourceFile` / `toEntry` / `toEntryWithSourceHint` is preserved.
- Performance work, preview server, RPC layer, renderer, main process.

---

## REQUIREMENT SYNTAX (EARS)

Acceptance criteria use EARS-style phrasing:

- **WHEN** _condition_, **THEN** the system **SHALL** _behaviour_.
- **IF** _condition_, **THEN** the system **SHALL** _behaviour_ (including errors).

Traceability: each **REQUIREMENT V-*** block maps to [design.md](../../MILESTONE_01/validators/design.md)
and to ordered work in [tasks.md](../../MILESTONE_01/validators/tasks.md).

---

## GLOSSARY

- **TypeBox:** [`@sinclair/typebox`][typebox] — JSON-Schema-compatible runtime
  validator. Already installed at v0.34.20.
- **Schema (`*.schema.ts`):** TypeBox shape definition. `Type.Object`,
  `Type.Union`, etc. No coercion logic.
- **Parser (`*.parser.ts`):** Pure TS function that coerces an untrusted
  `unknown` / `JsonValue` into a typed value. Owns custom error messages.
- **TypeBoxValidationError:** Project-internal error class wrapping
  `ValueError[]`. Replaces `ZodError` instance checks.
- **Workspace flattening:** Removing nested `package.json` files (`src/core/`,
  `src/shared/types/`, `src/shared/utils/`) and resolving path aliases via
  `tsconfig.json` `paths` only.
- **Amend target:** HEAD commit `33c3a63` (`feat(core): Add domain types,
  schemas, parsers`).

---

## REQUIREMENT V-1: Eliminate Zod from `src/core/`

### Acceptance criteria

1. WHEN `rg "from 'zod'" src/` runs, THEN the system SHALL produce zero
   matches.
2. WHEN `rg "\"zod\":" package.json src/` runs, THEN the system SHALL
   produce zero matches.
3. WHEN `bun pm ls 2>&1 | rg zod` runs, THEN the system SHALL produce zero
   matches (after `bun install`).
4. WHEN any `*.schema.ts` file is imported, THEN it SHALL import from
   `@sinclair/typebox` (and only TypeBox + sibling schemas / types /
   constants).

---

## REQUIREMENT V-2: Strict schema vs parser split

### Acceptance criteria

1. WHEN a `*.schema.ts` file declares custom error messages, THEN the build
   SHALL be considered incorrect — error messages live in `*.parser.ts`.
2. WHEN a `*.schema.ts` file imports a transform / coercion utility, THEN the
   `dependency-cruiser` rule `core-schema-must-be-pure-typebox` SHALL fail
   the build.
3. WHEN a parser receives an invalid input, THEN it SHALL throw
   `TypeBoxValidationError` carrying a `ValueError[]` whose `path` and
   `message` fields preserve the project's existing user-facing strings
   (e.g. `"At least one tag is required"`).
4. WHEN `entry.factory.ts` catches a validation failure, THEN the resulting
   error message SHALL match the format `"<file>:<line>: entry \"<key>\":
   <path>: <message>"` — identical to the pre-refactor format.

---

## REQUIREMENT V-3: Flat workspace

### Acceptance criteria

1. WHEN `find src -name package.json -type f` runs, THEN the system SHALL
   produce zero results.
2. WHEN `bun run typecheck` runs, THEN it SHALL exit 0.
3. WHEN `bun test src/core src/shared` runs, THEN all 126+ tests SHALL pass.
4. WHEN `tsconfig.json` is inspected, THEN `compilerOptions.paths` SHALL
   contain `@core`, `@core/*`, `@shared/types`, `@shared/types/*`,
   `@shared/utils`, `@shared/utils/*`.
5. WHEN `package.json` is inspected, THEN
   `dependencies["@sinclair/typebox"]` SHALL exist and `devDependencies
   ["type-fest"]` SHALL exist.

---

## REQUIREMENT V-4: Aggressive `type-fest` application

### Acceptance criteria

1. WHEN a value type is genuinely unknown (untrusted external input), THEN
   the declaration SHALL use `UnknownRecord` from `type-fest` rather than
   `Record<string, unknown>`.
2. WHEN a value originates from a YAML parse, THEN the declaration SHALL use
   `JsonValue` / `JsonObject` from `type-fest`.
3. WHEN a TypeBox `Static<typeof Schema>` type is exported, THEN it SHALL be
   wrapped in `Simplify<>` from `type-fest`.
4. IF a `Record<string, X>` already names a concrete value type `X` (e.g.
   `Record<string, string>` in `env.types.ts`), THEN it SHALL stay concrete
   and SHALL NOT be replaced with `UnknownRecord`.

---

## REQUIREMENT V-5: Foundation docs reflect the inverted decision

### Acceptance criteria

1. WHEN `assets/docs/specs/foundation/design.md` is inspected, THEN
   Decision 2 SHALL state "TypeBox throughout (Zod removed)" with rationale
   referencing the schema/parser split.
2. WHEN `assets/docs/specs/foundation/requirements.md` line 170 is
   inspected, THEN it SHALL read "WHEN a file fails YAML parsing or TypeBox
   validation".
3. WHEN `assets/docs/specs/foundation/roadmap.md` line 233 is inspected,
   THEN it SHALL state "TypeBox is the sole validation library across core
   and transport — Zod was removed in a prior refactor."
4. WHEN `.agents/skills/app-context/SKILL.md` is inspected, THEN the Zod /
   TypeBox rule SHALL state "TypeBox is the sole validation library across
   `src/core/` and the transport layer."
5. WHEN `.agents/skills/app-rpc/SKILL.md` is inspected, THEN the dependency
   table SHALL list `@sinclair/typebox` for the Domain layer (not `zod`).
6. WHEN `rg -i "\\bzod\\b" assets/docs/specs/foundation/
   .agents/skills/app-context/ .agents/skills/app-rpc/` runs, THEN the system
   SHALL produce zero matches.

---

## REQUIREMENT V-6: Single amended commit

### Acceptance criteria

1. WHEN the implementation completes, THEN HEAD on `chore-add-domain` SHALL
   be a single amended commit whose subject is `feat(core): Add domain
   types, schemas, parsers` (preserved from the pre-amend commit).
2. WHEN `git log -1 --format='%B'` runs, THEN the commit body SHALL describe
   TypeBox-only validation, type-fest application, the flat workspace, and
   the foundation doc updates.
3. IF the pre-amend HEAD SHA `33c3a63` was already pushed to a remote, THEN
   the implementation SHALL abort and request user guidance — amend SHALL
   NOT happen on a published commit.
4. WHEN `git stash list` runs post-amend, THEN it SHALL contain the same 6
   entries that existed pre-amend (5 phase stashes + 1 pre-existing WIP);
   no stashes SHALL be touched.

---

## QUALITY GATE (NFR)

Per [`app-quality-gate`](../../../../.agents/skills/app-quality-gate/SKILL.md),
the amend is complete only when ALL of the following exit 0:

| Goal               | Command                                                |
| ------------------ | ------------------------------------------------------ |
| TypeScript         | `bun run typecheck`                                    |
| Tests              | `bun test src/core src/shared`                         |
| Biome              | `bunx biome check src/`                                |
| Dependency-cruiser | `bunx depcruise src/ --config .dependency-cruiser.cjs` |
| Knip               | `bunx knip` (no NEW unused vs. baseline)               |
| jscpd              | `bunx jscpd src/ --min-lines 10 --threshold 5`         |

Coverage target: ≥ 80 % line coverage on the new helper module
`src/core/validation/typebox.helper.ts`.

---

## REFERENCES

- [design.md](../../MILESTONE_01/validators/design.md) — normative technical contract.
- [tasks.md](../../MILESTONE_01/validators/tasks.md) — ordered implementation work.
- Foundation specs — [`../foundation/design.md`](../../MILESTONE_01/foundation/design.md),
  [`../foundation/requirements.md`](../../MILESTONE_01/foundation/requirements.md),
  [`../foundation/roadmap.md`](../../MILESTONE_01/foundation/roadmap.md).
- Phase 3 spec — [`../core-domain/design.md`](../../MILESTONE_01/core-domain/design.md),
  [`../core-domain/tasks.md`](../../MILESTONE_01/core-domain/tasks.md).

[typebox]: https://github.com/sinclairzx81/typebox
