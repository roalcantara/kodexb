# Cursor hooks

Project-level hooks for Cursor agent sessions. Configured in [`.cursor/hooks.json`](../hooks.json).

## Governance Audit

Adapted from [github/awesome-copilot `hooks/governance-audit`](https://github.com/github/awesome-copilot/tree/main/hooks/governance-audit) for **Cursor** (Bun TypeScript, not Copilot bash).

### Behavior

- **Threat detection** on `beforeSubmitPrompt`: data exfiltration, privilege escalation, system destruction, prompt injection, credential exposure
- **Governance levels**: `open`, `standard`, `strict`, `locked`
- **Audit trail**: append-only NDJSON at `tmp/agent-governance/audit.ndjson` (gitignored via `tmp/`)
- **Session summary** on `sessionEnd` with per-session threat counts

Full prompts are **never** logged — only matched pattern snippets (max 80 chars) and metadata.

### Hooks

| Cursor event         | Script                              |
| -------------------- | ----------------------------------- |
| `sessionStart`       | `governance_audit.session_start.ts` |
| `sessionEnd`         | `governance_audit.session_end.ts`   |
| `beforeSubmitPrompt` | `governance_audit.prompt.ts`        |

Runs alongside `electrobun_session_start.ts` on `sessionStart`.

### Configuration

Set environment variables before launching Cursor (shell profile, `direnv`, etc.):

| Variable                   | Values                                 | Default                | Description                       |
| -------------------------- | -------------------------------------- | ---------------------- | --------------------------------- |
| `GOVERNANCE_LEVEL`         | `open`, `standard`, `strict`, `locked` | `standard`             | Blocking behavior                 |
| `BLOCK_ON_THREAT`          | `true`, `false`                        | `false`                | Block threats at `standard` level |
| `SKIP_GOVERNANCE_AUDIT`    | `true`                                 | unset                  | Disable audit entirely            |
| `GOVERNANCE_AUDIT_LOG_DIR` | path                                   | `tmp/agent-governance` | Log directory override            |

| Level               | Behavior                               |
| ------------------- | -------------------------------------- |
| `open`              | Log only, never block                  |
| `standard`          | Log; block when `BLOCK_ON_THREAT=true` |
| `strict` / `locked` | Log and block all detected threats     |

Blocking uses Cursor's `beforeSubmitPrompt` response: `{ "continue": false, "user_message": "..." }`.

### Log format

```json
{"timestamp":"2026-06-03T12:00:00Z","event":"session_start","session_id":"…","governance_level":"standard","cwd":"/path/to/kb"}
{"timestamp":"2026-06-03T12:01:00Z","event":"prompt_scanned","governance_level":"standard","status":"clean"}
{"timestamp":"2026-06-03T12:02:00Z","event":"threat_detected","threat_count":1,"threats":[{"category":"privilege_escalation","severity":0.8,"description":"Elevated privileges","evidence":"sudo"}]}
{"timestamp":"2026-06-03T12:15:00Z","event":"session_end","total_events":12,"threats_detected":1}
```

### Tests

```bash
mise run hooks governance-audit
```

Runs `bun test --config /dev/null .cursor/hooks/governance_audit.core.spec.ts` (isolated from the repo root `bunfig.toml`).

Related skill: `.agents/skills/agent-governance/SKILL.md`.
