<!-- markdownlint-disable-file -->
# Normalise source specs — Handoff prompt

Use this prompt to hand the implementation to another agent.

```md
You are taking over `assets/docs/specs/normalise-specs/`.

Goal:
Normalise source spec files so they consistently follow
`assets/guides/TESTING_GUIDE.md`, without changing product behavior.

Required context:
- Read `.agents/skills/kb-context/SKILL.md`.
- Read `.agents/skills/kb-testing/SKILL.md`.
- Read `.agents/skills/kb-quality-gate/SKILL.md`.
- Use the `subagent-driven-development` skill for execution.
- Read `assets/guides/TESTING_GUIDE.md`.
- Read `assets/guides/FISHERY_GUIDE.md`.
- Read `assets/docs/specs/normalise-specs/requirements.md`.
- Read `assets/docs/specs/normalise-specs/design.md`.
- Execute `assets/docs/specs/normalise-specs/tasks.md` phase by phase.

Workflow:
1. Pick the next incomplete phase in `tasks.md`.
2. Read every referenced acceptance criterion in `requirements.md`.
3. Inspect the relevant spec files before editing.
4. Implement only that phase.
5. Preserve test semantics. If behavior is ambiguous, stop and report the file,
   current assertion, ambiguity, and proposed decision.
6. Run focused `bun test` commands for touched files or directories.
7. Update the inventory ledger and checkboxes in `tasks.md`.
8. Run `bash .agents/skills/kb-quality-gate/scripts/gate.sh`.
9. Commit exactly that phase's files using the suggested commit command.
10. Continue to the next phase.

Audit closure rule:
- Do not mark an audit category complete because findings are documented.
- A category is complete only when it has zero findings or every remaining path
  is listed as a narrow intentional exception with a reason.
- If `mise run test:spec-style` reports a non-zero count, keep the relevant
  Phase 14 checkbox open until the count is burned down or path-specific
  exceptions are recorded.

Subagent workflow:
- Use a fresh implementer subagent per phase or tightly scoped phase slice.
- Review each implementation for spec compliance first, then code quality.
- Do not ask whether to continue between phases. Continue unless a stop
  condition below is hit.
- If a phase is too broad, split by source layer and update `tasks.md` before
  dispatching more work.

Important constraints:
- Do not rewrite production behavior just to simplify a test.
- Do not add Jest, Vitest, or another test runner.
- Use `bun:test` only.
- Use nested `describe`; do not add or keep `context` aliases.
- Make the object under test explicit with `subject`, `Subject`,
  `makeSubject()`, `renderSubject()`, or a context-specific action helper when
  it improves clarity.
- Use `import * as subject from './module'` only for cohesive multi-export
  modules, with nested `describe` blocks for exported public surfaces.
- Remove "should" wording from touched test descriptions.
- Prefer dependency injection, local test doubles, in-memory SQLite, and
  `@testing` helpers over mocks and bulky fixtures.
- Prefer `factoryFor(...)` for recurring project-owned shapes, including
  domain records, config, RPC payloads, renderer props, geometry, display/window
  data, typed events, and repeated scenario variants.
- Keep YAML fixtures only for import, sync, or file-format integration specs.
- For renderer specs, dispatch keyboard and focus events through production
  surfaces whenever possible.
- Record every accepted exception in the `tasks.md` ledger.

Stop conditions:
- A mock replacement requires a production refactor.
- A fixture appears to define a real integration contract.
- A renderer event test cannot be aligned with production semantics safely.
- A phase grows too large for one commit.
- Focused tests fail in a way unrelated to the current phase.
- Any command or phase becomes unexpectedly slow. Stop and report the exact
  command, elapsed time, suspected cause, and smallest proposed split.

Completion:
The work is complete when every phase in `tasks.md` is checked, the final
quality gate passes, `mise run test:spec-audit` has been recorded, and the final
ledger captures accepted exceptions and future enforcement candidates. The
final implementation must also pass `mise run test:spec-style -- --scope=src
--strict` once that task exists. A green quality gate is not enough if
`test:spec-style` still reports unresolved findings.
```
