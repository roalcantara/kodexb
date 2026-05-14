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
`$HOME/.agents/skills/` (see symlinks like `electrobun-rpc`).

- **Routing table (which skill when):** [`.cursor/electrobun-skill-routing.md`](.cursor/electrobun-skill-routing.md)
- **Standing instruction for the agent:** [`.cursor/rules/electrobun-skills.mdc`](.cursor/rules/electrobun-skills.mdc) (`alwaysApply`)

At the start of work that might touch the desktop stack, **read the routing file**, then **Read** the relevant `SKILL.md` paths—do not guess Electrobun APIs.

Optional: a **sessionStart** hook in [`.cursor/hooks.json`](.cursor/hooks.json) runs [`.cursor/hooks/electrobun_session_start.ts`](.cursor/hooks/electrobun_session_start.ts) to inject the same routing text when Cursor applies `additional_context` (if it does not appear, rely on the rule above).

Repo docs: `assets/guides/ELECTROBUN.md`, `assets/docs/specs/foundation/design.md`. Feature specs: `assets/docs/specs/README.md` (never `docs/superpowers/` — gitignored).
