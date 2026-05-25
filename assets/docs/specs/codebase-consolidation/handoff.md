<!-- markdownlint-disable-file -->

# Codebase consolidation — Handoff prompt

Use this prompt to hand the implementation to another agent.

```md
You are taking over `assets/docs/specs/codebase-consolidation/`.

Goal:
Reduce file count, eliminate duplicate constants, and move pure domain
logic into `src/core/` — without changing user-visible behaviour and
without weakening any quality tool. Ship as six commits, one per
track A–F, on the integration branch `feat-add-stats-panel`.

Required reading (in this order):
- `CLAUDE.md` (project guardrails).
- `assets/docs/specs/codebase-consolidation/report.md` (findings + metrics).
- `assets/docs/specs/codebase-consolidation/requirements.md` (EARS).
- `assets/docs/specs/codebase-consolidation/design.md` (target shape).
- `assets/docs/specs/codebase-consolidation/tasks.md` (execute these).
- `assets/guides/CODESTYLE_GUIDE.md` (naming, FCIS layout).
- `assets/guides/TESTING_GUIDE.md` (Better Specs, no-mock rule).
- `assets/guides/FCIS.guide.md` (pure-core / imperative-shell rules).
- `assets/guides/DoD.md` (Definition of Done).
- `assets/guides/GIT_COMMITS_GUIDE.md` (Conventional Commits, ≤ 50-char subject).
- `.agents/skills/kb-context/SKILL.md`.
- `.agents/skills/kb-quality-gate/SKILL.md`.
- `.agents/skills/kb-testing/SKILL.md`.

Required skills:
- Use `subagent-driven-development` for the orchestration loop.
- Use `kb-context` always.
- Use `kb-quality-gate` before each track commit.
- Use `kb-testing` for spec moves and merges.
- Use `systematic-debugging` if a track's tests go unexpectedly red.
- Use `solid-principles` and `dry-principle` when judging whether a
  merge in Track D needs further splitting.
- Use `receiving-code-review` when applying reviewer feedback.

Workflow:
1. Read every doc listed above before touching any code.
2. Execute Phase 0 of `tasks.md` (baseline). If the baseline is red,
   stop and report; do not start consolidation work on a broken tree.
3. For each track A → B → C → E → D → F (the order in `tasks.md`):
   a. Dispatch one implementer subagent scoped to that track only.
   b. Hand the subagent the full track section from `tasks.md` plus
      this handoff's "Subagent rules" block below.
   c. Tick checkboxes in `tasks.md` as the subagent completes each
      sub-step. Do this incrementally so progress is visible.
   d. Run the track's "Track close" verification commands.
   e. Update the track's "Verification" line in `tasks.md` with the
      actual command output (commit SHA + key counts).
   f. Run `bash .agents/skills/kb-quality-gate/scripts/gate.sh`.
   g. Run a spec-compliance review with a fresh subagent (no shared
      context with the implementer).
   h. Run a code-quality review with another fresh subagent.
   i. Commit with the suggested message from `tasks.md`.
   j. Confirm `git log --oneline` shows the expected number of commits
      so far. Only then move to the next track.
4. After Track F, run the closing block:

   ```sh
   bun test
   bun run typecheck
   bun run lint
   bun run build
   git diff --check
   bash .agents/skills/kb-quality-gate/scripts/gate.sh
   ```

   Record the result in `tasks.md` Phase F "Verification".

Subagent rules (paste into every implementer subagent prompt):
- Stick to ONE track. Do not preview later tracks.
- Do not invent file paths or symbol names. Every file path is
  literally written in `tasks.md` or `design.md` — copy them verbatim.
- Do not change export names, signatures, or behaviour. Track D and
  Track A explicitly preserve identifiers.
- Do not introduce new abstractions ("while I'm here") — this spec is
  consolidation, not feature work.
- Do not add Biome suppressions or relax any quality-tool config (R12).
  If a tool blocks you, stop and report instead.
- Do not skip co-located specs. R14 requires every moved file's spec
  to move with it; merged specs land next to the merged util.
- After each `git mv` group, run the matching `bun test <folder>` to
  catch broken imports immediately.
- Use `mise run validate ...` if the project provides a phase-specific
  validator; otherwise the commands in `tasks.md` are authoritative.

Important constraints:
- ONE commit per track. Six commits total.
- Conventional Commits, ≤ 50-char subject. Suggested subjects live in
  each track's "Track <X> commit" block in `tasks.md`.
- Do not amend a previous track's commit. If a previous track needs a
  fix, add a new commit at the end and document it in `tasks.md`.
- Do not push to `origin` unless explicitly asked by the human.
- Do not start the next track until the current track is verified,
  reviewed, and committed.

Stop and report if:
- The baseline (Phase 0) is red.
- An acceptance command in a track returns an unexpected value.
- A test suite that was green at baseline goes red and the cause is
  not an import-path update covered by the spec.
- `bun run build` cannot run in your environment (sandbox limitation).
- A file move would require a Biome / knip / dependency-cruiser /
  ls-lint / jscpd / ast-grep config change to keep the gate green.
- A pure-domain symbol turns out to have a hidden I/O dependency
  (e.g. silently reading `process.env`).
- A track's diff exceeds expectations by more than ~50% in line count
  or touched files.

When stopping, report in chat / PR:
- The exact command or task ID (e.g. `T D.4`).
- The actual vs. expected output of the failing acceptance command.
- Elapsed time if slowness is involved.
- Suspected cause.
- Proposed smallest split or deferral.

Track-by-track checkpoints (mirror these in PR description):
- Track A — domain logic in `src/core/`; pure-domain `.util.ts` count
  in `src/shell/app/lib/` = 0.
- Track B — `'◆'` literal count in src (excl. specs) = 1;
  `.catch(() => undefined)` count = 0;
  `queueMicrotask|requestAnimationFrame` count in
  `list_main.component.tsx` = 0.
- Track C — `use_compact_filter_overlay_focus.hook.ts` and
  `use_compact_filter_overlay_scroll.hook.ts` deleted.
- Track E — `.util.ts` count under `src/shell/renderer/components/` = 0.
- Track D — non-spec `.util.ts` count under
  `src/shell/renderer/utils/list/` = 7.
- Track F — `ReturnType<typeof useListPageData>` removed from
  `list_page_state.util.ts`.

Completion:
The work is complete only when:
- every checkbox in `tasks.md` is ticked;
- every track's "Verification" line carries a real commit SHA and the
  measured acceptance numbers;
- `bun test`, `bun run typecheck`, `bun run lint`, `bun run build`,
  and `bash .agents/skills/kb-quality-gate/scripts/gate.sh` all pass;
- `git log --oneline feat-add-stats-panel..HEAD` shows exactly six
  commits, in order A → B → C → E → D → F;
- the closure metrics in `report.md` match the actual repo state.
```
