<!-- markdownlint-disable-file -->
# End-to-end regression suite - Handoff

Use this prompt to hand implementation to another agent.

| Field                 | Value                            |
| --------------------- | -------------------------------- |
| Base branch           | `feat-add-stats-panel`           |
| Implementation branch | `feat-e2e-regression`            |
| Worktree path         | `.worktrees/feat-e2e-regression` |

The e2e rollout is large and touches harness, mise, and test deps. Step 0 keeps
that work off the primary checkout and stacks on the current integration branch
(same pattern as `feat-hk-orchestration` in `assets/docs/specs/hk/tasks.md`).

```md
You are taking over `/Users/roalcantara/Work/bun/kb` to implement the e2e
regression suite specified in `assets/docs/specs/e2e/`.

Goal:
Build a deterministic, BDD-oriented e2e test suite that protects first-release
behavior from regressions. The suite starts from the existing Playwright preview
harness and grows through prioritized Gherkin smoke and regression scenarios.

## Step 0 — Isolated worktree (do this first)

Do **not** implement in the user's primary checkout if it has unrelated WIP.
Load `.agents/skills/using-git-worktrees/SKILL.md` and follow it.

**Base branch:** `feat-add-stats-panel` (current integration branch for renderer
and tooling work at planning time). Fetch and verify it exists before branching.

**New branch:** `feat-e2e-regression` (all e2e harness + BDD commits land here).

**Worktree path:** `.worktrees/feat-e2e-regression` (already gitignored).

```sh
cd /Users/roalcantara/Work/bun/kb
git fetch origin feat-add-stats-panel 2>/dev/null || true
git worktree list
# If already inside .worktrees/* on feat-e2e-regression, skip creation.

git check-ignore -q .worktrees || { echo ".worktrees must be gitignored"; exit 1; }
git worktree add .worktrees/feat-e2e-regression -b feat-e2e-regression feat-add-stats-panel
cd .worktrees/feat-e2e-regression
bun install
bash .agents/skills/app-quality-gate/scripts/gate.sh   # baseline; report failures before proceeding
```

If `git worktree add` fails (sandbox, missing base branch), stop and report the
blocker — do not silently mutate the primary workspace.

**Merge back** when the suite is stable (maintainer or follow-up PR):

```sh
cd /Users/roalcantara/Work/bun/kb
git merge feat-e2e-regression
# or cherry-pick individual commits from the worktree branch
```

Record the worktree path and branch name in every task Evidence block.

Required project context:
- Read `AGENTS.md`.
- Read `.agents/skills/app-context/SKILL.md`.
- Read `.agents/skills/app-testing/SKILL.md`.
- Read `.agents/skills/app-quality-gate/SKILL.md`.
- Read `assets/guides/TESTING_GUIDE.md`.
- Read `assets/guides/BDD_GUIDE.md`.
- Read `assets/guides/BDD_GHERKIN_GUIDE.md`.
- Read `assets/docs/specs/e2e/fixture-manifest.md`.
- Read `assets/docs/specs/e2e/step-catalog.md`.
- Read `assets/docs/specs/e2e/requirements.md`.
- Read `assets/docs/specs/e2e/design.md`.
- Execute `assets/docs/specs/e2e/tasks.md` in order.

Helpful references:
- Existing Playwright config: `playwright.config.ts`.
- Existing preview smoke: `e2e/preview_list_nav.e2e.spec.ts`.
- Preview server: `tools/preview/server.script.ts`.
- Preview Electrobun mock: `tools/preview/mock_electroview.script.ts`.
- RPC server: `src/shell/main/rpc/server.ts`.
- App orchestrator: `src/shell/app/app.ts`.
- Test helpers/factories: `src/__tests__/`.
- Existing SDD specs: `assets/docs/specs/`.

Skill routing:
- Load `app-context` before any project work.
- Load `using-git-worktrees` before creating the worktree (Step 0).
- Load `app-testing` before writing or changing tests or test harnesses.
- Load `app-quality-gate` before declaring a task complete.
- Gherkin: `bdd-gherkin-specification`, `playwright-bdd-gherkin-syntax`,
  `cucumber-gherkin`, `cucumber-best-practices`.
- Step definitions: `playwright-bdd-step-definitions` (install with
  `mise run skill install` if missing from `.agents/skills/`).
- External references (read for rationale, do not add runners blindly):
  [Cucumber docs](https://cucumber.io/docs),
  [Serenity Screenplay](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals),
  [@cucumber/screenplay.js](https://github.com/cucumber/screenplay.js/).
- Do **not** add CodeceptJS unless T1.1 proves Playwright BDD cannot express a flow.
- If editing `mise.toml`, use the project mise guidance and validate
  `mise run test --help`.
- If touching Electrobun desktop/main/native behavior, read
  `.cursor/electrobun-skill-routing.md` and the routed Electrobun skills first.

Implementation order:
0. Complete Step 0 (worktree from `feat-add-stats-panel` → `feat-e2e-regression`).
1. Start with `tasks.md` Phase 1. Confirm exact BDD dependency versions (T1.1),
   publish fixture manifest (T1.5) and step catalog (T1.6), and retire legacy
   preview smoke (T1.0).
2. Implement the deterministic preview fixture before adding broad scenarios.
   The current preview e2e must not keep relying on real `~/.config/kb` state.
3. Add Playwright BDD and generated test wiring.
4. Review the canonical feature files in `assets/features/e2e/`; do not replace their
   product-level wording unless the SDD source specs prove a gap.
   Keep the guide text in `assets/guides/BDD_GUIDE.md` and
   `assets/guides/BDD_GHERKIN_GUIDE.md` consistent with that location.
5. Implement P0 smoke scenarios first:
   - app boot and seeded list
   - search and footer count
   - type/tag/task filter overlay
   - list/split/detail keyboard navigation
   - detail and primary action
6. Add P1 regression scenarios only after smoke is stable:
   - command palette
   - task management
   - settings
   - sync
   - frecency
7. Wire reporting and CI/pre-release commands last.
8. Score implemented scenarios with `design.md#quality-model`; a green command
   is not enough if the scenario score is below threshold.
