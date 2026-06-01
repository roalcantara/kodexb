<!-- markdownlint-disable-file -->
# HK quality orchestration - Handoff

## Status

This handoff is for implementing HK-based quality orchestration in
`/Users/roalcantara/Work/bun/kb`.

The research report is complete. The next agent should implement the SDD tasks
in `assets/docs/specs/hk/tasks.md` without weakening the current quality gate.
The goal is to make HK the shared orchestration layer for local, PR, CI, and
full-gate checks while preserving existing tool policy.

## Required reading

Read these files before editing:

- `AGENTS.md`
- `/Users/roalcantara/.agents/skills/hk/SKILL.md`
- `assets/docs/specs/hk/report.md`
- `assets/docs/specs/hk/requirements.md`
- `assets/docs/specs/hk/design.md`
- `assets/docs/specs/hk/tasks.md`
- `hk.pkl`
- `mise.toml`
- `package.json`
- `.github/workflows/review.yml`
- `.agents/skills/app-quality-gate/SKILL.md`
- `.agents/skills/app-quality-gate/scripts/gate.sh`
- `assets/docs/specs/codebase-quality-audit/requirements.md`

If touching Electrobun build or desktop packaging behavior, also follow the
Electrobun routing in `AGENTS.md`.

## Required skills

Load or follow:

- `hk`
- `app-quality-gate` before declaring completion
- `github-actions-docs` if changing workflow YAML
- `docs-writer` if updating guides or spec docs

Subagent prompts must explicitly include this repo override:

```txt
Do not create docs/superpowers/. Put SDD artifacts under
assets/docs/specs/hk/. Do not weaken the quality stack. Use bun:test and repo
testing guidance if tests are needed. Preserve existing user changes.
```

## Non-negotiable rules

- Do not weaken Biome, knip, dependency-cruiser, jscpd, ls-lint, ast-grep,
  TypeScript, gate policy, or CI reporting.
- Do not make `knip` strict without explicit maintainer approval.
- Do not remove existing CI lint/test/reporting before HK parity is proven.
- Do not replace tool configs with HK defaults.
- Do not remove or break
  `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
- Do not revert unrelated changes in the working tree.
- Do not mark task checkboxes complete without an `Evidence:` bullet.
- Do not treat a successful `hk validate` as proof that the full gate is
  equivalent.

## Implementation prompt

Use this prompt for the next agent:

```txt
Implement the HK quality orchestration SDD in
/Users/roalcantara/Work/bun/kb.

Start by reading AGENTS.md, /Users/roalcantara/.agents/skills/hk/SKILL.md,
and all files under assets/docs/specs/hk/. Follow tasks.md in order.

Goal:
- Promote HK from lightweight hook runner to shared quality orchestration.
- Add profile-oriented HK behavior for commit, pr, ci, full, and slow.
- Use HK file-scoped execution so checks like actionlint run only when
  relevant files are selected.
- Baseline high-value builtins, especially gitleaks, before making them
  blocking.
- Preserve the current quality gate and CI reporting until parity is proven.

Hard constraints:
- Do not weaken any quality tool or strictness flag.
- Do not make knip strict without explicit maintainer approval.
- Do not remove existing CI reporting/artifacts before HK parity.
- Keep gate.sh as a valid entry point.
- Do not create docs/superpowers/.
- Preserve unrelated working-tree changes.

Expected implementation flow:
1. Capture baseline commands from tasks.md Phase 0.
2. Refactor hk.pkl into reusable profile-oriented step mappings while
   preserving current hooks.
3. Add conditional actionlint first. Prove it is skipped when workflows are not
   selected and included when workflow files are selected.
4. Add safe targeted checks and baseline gitleaks.
5. Move existing lint/typecheck/security commands under HK profiles without
   changing policy.
6. Add CI parity only after local plan/output evidence.
7. Decide whether gate.sh can delegate to HK full; if not, document the gap.
8. Update docs and tasks.md evidence as each task is completed.

Final validation target:
- mise exec -- hk validate
- mise exec -- hk check --all --profile ci --plan
- mise exec -- hk check --all --profile ci --check
- mise exec -- hk check --all --profile full --plan
- git diff --check
- bash .agents/skills/app-quality-gate/scripts/gate.sh

If any final command cannot run because of environment limitations, record the
blocker and the narrower successful checks in tasks.md before handing back.
```

## Expected command evidence

At minimum, capture these before implementation:

```sh
git status --short
mise exec -- hk --version
mise exec -- hk validate
mise exec -- hk check --all --check --plan
mise exec -- hk check --all --check --stats
```

For conditional `actionlint`, capture:

```sh
mise exec -- hk check --profile pr --plan
mise exec -- hk check --all --profile ci --plan
mise exec -- actionlint
```

Also capture one representative plan where no workflow file is selected and
one representative plan where a workflow file is selected.

For `gitleaks`, capture:

```sh
mise exec -- gitleaks --version
```

Then run the selected baseline command defined during implementation and record
runtime plus findings. Do not make it a commit blocker until findings are
triaged.

## Definition of done

The work is done only when:

- `tasks.md` has completed checkboxes with `Evidence:` bullets.
- `hk.pkl` validates.
- HK profile plans show expected `commit`, `pr`, `ci`, `full`, and `slow`
  behavior.
- `actionlint` is conditionally included based on selected workflow files.
- `gitleaks` has been baselined and classified.
- Existing quality policy is preserved.
- CI parity gaps are either closed or documented before any removal of old CI
  orchestration.
- `gate.sh` remains valid.
- Final validation commands pass, or blockers are documented.
