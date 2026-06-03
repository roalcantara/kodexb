<!-- markdownlint-disable-file -->

# Codebase quality audit — Requirements

## OVERVIEW

This effort inventories and removes **Biome suppressions** (`biome-ignore`, `biome-ignore-all`) and other **linter or architecture bypasses** across app, using **refactors and in-file fixes first**. Implementation commits live in **one** clone of the repo (no mixed edits across a second worktree for the same effort). Use an integration branch agreed with maintainers (for example `feat-add-stats-panel` or a dedicated `chore/*` branch off it).

**Non-goal:** Weakening **any** repo quality tool (linters, architecture scanners, duplication thresholds, strict TypeScript for app code, and so on) without maintainer sign-off, per R6.

## REQUIREMENTS

### R1 — Single clone and merge base

**The system SHALL** keep all audit-related commits in **one** working copy of the repository. **The system SHALL** keep the audit branch rebased or merged with the agreed integration branch (for example `feat-add-stats-panel`) until the audit merges.

### R2 — Zero suppressions target

**The system SHALL** drive **TypeScript and TSX source** under `src/`, `tools/` (excluding vendored third-party if any), `electrobun.config.ts`, and root config files checked by Biome to **zero** `biome-ignore` / `biome-ignore-all`, unless an item is listed in the **Allowlist** section of `design.md` with maintainer-approved rationale.

### R3 — Quality gate

**For every PR** opened from the audit work, **the system SHALL** pass the app quality gate: `bash .agents/skills/app-quality-gate/scripts/gate.sh` (or equivalent stages: `bun run lint:fix`, `bun run lint`, `bun test` per DoD).

### R4 — No behavior drift

**The system SHALL NOT** change user-visible behavior except where a change is required to satisfy a lint rule and is covered by existing or new tests documenting the same observable contract.

### R5 — Broader hygiene

**The system SHALL** record in the audit report the outcome of checks for: forbidden FCIS imports (dependency-cruiser), knip unused exports, raw `console.*` outside `@shared/logging`, and absence of forbidden stack dependencies (Zod, Drizzle) per `CLAUDE.md`.

### R6 — No silent weakening of quality tools

**The system SHALL NOT** merge any audit PR that **weakens** enforcement of the app quality stack **unless** a maintainer has given **explicit written approval** in that PR thread. Weakening includes, without limitation: new or broadened `biome.json` `overrides` or rule `off` / lower severity; new `biome-ignore` / `biome-ignore-all`; knip `ignore*` / `ignoreDependencies` / `ignoreBinaries` expansions that hide real issues; dependency-cruiser exceptions beyond documented policy; ast-grep or ls-lint config relaxations; higher jscpd thresholds; or narrowed `tsc` strictness for production `src/`. Use a comment such as `APPROVED: <tool> <change> because <reason>`. Default resolution: **code** (rename, split, types, wrappers), not config.

### R7 — Electrobun best practices

**The system SHALL** apply **electrobun-best-practices** (read `.agents/skills/electrobun-best-practices/SKILL.md` and follow `.cursor/electrobun-skill-routing.md`) for all changes touching `electrobun.config.ts`, `src/shell/main/`, native window lifecycle, RPC wiring, build, or distribution—**no** guessed Electrobun APIs or ad-hoc patterns that contradict that skill.

## ACCEPTANCE

- **A1:** `design.md` contains a complete inventory table of every suppression found at audit start (path, rule, line, current rationale, planned resolution).
- **A2:** `tasks.md` lists ordered PR-sized tasks with verification steps; each completed task updates the inventory status.
- **A3:** Final branch state: `rg 'biome-ignore' --glob '*.{ts,tsx}'` over in-scope paths returns **no matches**, or only matches inside `design.md` allowlist rows that explicitly permit a remaining exception (target is zero allowlist rows).
- **A4:** Quality gate passes on the final audit PR.
- **A5:** No audit PR contains tool-weakening diffs (per R6) without a linked maintainer approval comment on that PR.
- **A6:** Audit PRs that touch Electrobun surfaces cite adherence to **electrobun-best-practices** in the PR description or checklist (R7).
