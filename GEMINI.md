<!-- markdownlint-disable-file -->
# KB Gemini CLI instructions

Follow `AGENTS.md` as the primary project instruction file. Project skills and
quality gates take priority over generic agent defaults.

## Code review graph

Follow the canonical CRG query-first workflow and daemon/HK hook policy in
[`AGENTS.md`](AGENTS.md#code-review-graph). Use the repo MCP server from
`.gemini/settings.json`; run `code-review-graph update --skip-flows` when
coverage appears stale.
