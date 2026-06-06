<!-- markdownlint-disable-file -->
# Normalise mise tasks — Handoff prompt

Use this prompt to hand the implementation to another agent.

```md
You are taking over `assets/docs/specs/normalise-tasks/`.

Goal:
Update `assets/guides/MISE_GUIDE.md` and normalize project automation so
parameterized workflows use mise `usage` args and flags, similar workflows are
merged into action-driven tasks where safe, complex scripts live in root
`mise.toml`, and related docs point to canonical commands.

Required context:
- Read `.agents/skills/app-context/SKILL.md`.
- Read `.agents/skills/app-quality-gate/SKILL.md`.
- Read `assets/guides/MISE_GUIDE.md`.
- Read `assets/docs/specs/normalise-tasks/requirements.md`.
- Read `assets/docs/specs/normalise-tasks/design.md`.
- Execute `assets/docs/specs/normalise-tasks/tasks.md` phase by phase.
- Load `mise-tasks` before creating or updating mise tasks.
- Load `mise-expert` before editing tool versions, `[env]`, setup behavior, or
  environment assumptions.

Workflow:
1. Pick the next incomplete phase in `tasks.md`.
2. Read every referenced acceptance criterion in `requirements.md`.
3. Inspect existing task/script definitions before editing.
4. Implement only that phase.
5. Prefer one task with an action arg for similar workflows when it improves
   clarity and preserves safety.
6. Use mise `usage` args and flags for task inputs.
7. Use `#!/usr/bin/env bash` or `#!/usr/bin/env bun` for complex task bodies.
8. Preserve hidden compatibility wrappers only when useful.
9. Update references in README, AGENTS, CLAUDE, package scripts, guides, and
   specs after canonical commands change.
10. Run phase-specific verification.
11. Update the ledger and checkboxes in `tasks.md`.
12. Run the full quality gate when executable workflow behavior changed.
13. Commit exactly that phase's files using the suggested commit command.

Stop conditions:
- A task is destructive and lacks a safe dry-run or confirmation path.
- A release or publish workflow cannot be safely verified.
- Merging tasks would hide a meaningful safety or dependency distinction.
- A package script appears to be required by external tooling.
- Docs disagree on the canonical command and the correct target is unclear.

Verification expectations:
- `bun run lint:mise` after every `mise.toml` change.
- `mise tasks --hidden` after task surface changes.
- `mise run <task> --help` for each task with `usage`.
- Low-risk smoke commands for migrated dispatch logic.
- `git diff --check` for touched files.
- `bash .agents/skills/app-quality-gate/scripts/gate.sh` before phase
  completion when executable workflow behavior changed.

Completion:
The work is complete when every phase in `tasks.md` is checked, canonical task
commands are documented, retained wrappers and exceptions are recorded, and the
final quality gate result or exact blocker is captured.
```
