# Data Model: Safety Hardening (006)

## Entities

### `SecurityFinding` (Governance Record)
- **id**: `string` (unique across run, e.g. `dep:malicious-package:bun.lock:45`)
- **severity**: `critical | high | medium | low`
- **file**: `string` (repo-relative path)
- **line**: `number | null`
- **rule**: `string` (rule ID from check)
- **message**: `string`

### `SecurityRunEvent` (NDJSON Observability)
- **ts**: `string` (ISO 8601)
- **phase**: `scan | handoff-scrub`
- **trigger**: `hk | gate | ci | handoff-emit`
- **findings**: `SecurityFinding[]` (Full set for traceability)
- **findings_count**: `number`
- **severity_max**: `SecuritySeverity | null`
- **exit_code**: `number`
- **duration_ms**: `number`
- **feature**: `string | null` (active feature slug)

### `HandoffAllowlist` (Security Exemption)
- **entries**: `string[]` (Literal strings only; no globs)

## Validation Rules
- **Result over Throw**: Malformed inputs (lockfiles, config files) MUST produce a `critical` finding and non-zero exit, not a crash.
- **Fail-Closed**: If a mandatory check file is missing, the scan MUST fail.
- **Deterministic ID**: Finding IDs must be reproducible across runs for the same violation.
- **Literal Allowlist**: Any entry in `handoff-allowlist.yml` containing `*`, `?`, or regex anchors SHALL be rejected as invalid.
