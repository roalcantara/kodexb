<!-- markdownlint-disable-file -->
# Skills normalisation follow-up handoff

Use this prompt to hand the remaining review fixes to another agent. The first
normalisation pass introduced the `owned | project | global` schema and the
single `mise run skill <action>` task, but review found a few consistency gaps.

## Handoff prompt

```markdown
You are working in `/Users/roalcantara/Work/bun/app`.

Goal: Finish the skills-normalisation follow-up so the implementation, docs,
and actual Skills CLI project state all agree.

The previous implementation mostly works:

- `assets/catalog/SKILLS.yaml` uses `schema_version: 3`.
- Skill entries use `location: owned | project | global`.
- Skill behavior uses `policy.type: required | routed | optional | reference | blocked`.
- `mise run skill validate`, `mise run skill report`, `mise run skill sync`,
  and `mise run skill all --dry-run` already pass.

However, a code review found these remaining issues:

1. `mise run skill validate` only compares `SKILLS.yaml` with
   `skills-lock.json`; it does not detect project skills that are still
   installed on disk through the Skills CLI but are no longer approved by the
   registry or lock file.
2. `README.md` and `.cursor/rules/electrobun-skills.mdc` still mention the old
   linked-skill workflow, `mise run skills:sync`, and `mise run link:skills`.
3. `assets/docs/specs/skills-normalisation/handoff.md` still has a TOML example
   that says `link` instead of `install`.

Before editing:

1. Read `.agents/skills/app-context/SKILL.md`.
2. Because this touches `mise.toml`, use the `mise-tasks` skill if available.
3. Because this writes Markdown, use the docs-writing guidance available in
   this repo/session.
4. Do not revert unrelated dirty files. There are staged and unstaged changes
   in this workspace.

## Required fixes

### 1. Validate actual project-installed skills

Update the `skill` task in `mise.toml` so `validate` also checks the actual
project-installed skill directories reported by the Skills CLI.

Use `skills list --json` from the repository root. Treat items with
`scope === "project"` and paths under `<repo>/.agents/skills/` as actual
project skills.

The actual project skill set must equal:

- all `location: owned` entries from `assets/catalog/SKILLS.yaml`
- all `location: project` entries from `assets/catalog/SKILLS.yaml`

Validation must fail when:

- an actual project-installed skill exists but is not `location: owned` or
  `location: project` in `SKILLS.yaml`
- a `location: owned` or `location: project` entry is missing from actual
  project installs
- a `location: global` or blocked skill is installed as a project skill

Keep the existing lock-file checks:

- every `location: project` entry must appear in `skills-lock.json`
- every `skills-lock.json` entry must appear as `location: project`
- `location: owned` and `location: global` must not appear in
  `skills-lock.json`

Implementation notes:

- If `skills list --json` fails because the `skills` CLI is missing, validation
  should fail with a clear message. This registry is explicitly Skills
  CLI-backed.
- Do not validate `.claude/skills/*` symlinks as a separate source of truth.
  They are agent materialization details produced by the Skills CLI. The source
  of truth is `SKILLS.yaml`, `skills-lock.json`, and the project skill list from
  `skills list --json`.
- `skill report --json` should include enough information to debug drift,
  preferably `actual_project_skills`, `expected_project_skills`, and any
  extras or missing entries. Plain-text report may summarize counts.

### 2. Resolve current drift

After adding actual project-state validation, make the current workspace pass.

At review time, the actual project skill list still included:

- `electrobun-debugging`
- `electrobun-release`

Those were no longer present in `skills-lock.json` or `SKILLS.yaml`.

Choose one consistent resolution:

- If these skills are still recommended for app, re-add them to
  `skills-lock.json` and `assets/catalog/SKILLS.yaml` as `location: project`, and
  restore the Electrobun routing/docs rows.
- If they are no longer recommended, remove them from the actual project skill
  installation with the Skills CLI, and make sure generated routing/docs do not
  mention them.

Do not leave actual installed project skills outside the registry.

### 3. Update stale docs

Replace old linked-skill wording with the new model in:

- `README.md`
- `.cursor/rules/electrobun-skills.mdc`
- `assets/docs/specs/skills-normalisation/handoff.md`

Required wording changes:

- Use `mise run skill sync`, not `mise run skills:sync`.
- Use `mise run skill install`, not `mise run link:skills`.
- Describe project skills as Skills CLI-managed project skills restored from
  `skills-lock.json`, not as approved linked companions.
- Describe `SKILLS.yaml` as using `location: owned | project | global`.
- In `handoff.md`, update the TOML example to:

```toml
[tasks.skill]
description = "Validate, generate, install, and report app skill registry artifacts."
usage = '''
arg "<action>" help="Skill registry action" {
  choices "validate" "sync" "install" "all" "report"
}
flag "--json" help="Print machine-readable report output"
flag "--dry-run" help="Validate intended writes without changing files"
'''
run = '''
#!/usr/bin/env bun
// Implementation lives here.
'''
```

### 4. Keep generated sections generated

If `SKILLS.yaml` or generation logic changes, run:

```bash
mise run skill sync
```

Do not manually edit content between these markers unless you are also fixing
the generator:

- `<!-- skills:optional-companions:start -->`
- `<!-- skills:optional-companions:end -->`
- `<!-- skills:electrobun-routing:start -->`
- `<!-- skills:electrobun-routing:end -->`

## Verification

Run and report:

```bash
mise run skill validate
mise run skill report
mise run skill report --json
mise run skill sync
mise run skill all --dry-run
bun run lint:mise
git diff --check -- assets/catalog/SKILLS.yaml assets/guides/SKILLS.md mise.toml CLAUDE.md AGENTS.md README.md .agents/skills/app-context/SKILL.md .cursor/electrobun-skill-routing.md .cursor/rules/electrobun-skills.mdc assets/docs/specs/skills-normalisation/requirements.md assets/docs/specs/skills-normalisation/handoff.md assets/docs/specs/skills-normalisation/handoff-follow-up.md
```

Also run these consistency checks and report the result:

```bash
skills list --json
rg -n "mise run (skills:sync|link:skills)|approved linked|linked companions|choices \"validate\" \"sync\" \"link\"" README.md .cursor/rules/electrobun-skills.mdc assets/docs/specs/skills-normalisation/handoff.md assets/docs/specs/skills-normalisation/requirements.md assets/guides/SKILLS.md AGENTS.md CLAUDE.md .agents/skills/app-context/SKILL.md .cursor/electrobun-skill-routing.md mise.toml
```

Expected outcome:

- `mise run skill validate` fails if actual Skills CLI project installs drift
  from `SKILLS.yaml`.
- `mise run skill report --json` exposes expected, actual, missing, and extra
  project skill information.
- No docs still instruct users to run `mise run skills:sync` or
  `mise run link:skills` as the current workflow.
- `README.md`, `.cursor/rules/electrobun-skills.mdc`, `SKILLS.md`,
  `SKILLS.yaml`, and `skills-lock.json` describe the same skill model.
- Actual project skills, `skills-lock.json`, and `SKILLS.yaml` have no
  unapproved drift.
```
