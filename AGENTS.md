<!-- markdownlint-disable-file -->
# Agent notes (kb)

## 🚨 Architecture Doctrine (MANDATORY)

Before performing ANY code generation, refactor, or file modification, the agent MUST:

1. Read and apply:
   - `assets/docs/specs/architecture_doctrine/design.md`
2. Invoke the skill:
   - `architecture-doctrine-enforcer`

### Required Execution Flow

```txt
Claude → Doctrine Enforcer → Feature Skill → Code → Tooling
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
Architecture Doctrine > Skills > Implementation
```

This rule overrides ALL other instructions.

---

## Electrobun

This app uses **Electrobun**. Cursor skills are installed under
`$HOME/.config/cursor/skills/` (see symlinks like `electrobun-rpc`).

- **Routing table (which skill when):** [`.cursor/electrobun-skill-routing.md`](.cursor/electrobun-skill-routing.md)
- **Standing instruction for the agent:** [`.cursor/rules/electrobun-skills.mdc`](.cursor/rules/electrobun-skills.mdc) (`alwaysApply`)

At the start of work that might touch the desktop stack, **read the routing file**, then **Read** the relevant `SKILL.md` paths—do not guess Electrobun APIs.

⚠️ BEFORE applying any Electrobun skill, you MUST first apply the Architecture Doctrine above.

Optional: a **sessionStart** hook in [`.cursor/hooks.json`](.cursor/hooks.json) runs [`.cursor/hooks/electrobun_session_start.ts`](.cursor/hooks/electrobun_session_start.ts) to inject the same routing text when Cursor applies `additional_context` (if it does not appear, rely on the rule above).

**Manual fallback:** in chat, run slash command **`/electrobun-skills`** ([`.cursor/commands/electrobun-skills.md`](.cursor/commands/electrobun-skills.md)) so `@`-references pull in the rule + routing doc and the agent re-runs the skill-selection steps.

Repo docs: `assets/guides/ELECTROBUN.md`, `assets/docs/design.md`.
