<!-- markdownlint-disable-file -->
# Normalise Biome rules — Handoff prompt

Use this prompt to hand the implementation to another agent.

```md
You are taking over `assets/docs/specs/normalise-biome-rules/`.

Goal:
Adopt additional Biome rules one rule at a time, making every adopted rule pass
`bun test`, `bun run lint`, and `bun run build` before committing and moving to
the next rule.

Required context:
- Read `.agents/skills/kb-context/SKILL.md`.
- Read `.agents/skills/kb-quality-gate/SKILL.md`.
- Read `.agents/skills/kb-testing/SKILL.md` for test-rule phases.
- Use `biome-developer`.
- Use `subagent-driven-development`.
- Read `assets/docs/specs/normalise-biome-rules/requirements.md`.
- Read `assets/docs/specs/normalise-biome-rules/design.md`.
- Execute `assets/docs/specs/normalise-biome-rules/tasks.md` phase by phase.

Workflow:
1. Pick the next unchecked phase in `tasks.md`.
2. Dispatch one implementer subagent for only that phase.
3. Run the exact baseline probe listed for that rule.
4. Record the baseline finding count in the rule ledger.
5. Fix only that rule's findings, or record path-specific exceptions.
6. Enable only that rule in `biome.jsonc`.
7. Run the exact rule-specific verification command.
8. Run:

   ```sh
   bun test
   bun run lint
   bun run build
   ```

9. Update `tasks.md` with final count, touched files, exceptions, and
   verification evidence.
10. Run spec-compliance review with a fresh subagent.
11. Run code-quality review with a fresh subagent.
12. Commit only that rule phase using the suggested commit command.
13. Move to the next phase only after the commit succeeds.

Important constraints:
- Do not enable broad Biome domains or groups.
- Do not add ESLint, Jest ESLint plugins, or another lint runner.
- Do not weaken existing quality tools.
- Do not add broad `biome-ignore` suppressions.
- Do not batch unrelated rule adoptions into one commit.
- Do not start the next rule until the current rule is verified and committed.
- If a rule is too noisy, defer it and record the reason instead of forcing it.

Stop and report if:
- A rule produces far more findings than the task ledger expected.
- A rule requires broad production refactors.
- `bun test`, `bun run lint`, or `bun run build` fails for unrelated reasons.
- `bun run build` cannot run on the current host.
- Any command becomes unexpectedly slow.

When stopping, report:
- the exact command or rule;
- elapsed time if slowness is involved;
- suspected cause;
- proposed smallest split or deferral decision.

Completion:
The work is complete only when every adopted rule has:
- a baseline count;
- a final count;
- `biome.jsonc` configuration;
- path-specific exceptions if any;
- passing `bun test`;
- passing `bun run lint`;
- passing `bun run build`;
- one atomic commit.

The final closure phase must also run:

```sh
bun test
bun run lint
bun run build
git diff --check
bash .agents/skills/kb-quality-gate/scripts/gate.sh
```
```
