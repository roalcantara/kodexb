# Contract: Handoff Scrub

## Interface: `spec handoff-scrub` CLI
- **Entry point**: `tools/governance/security/handoff_scrub.script.ts`
- **Command**: `mise run spec handoff-scrub --feature <dir> --body <body>`

### Inputs
- **`--feature <dir>`**: Directory of the feature being handed off (for allowlist lookup).
- **`--body <body>`**: The rendered handoff prompt string.

### Outputs
- **Stdout**: None on success.
- **Stderr**: `HandoffScrubError` message on hit.
- **Exit Code**:
  - `0`: Success (clean prompt).
  - `1`: Failure (scrub violation detected).
  - `2`: Usage error / allowlist validation error.

### Error Format
- **Message**: `handoff scrub failed ([rule-id]) at byte [n]: <redacted>`

### Observability
- **Event**: Appends to `tmp/security/<YYYY-MM-DD>/scrub.ndjson`.
- **Schema**: Aligned to `SecurityRunEvent` in `data-model.md`.
