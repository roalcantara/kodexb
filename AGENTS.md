<!-- markdownlint-disable-file -->
# Agent notes (kb)

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

---

## Electrobun

This app uses **Electrobun**. Cursor skills are installed under
`$HOME/.agents/skills/` (see symlinks like `electrobun-rpc`).

- **Routing table (which skill when):** [`.cursor/electrobun-skill-routing.md`](.cursor/electrobun-skill-routing.md)
- **Standing instruction for the agent:** [`.cursor/rules/electrobun-skills.mdc`](.cursor/rules/electrobun-skills.mdc) (`alwaysApply`)

At the start of work that might touch the desktop stack, **read the routing file**, then **Read** the relevant `SKILL.md` paths—do not guess Electrobun APIs.

Optional: a **sessionStart** hook in [`.cursor/hooks.json`](.cursor/hooks.json) runs [`.cursor/hooks/electrobun_session_start.ts`](.cursor/hooks/electrobun_session_start.ts) to inject the same routing text when Cursor applies `additional_context` (if it does not appear, rely on the rule above).

Repo docs: `assets/guides/ELECTROBUN.md`, `assets/docs/specs/foundation/design.md`. Feature specs: `assets/docs/specs/README.md` (never `docs/superpowers/` — gitignored).
