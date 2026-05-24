---
name: kb-quality-gate
description: >
  Use when about to declare any kb feature, phase, or task complete — before
  commit, before PR, before reporting "done", or whenever asked "is this
  ready?". Triggers on: finishing a task, marking a roadmap phase complete,
  requesting review, claiming a fix. Also load it on every "small" change —
  the gate catches the category of bugs that feel minor but break the next
  phase's foundation.
---

# kb Quality Gate

## Overview

This skill is the executable form of [`assets/guides/DoD.md`](../../../assets/guides/DoD.md).
If the skill and DoD ever disagree, **DoD wins** — update the skill to match.
The skill exists to give the agent a runnable sequence; DoD lists the contract.

The gate is one sentence: **autofix → policy → lint → test → smoke → DoD checklist → commit.**

## When to Run

Run the gate at the boundary where work transitions from "in progress" to
"done":

- Before staging files for a commit
- Before opening or updating a PR
- Before answering "is this ready?" or "is the phase complete?"
- Before handing a branch off to another agent

Do NOT skip even for "small" changes. Skipping the gate is how trivial
violations (subject-line overage, an extra `console.log`, an orphan export)
slip into a `main` that the next phase will build on.

## The Gate

Run the bundled script — it executes every stage in order and exits non-zero
on the first failure:

```bash
bash .agents/skills/kb-quality-gate/scripts/gate.sh
```

If any stage fails, fix it, then re-run from Stage 0. Do NOT skip ahead.

### Stage 0 — Autofix first

```bash
bun run lint:fix
```

Runs `knip:fix` + `ast-grep:fix`, then **one** `lint:biome:fix` pass (`biome
check --write` with `--diagnostic-level=warn` and `--error-on-warnings`), then
`typecheck`. Biome runs **after** the other fixers so formatting and
lint-safe fixes apply to the final tree without a second full Biome scan; Stage
1’s `bun run lint` still runs `lint:biome:strict` for the full gate. Many
violations are auto-correctable; running this **before** `bun run lint` saves a
manual-fix loop. [`assets/guides/DoD.md`](../../../assets/guides/DoD.md) §1
lists this as the first DoD step.

**Other linters:** `knip` is invoked with `--no-exit-code` in `lint:knip`, so
it reports issues but does not fail the gate by itself; treat its output as a
fix backlog unless you tighten `package.json` later. `jscpd` reads
`.jscpd.json` (`threshold: 0`); any detected clone fails the gate.
`dependency-cruiser`, `ls-lint`, and `ast-grep` use normal exit codes in
`bun run lint`.

### Stage 0.5 — Policy (suppressions + guard reminders)

```bash
bash .agents/skills/kb-quality-gate/scripts/gate_policy.sh
```

Runs automatically from `gate.sh` after Stage 0. It **fails** if the working
tree or index **adds** new inline suppressions under `src/`, `tools/`, or
`electrobun.config.ts` (`biome-ignore*`, `@ts-expect-error`, `@ts-ignore`,
`eslint-disable`) unless a maintainer has approved weakening and you export
`KB_GATE_APPROVED_TOOL_WEAKENING=1` for that gate run (see `AGENTS.md` and
`assets/docs/specs/codebase-quality-audit/requirements.md` R6).

It **warns** when guard configs change (`biome.jsonc`, `knip.jsonc`,
`.dependency-cruiser.cjs`, `tsconfig.json`, `.ls-lint.yml`, `sgconfig.yml`) so you double-check
they do not relax enforcement without approval. The script does **not** parse
whether a change tightens or weakens rules; reviewers (and optional
`CODEOWNERS` on those files) are the backstop. To make guard edits explicitly
approved in automation, extend `gate_policy.sh` (for example: fail the gate
when any listed guard file is in the diff unless
`KB_GATE_APPROVED_TOOL_WEAKENING=1`, or add a dedicated env flag for config-only
changes) — trade-off: more friction on benign edits (`tsconfig` path tweaks).

It **reminds** (informational) that Electrobun-facing work must follow
`electrobun-best-practices` + routing (R7); the gate does not statically prove
compliance—read the skill before shipping.

**Escape hatches:** `KB_GATE_SKIP_POLICY=1` skips the whole policy stage (use
sparingly, e.g. broken `git` sandbox). `KB_GATE_APPROVED_TOOL_WEAKENING=1`
allows the suppression diff check to pass after explicit maintainer sign-off.

### Stage 1 — Lint + Typecheck

```bash
bun run lint
```