9. Persist metrics with `design.md#metrics-registry` so future runs can compare
   against the reviewed release baseline.

Constraints:
- Do not add CodeceptJS in the first pass unless the dependency spike proves
  Playwright BDD cannot satisfy a required flow.
- Do not wire `@cucumber/screenplay`'s `ActorWorld` unless T1.1 proves Playwright
  BDD fixture compatibility; use local `e2e/screenplay/*` with `remember`/`recall`.
- Do not mutate the developer's real app config, DB, or sources.
- Do not keep release smoke scenarios that skip on empty data.
- Do not remove `@todo` from a scenario until it has automation and quality
  score evidence.
- Do not update `tools/metrics/baselines/e2e-quality/quality-baseline.json` as a side effect
  of an ordinary test run; move the baseline only after release/milestone
  review.
- Do not weaken Biome, knip, dependency-cruiser, ast-grep, ls-lint, jscpd,
  TypeScript strictness, or any quality-gate tool.
- Do not introduce `console.*` in `src/`.
- Every new TypeScript file must follow one artifact suffix:
  `.steps.ts`, `.ability.ts`, `.task.ts`, `.question.ts`,
  `.interaction.ts`, `.support.ts`, or an existing project suffix.

Validation expectations:
- After any `mise.toml` change: `bun run lint:mise` and `mise run test --help`.
- After dependency changes: `bun install --frozen-lockfile`.
- After e2e smoke implementation: `mise run test e2e --smoke`.
- After regression implementation: `mise run test e2e --regression`.
- Before final handoff:
  - `mise run app gates --quality`
  - `mise run test e2e --smoke`
  - `mise run test e2e --regression`
  - metrics comparison against
    `tools/metrics/baselines/e2e-quality/quality-baseline.json`, if the baseline exists
  - `git diff --check`

Task evidence:
For every checked task in `assets/docs/specs/e2e/tasks.md`, add an Evidence
bullet with changed files, commands run, and exact pass/fail status. Do not
bulk-check boxes without evidence.

Stop conditions:
- The preview harness cannot be made deterministic without changing production
  behavior beyond a narrow config-path test hook.
- A dependency requires a second test runner for P0 smoke.
- A scenario needs native Electrobun behavior that preview cannot represent;
  tag it `@native` and defer it to the native smoke phase.
- Any quality tool would need weakening; stop for maintainer approval.

Completion:
The work is complete when P0 smoke and P1 regression scenarios are automated,
commands are documented through mise, task evidence is recorded, scenario
quality scores meet `design.md#quality-model`, metrics are persisted and
compared through `design.md#metrics-registry`, and the final validation commands
above pass or have a precise blocker documented. Leave implementation commits on
`feat-e2e-regression` in `.worktrees/feat-e2e-regression` (or merged per Step 0).
```
