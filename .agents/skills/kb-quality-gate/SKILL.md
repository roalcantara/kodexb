---
name: kb-quality-gate
description: >
  Load and run this gate before declaring any kb feature or phase complete —
  before committing, before handing off to the next phase, before reporting
  "done" to the user, or whenever the user asks "is this ready?". It runs
  five sequential checks: bun test, bun run lint, preview server smoke test,
  knip (unused exports), and jscpd (duplication). All five must pass. It also
  contains the full Definition of Done checklist (implementation, code quality,
  tests, TypeScript, documentation, git). Do not skip it even for "small"
  changes — the gate catches the category of bugs that feel minor but break
  the next phase's foundation.
---

# kb Quality Gate

## When to Run

Run the gate after **every** feature or phase is declared done — before
committing, before requesting a review, before signalling completion.

```bash
bash .agents/skills/kb-quality-gate/scripts/gate.sh
```

---

## Gate Stages

### 1. Tests — all must be green

```bash
bun test
# Expected: 0 failures, 0 skipped, coverage ≥ 80%
```

### 2. Lint + Typecheck

```bash
bun run lint
# Runs: biome check, knip, dependency-cruiser, jscpd, tsc --noEmit
# Expected: exit 0
```

### 3. Preview Server Smoke Test

```bash
bun tools/preview/server.ts &
SERVER_PID=$!
sleep 2
curl -sf http://localhost:3456/ | grep -q 'kb — preview' && echo "PASS" || echo "FAIL"
kill $SERVER_PID
```

### 4. Knip — no unused exports

```bash
bunx knip
# Expected: no unused exports or unresolved imports
```

### 5. JSCPD — no excessive duplication

```bash
bunx jscpd src/ --min-lines 10 --threshold 5
# Expected: duplication below 5%
```

---

## Definition of Done Checklist

Work through every item before reporting a phase complete.

### Implementation
- [ ] All acceptance criteria from the feature's `docs/specs/<slug>/requirements.md` are met
- [ ] No TODO/FIXME comments left in new code
- [ ] No `console.log` debug statements in `src/`
- [ ] Every new Elysia route is mirrored in `tools/preview/server.ts`

### Code Quality
- [ ] `bun run lint` exits 0
- [ ] No new Biome warnings suppressed with `// biome-ignore` without a comment
- [ ] Dependency-cruiser reports no architectural violations
- [ ] File and export naming follows `kb-context` conventions

### Tests
- [ ] Every new function/component has a co-located spec file
- [ ] `bun test` exits 0 — zero failures, zero skipped
- [ ] Coverage ≥ 80% for the changed files (`bun test --coverage`)
- [ ] Renderer specs use `@testing-library/react` + Happy-DOM
- [ ] RPC specs use `server.handle(request)` — no real port

### TypeScript
- [ ] `tsc --noEmit` exits 0
- [ ] No `any` in new code (use `unknown` + type narrowing)
- [ ] No `@ts-ignore` or `@ts-expect-error` without a code comment explaining why

### Documentation
- [ ] Every exported function/class/type has a JSDoc `/** */` comment
- [ ] `docs/specs/<slug>/design.md` updated if architecture changed
- [ ] Skill files updated if new patterns were established

### Git
- [ ] Commits follow Conventional Commits: `type(scope): Subject` (capital S)
- [ ] Subject line ≤ 72 characters
- [ ] Each commit is atomic — one logical change

---

## Common Failure Patterns

| Failure                          | Likely cause                                  | Fix                                      |
|----------------------------------|-----------------------------------------------|------------------------------------------|
| `knip` unused export             | Added a helper not called from anywhere       | Either use it or delete it               |
| dep-cruiser violation            | Renderer imported from `src/shell/app/`       | Route through Elysia client only         |
| TypeBox + Zod type mismatch      | Used Zod schema in an Elysia route            | Replace with `t.*` (TypeBox)             |
| Coverage < 80%                   | New branch/function not tested                | Add spec cases for uncovered paths       |
| Preview server route missing     | Added Elysia route but forgot to mirror       | Add matching `case` in `server.ts`       |

---

## Gotchas

- `bun test --coverage` only instruments files that are imported by at least one
  spec — orphan source files won't appear in coverage.
- `dependency-cruiser` config is at `.dependency-cruiser.cjs` — run
  `bunx depcruise src/ --config .dependency-cruiser.cjs` to check manually.
- Knip may flag re-exported types as unused if they're only consumed by the
  Eden Treaty client's inferred types. Add those to `knip.config.ts` ignore list
  with a comment explaining why.
- The gate script exits non-zero on first failure. Fix each stage before proceeding.
