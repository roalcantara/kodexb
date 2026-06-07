# Contract: Safety Hardening

## Interface: `spec security` CLI
- **Entry point**: `tools/governance/security/scan.script.ts`
- **Command**: `mise run spec security [--strict] [--changed-only] [--base <sha>] [--json]`

### Behavior
- **Raw Secrets**: Delegated to `hk` Gitleaks builtin.
- **Dependencies**: Scans `bun.lock` deltas against `cve.list.yml`.
- **Electrobun**: Enforces `sandbox: true`, `partition`, and non-wildcard `navigation` in `electrobun.config.ts`.
- **Observability**: Appends one `SecurityRunEvent` line to `tmp/security/<YYYY-MM-DD>/scan.ndjson`.

## Interface: `spec ready` CLI
- **Entry point**: `tools/bin/spec.script.ts`
- **Command**: `mise run spec ready <feature_dir> --key <catalog_key>`

### Consolidates:
1. `mise run test tag <key>` (Requirement verification)
2. `mise run catalog validate --raw` (Registry health)
3. `hk check --profile commit` (Hygiene + Gitleaks)
4. `mise run spec gate <dir>` (Spec quality + security subgate)

## Interface: `spec handoff-scrub` CLI
- **Entry point**: `tools/governance/security/handoff_scrub.script.ts`
- **Command**: `mise run spec handoff-scrub --feature <dir> --body <body>`

### Error Format
- **HandoffScrubError**: `HandoffScrubViolation: [rule] at offset [n]. Excerpt: [redacted]`
