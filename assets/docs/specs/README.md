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

## Feature specs (index)

- [Entry Action Panel](entry-action-panel/design.md) — unified entry actions, Return / ⌘Return in list/split/detail, frecency via executor; [requirements](entry-action-panel/requirements.md), [tasks](entry-action-panel/tasks.md), [implementation plan](entry-action-panel/implementation-plan.md).
- [List frecency sort](list-frecency-sort/design.md) — Raycast-style entry ranking for list/split; visits on detail open + copy; [requirements](list-frecency-sort/requirements.md), [tasks](list-frecency-sort/tasks.md), [implementation plan](list-frecency-sort/implementation-plan.md).
- [Compact filter overlay rebuild](compact-filter-redesign/design.md) — single scrollport, fixed Close footer, highlight visibility; [tasks](compact-filter-redesign/tasks.md), [implementation plan](compact-filter-redesign/implementation-plan.md).
- [Command palette and filter UX](command-palette-filter-ux/design.md) — ⌘P / ⌘K; behaviour matrix in the **project root** [README.md](../../../README.md).

Also documented in [`CLAUDE.md`](../../../CLAUDE.md) (reference docs) and [`.agents/skills/kb-context/SKILL.md`](../../../.agents/skills/kb-context/SKILL.md).