This single script runs **all** of: `tsc --noEmit`, `biome check` (strict:
warn-level + error on warnings),
`knip`, `dependency-cruiser`, `tombi check mise.toml`, `jscpd`,
`@ls-lint/ls-lint`, `ast-grep scan`. Exit 0 means every architectural and
style guard passed (including FCIS — `dependency-cruiser` enforces "no
`core/` → `shell/` imports").

### Stage 2 — Tests

```bash
bun test
```

Zero failures, zero skipped. Use the **kb-testing** skill for fixture and
spec patterns. Coverage check:

```bash
bun test --coverage
```

DoD §2: aim for ≥ 80% line coverage on changed files.

Playwright preview specs (`bun run e2e:preview`) are **not** part of `gate.sh`
by default — they need Chromium (`bun run e2e:preview:install` once) and a
non-empty preview DB to execute meaningful assertions; otherwise they may
`test.skip`. Run them explicitly when changing list/nav UI or preview tooling:

```bash
mise run e2e:preview
```

### Stage 3 — Preview-server smoke test

```bash
bun tools/preview/server.ts &
SERVER_PID=$!
sleep 3
curl -sf http://localhost:3456/ | grep -q 'kb — preview' && echo PASS || echo FAIL
kill "$SERVER_PID"
```

Confirms every Elysia route added in this change has a matching mirror in
`tools/preview/server.ts` (CLAUDE.md mandate).

### Stage 4 — Build smoke

```bash
bun run build
```

Per DoD §4: must produce `dist/kb.app` for macOS. Skip this stage only if
`build:prod` is unavailable in the current environment (e.g. Linux runner
without macOS toolchain) — but never skip on a developer machine before a
release commit.

## Definition of Done

[`assets/guides/DoD.md`](../../../assets/guides/DoD.md) is the canonical list.
Read it once per phase and tick each item. The kb-specific extras the guide
does not fully spell out:

- Every new Elysia route is mirrored in `tools/preview/server.ts`.
- `dependency-cruiser` reports zero violations — in particular no
  `renderer/` → `shell/app/` and no `core/` → `shell/` imports.
- Every new file under `src/` has a co-located `.spec.ts(x)` (DoD §2 +
  CLAUDE.md "every new file in `src/` needs a co-located `.spec.ts(x)`").
- Naming follows [`assets/guides/CODESTYLE_GUIDE.md`](../../../assets/guides/CODESTYLE_GUIDE.md)
  §File Naming — the suffix table is **machine-checked** by ls-lint.

## Commit message rules

Canonical source: [`assets/guides/GIT_COMMITS_GUIDE.md`](../../../assets/guides/GIT_COMMITS_GUIDE.md).
Non-negotiable bits:

- Conventional Commits: `type(scope): Subject` (capital S, imperative mood)
- **Subject line ≤ 50 characters** (strict — HK's `commit-message-policy` step enforces this)
- Body wrapped at 72 chars; explains WHAT + WHY, not HOW
- Atomic — one logical change per commit
- DoD §6 hooks must pass (HK `commit-message-policy` etc.)

## Common Mistakes

| Failure                           | Likely cause                                               | Fix                                                 |
| --------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Manual fixing biome/knip/ast-grep | Ran `bun run lint` before `bun run lint:fix`               | Re-run with `lint:fix` first; many auto-correct     |
| `knip` unused export              | Added a helper not imported anywhere                       | Use it or delete it                                 |
| dep-cruiser violation             | Renderer imported from `src/shell/app/`                    | Route through Eden Treaty client only               |
| dep-cruiser violation             | `core/` imported from `src/shell/` or `src/shared/logging` | Pass the dep in as a parameter (FCIS rule)          |
| TypeBox / validation drift        | Used `z.*` or non–TypeBox shapes in an Elysia route        | Use `t.*` / TypeBox only; `zod` is not a dependency |
| Coverage < 80%                    | New branch/function not exercised                          | Add spec cases for uncovered paths                  |
| Preview-server route missing      | Added Elysia route but forgot to mirror                    | Add matching `case` in `tools/preview/server.ts`    |
| Subject line > 50 chars           | Wrote subject in 72-char "body width" mode                 | Rewrite — HK's commit-message-policy will reject the commit anyway     |
| `console.log` in `src/`           | Debug statement left in                                    | Delete; logging goes through `@shared/logging`      |

## Red Flags — STOP and re-run the gate

- "It's a one-line change, I'll skip the gate" → run it; one-liners break things.
- "The lint failure is unrelated, I'll fix it later" → fix it now or revert.
- "I'll just add `// biome-ignore` to silence it" → only with a comment explaining *why* (DoD §1 ban on suppressed warnings without justification).
- "Coverage dropped 1% but the feature works" → add the missing spec; the gate is non-negotiable.
- "Preview server doesn't matter for this PR" → it does; the route mirror catches drift between the real RPC and the preview tooling.

All of these mean: **stop, complete the gate, then revisit.**

## Gotchas

- `bun test --coverage` only instruments files that are imported by at least
  one spec — orphan source files won't appear. Check the list, don't trust
  the percentage.
- `dependency-cruiser` config lives at `.dependency-cruiser.cjs` — run
  `bunx depcruise src/ --config .dependency-cruiser.cjs` for a focused pass.
- Knip may flag re-exported types as unused if they're only consumed by the
  Eden Treaty client's inferred types. Add those to the knip config ignore
  list with a comment explaining why.
- The `gate.sh` script exits non-zero on first failure — fix each stage
  before proceeding rather than continuing past errors.
- Mise tasks (`mise run <task>`) are preferred over ad-hoc shell for
  complex workflows; for simple scripts, `bun run <script>` is fine. See
  [`assets/guides/MISE_GUIDE.md`](../../../assets/guides/MISE_GUIDE.md).
