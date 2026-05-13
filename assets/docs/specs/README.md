<!-- markdownlint-disable-file -->

# kb — feature specs (canonical location)

All **product and feature specifications** for this repository live under:

**`assets/docs/specs/<feature-slug>/`**

Typical files per feature (use only what you need):

| File                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `requirements.md`        | EARS-style behavior and acceptance criteria    |
| `design.md`              | Normative technical contract                   |
| `tasks.md`               | Ordered verification work                      |
| `implementation-plan.md` | Agent-oriented step-by-step plan (optional)    |
| `*.html` or other assets | Prototypes and diagrams (optional, co-located) |

Foundation and roadmap:

- [`foundation/design.md`](foundation/design.md)
- [`foundation/requirements.md`](foundation/requirements.md)
- [`foundation/roadmap.md`](foundation/roadmap.md)

## Do not use `docs/superpowers/`

Some external skills default to `docs/superpowers/specs/` for brainstorm output. **kb does not commit there.** That path is listed in **`.gitignore`** so accidental files never enter the repo.

When an AI skill or template says to write under `docs/superpowers/`, **redirect** to `assets/docs/specs/<slug>/` instead (create the slug folder if needed).

Also documented in [`CLAUDE.md`](../../../CLAUDE.md) (reference docs) and [`.agents/skills/kb-context/SKILL.md`](../../../.agents/skills/kb-context/SKILL.md).
