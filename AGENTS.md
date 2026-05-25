<!-- markdownlint-disable-file -->
# Agent notes

## 🚨 Process

Before performing ANY code generation, refactor, or file modification, the agent MUST follow:

### Required Execution Flow

```txt
Claude → Feature Skill → Code → Tooling
```

### Forbidden Flow

```txt
Claude → Feature Skill → Code → Fix later ❌
```

### Non-Negotiable Rules

- Every file MUST have exactly ONE artifact type
- File naming MUST follow `<name>.<artifact>.ts`
- Folder does NOT define type — suffix does
- No mixed responsibilities (NO god files)

If any of the above cannot be satisfied:

→ STOP and request clarification

### Priority Order

```txt
Skills > Implementation
```

This rule overrides ALL other instructions.

### Skill routing ledger

- The project skill registry and adoption rationale live in
  **`assets/guides/SKILLS.md`**.
- The structured source of truth for skill automation lives in
  **`assets/guides/SKILLS.yml`**.
- **`mise run skill install`** restores Skills CLI-managed project skills from
  `skills-lock.json` into `.agents/skills/`.
- **`mise run skill sync`** rewrites generated routing snippets from the YAML
  registry.
- Optional global companions named in the guide remain under
  `$HOME/.agents/skills/` unless `assets/guides/SKILLS.yml` marks them as
  `location: project` or `location: owned`.

### Superpowers skill adaptation

- When a Superpowers skill mentions `docs/superpowers/specs` or
  `docs/superpowers/plans`, use the `spec-driven-development` skill shape
  instead and map the output to **`assets/docs/specs/<scope>/`** in this repo.
  Use `requirements.md`, `design.md`, `tasks.md`, and optional `handoff.md`.
- **Do not create `docs/superpowers/`**. That path is an external skill
  default and is gitignored here to prevent drift.
- For tests, project rules override generic Superpowers examples: follow
  `assets/guides/TESTING_GUIDE.md`, use `bun:test`, prefer `it(...)`, and
  follow the repo's Better Specs and Fishery guidance.
- For completion, use the phase-specific `mise run validate ...` command when
  one is provided; otherwise run
  `bash .agents/skills/app-quality-gate/scripts/gate.sh`. Generic examples such
  as `npm test` are not sufficient.
- Subagent prompts must include these project overrides explicitly because
  subagents may not inherit the controller's full context.

### Lint and quality tools

- **Do not weaken** the repo quality stack (Biome, knip, dependency-cruiser, ast-grep, ls-lint, jscpd, `tsc` strictness, and any other tool run by the quality gate) unless a **maintainer explicitly approves** the change in the PR (for example: `APPROVED: <tool> <change> because <reason>`).
- Prefer **code fixes** (refactors, correct types, smaller modules) over new ignore comments, overrides, or threshold bumps.
- Full audit workflow and inventory: `assets/docs/specs/codebase-quality-audit/`.

### Cursor commit commands (`/commit-all`, `/commit-staged`, `/commit-fixup`)

Canonical instructions live under **`.cursor/commands/`** (same names as the Cursor slash commands). Summary:

1. **Quality gate before `git commit`**
   Run **`bash .agents/skills/app-quality-gate/scripts/gate.sh`** on the tree you are about to record. **HK commit-message policy** (commit message only) is **not** a substitute for the gate.

2. **`/commit-all`** — Split the working tree into atomic chunks; for **each** chunk: `git add` the chunk → **gate** → `git commit` → **HK commit-message policy** the new message (see command file for stash `--keep-index` when other unstaged chunks would fail the gate).

3. **`/commit-staged`** — One commit from the **current index**; **gate** → `git commit` → **HK commit-message policy**. Use **`git stash push --keep-index`** when unstaged files would fail the gate or confuse checks.

4. **`/commit-fixup`** — If **`HEAD`** is red: fix issues, run **`gate.sh` until green** on the tree you will amend, **`git commit --amend`** (fold fixups; use **`--no-edit`** unless rewording), **HK commit-message policy** the message. **Do not** run the gate again **after** a successful amend when the tree matches **`HEAD`**. **Do not amend** commits that are already the remote tip unless the user explicitly approves rewriting published history (see command file).

5. **Messages** — Follow **`assets/guides/GIT_COMMITS_GUIDE.md`** and **`hk.pkl`** + `tools/hooks/commit_message.script.ts` (subject length, body rules, allowed types).

6. **IDE / inline AI** — Cursor’s **Generate Commit Message** (and similar) does not run the HK commit-message policy. Prefer **hooks** (below) for enforcement; when asking the **chat agent** for a message, load or follow **`.cursor/rules/hk-commit-messages.mdc`** so the draft matches `hk.pkl` + `tools/hooks/commit_message.script.ts` on first try.

### Electrobun best practices (always)

- For `electrobun.config.ts`, `src/shell/main/`, RPC between processes, windows, build, or distribution: read **`.agents/skills/electrobun-best-practices/SKILL.md`** and **`.cursor/electrobun-skill-routing.md`**, then the narrower Electrobun skills they point to—**do not** invent Electrobun APIs or security posture from memory.

### Prototype gate (when a prototype is requested)

If the user asks for a **prototype** or equivalent (mock UI, static HTML preview, design spike, “show before we build”, wireframe in code), the agent MUST follow:

```txt
Prototype → explicit user approval → Feature Skill → Code → Tooling
```

Until the user explicitly approves the prototype (for example: **`PROTOTYPE APPROVED: implement`** or a clear “approved — implement now”):

- Deliver the prototype only (load `brainstorming` when the work is creative or ambiguous).
- **Do not** add or change production feature code under `src/` for that work (bugfixes or unrelated tasks the user labels separately are not blocked by this gate).

If the user later asks for implementation in the same thread without an approval line, **stop** and confirm whether the prototype is approved or whether they are canceling the prototype-first path.

---

## Electrobun

This app uses **Electrobun**. Cursor skills are installed under
`$HOME/.agents/skills/`. Project-authored skills and Skills CLI-managed
project skills live under **`.agents/skills/`**.

- **Routing table (which skill when):** [`.cursor/electrobun-skill-routing.md`](.cursor/electrobun-skill-routing.md)
- **Standing instruction for the agent:** [`.cursor/rules/electrobun-skills.mdc`](.cursor/rules/electrobun-skills.mdc) (`alwaysApply`)
- **Best-practices baseline:** [`.agents/skills/electrobun-best-practices/SKILL.md`](.agents/skills/electrobun-best-practices/SKILL.md) — load for desktop/config work in addition to the routed skill.
- **Skill adoption ledger:** [`assets/guides/SKILLS.md`](assets/guides/SKILLS.md)

At the start of work that might touch the desktop stack, **read the routing file**, then **Read** the relevant `SKILL.md` paths—do not guess Electrobun APIs.

Optional: a **sessionStart** hook in [`.cursor/hooks.json`](.cursor/hooks.json) runs [`.cursor/hooks/electrobun_session_start.ts`](.cursor/hooks/electrobun_session_start.ts) to inject the same routing text when Cursor applies `additional_context` (if it does not appear, rely on the rule above).

Repo docs: `assets/guides/ELECTROBUN.md`, `assets/docs/specs/foundation/design.md`. Feature specs: `assets/docs/specs/README.md` (never `docs/superpowers/` — gitignored).
