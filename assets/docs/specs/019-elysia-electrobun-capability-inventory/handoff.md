<!-- markdownlint-disable-file -->
# Elysia and Electrobun capability inventory — Handoff prompt

Use this prompt to hand the research pass to another agent.

```md
You are taking over `assets/docs/specs/elysia-electrobun-capability-inventory/`.

Goal:
Create a decision-neutral inventory of Elysia and Electrobun capabilities so
maintainers can later classify each item as `MUST-HAVE`, `NICE-TO-HAVE`,
`POSTPONED`, or `MEH`.

Important:
You are doing research and documentation only. Do not implement code, add
dependencies, change runtime behavior, or make final priority decisions.

Required context:
- Read `.agents/skills/app-context/SKILL.md`.
- Read `.agents/skills/app-rpc/SKILL.md`.
- Read `.agents/skills/electrobun-best-practices/SKILL.md`.
- Read `.cursor/electrobun-skill-routing.md`.
- Use `docs-writer`.
- Use `subagent-driven-development`.
- Use `elysia` or `elysiajs` as an upstream reference only; app rules override
  generic Elysia scaffolding advice.
- Read:
  - `assets/docs/specs/elysia-electrobun-capability-inventory/requirements.md`
  - `assets/docs/specs/elysia-electrobun-capability-inventory/design.md`
  - `assets/docs/specs/elysia-electrobun-capability-inventory/tasks.md`
  - `assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml`

Workflow:
1. Execute `tasks.md` phase by phase.
2. Use subagents for bounded research slices:
   - one Elysia documentation inventory subagent;
   - one Electrobun documentation inventory subagent;
   - one local app usage comparison subagent.
3. Merge all findings into `inventory.yml`.
4. Keep every capability at `priority: undecided`.
5. Set `current_usage.status: used` only when local repo evidence proves app
   fully uses the capability.
6. Render `DONE` as `✔` in `report.md` when `current_usage.status` is `used`;
   leave it empty for all other statuses.
7. Add project-specific `pros`, `cons`, `risks`, `prerequisites`, and
   `candidate_stories`.
8. Put strong priority hints under `priority_signals`, not in `priority`.
9. Update the task ledger with evidence and verification.

Research sources:
- Elysia root: `https://elysiajs.com/`
- Elysia LLM bundle when available:
  - `https://elysiajs.com/llms.txt`
  - `https://elysiajs.com/llms-full.txt`
- Electrobun docs: `https://blackboard.sh/electrobun/docs/`

Local comparison sources:
- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-rpc/SKILL.md`
- `.agents/skills/electrobun-best-practices/SKILL.md`
- `.cursor/electrobun-skill-routing.md`
- `assets/catalog/SKILLS.yaml`
- `assets/guides/ELECTROBUN.md`
- `src/shell/main/rpc/`
- `src/shell/renderer/rpc/`
- `src/shell/main/`
- `tools/preview/server.script.ts`

Validation:
Run exactly:

```sh
ruby -e "require 'yaml'; YAML.load_file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml')"
git diff --check -- assets/docs/specs/elysia-electrobun-capability-inventory
```

If Ruby is unavailable, use another available YAML parser and record the
replacement command in `tasks.md`. If the repository later adds a generic spec
validation mise task, run it after these checks and record the result.

Stop and report if:
- an upstream source is unreachable;
- a scrape or local search becomes unexpectedly slow;
- a subagent starts making implementation changes;
- deciding a priority would require maintainer judgment;
- local evidence is too ambiguous to set `current_usage.status: used`;
- validation fails for reasons unrelated to this research.

Completion:
The handoff is complete only when:
- `inventory.yml` contains populated capability entries;
- every capability has `priority: undecided`;
- `report.md` contains the rendered table with `DONE`, `Pros`, and `Cons`;
- candidate stories are present where value is plausible;
- `tasks.md` records verification evidence;
- maintainers can classify priorities without another scrape.
```
