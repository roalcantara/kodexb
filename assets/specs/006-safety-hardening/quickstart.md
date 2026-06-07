# Quickstart: Safety Hardening (006)

## Security Gate for Maintainers

Run a full security sweep on a feature:
```bash
mise run spec security assets/specs/006-safety-hardening --strict
```

Run only on changed files (standard for local development):
```bash
mise run spec security --changed-only --strict
```

## Handoff Scrubbing for Operators

Generate a handoff with automatic scrubbing:
```bash
mise run spec handoff-generate --feature assets/specs/006-safety-hardening --focus gherkin
```
*If a secret or sensitive path is detected, the command will fail and report the violation.*

## Allowlisting Exemptions

If a feature legitimately needs to include a sensitive-looking string (e.g. a test fixture path), create an allowlist:
```yaml
# assets/specs/006-safety-hardening/handoff-allowlist.yml
entries:
  - "/Users/roalcantara/Work/bun/kb/tools/governance/security/fixtures/handoff/handoff.with_abs_path.md"
```
