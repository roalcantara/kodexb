<!-- markdownlint-disable-file -->

# Handoff — `006-safety-hardening`

**Spec:** `assets/specs/006-safety-hardening/`
**Branch:** `feat/006-safety-hardening`
**Release:** v0.14.0 target

## Agent prompt

```text
Implement spec 006-safety-hardening with deterministic behavior only.
Read spec.md (SH-1..SH-11), plan.md (technical context + structure),
and tasks.md (Phase 1..14 execution order).

Required scope:
  - Implement `mise run spec security` with project-specific checks:
    1) dependency delta + optional bun audit parse,
    2) Electrobun surface policy AST check (Principle IX).
  - Integrate industry-standard Gitleaks via `hk` builtin for raw secrets.
  - Implement `spec handoff-scrub` and integrate it into handoff_generate
    before file write and dispatch.
  - Implement `spec ready` to consolidate all verification steps.
  - Emit `security_run` events under tmp/security with atomic writes
    and bounded retention.
  - Wire hk pre-commit + review workflow security invocation.
  - Update constitution/workflow docs to bind executable security checks.

Do not introduce probabilistic classifiers. Keep TypeBox-only validation.

Before done, run:
  mise run spec ready assets/specs/006-safety-hardening --key safety_hardening
```

## Acceptance criteria tracker

| ID | Done when | Evidence |
| --- | --- | --- |
| SH-1 AC1 | Gitleaks builtin in `hk` blocks commits containing secrets | `mise run hk check --profile commit` |
| SH-2 AC1 | Dependency checker parses lockfile delta and matches | `bun test ./tools/governance/security/checks/dependencies.script.spec.ts` |
| SH-3 AC1 | Electrobun surface policy enforced via AST | `bun test ./tools/governance/security/checks/electrobun_surface.script.spec.ts` |
| SH-4 AC1 | Handoff scrub blocks unsafe prompt bodies | `bun test ./tools/governance/security/handoff_scrub.script.spec.ts` |
| SH-5 AC1 | Allowlist schema is TypeBox-validated and literal-only | `bun test ./tools/governance/security/handoff_scrub.script.spec.ts` |
| SH-6 AC1 | spec gate includes strict security step | `bun test ./tools/governance/specs/audit.script.spec.ts` |
| SH-7 AC1 | hk and CI enforce security subgate | `mise run hk check --profile commit` |
| SH-8 AC1 | security_run events emitted with retention | `bun test ./tools/governance/security/scan.script.spec.ts` |
| SH-9 AC1 | Existing deterministic gate semantics are not weakened | `mise run spec ready assets/specs/001-sync-frecency-persistence` |
| SH-10 AC1 | Constitution and workflow guide bind Principle IX | `mise run spec lint assets/specs/006-safety-hardening --strict` |
| SH-11 AC1 | Performance monitor detects 25% regressions in CI | `bun ./tools/governance/security/perf/secrets_perf.script.ts` |

## Operator markers

Create these marker files as phases complete:

- `checklists/analyze-plan.md`
- `checklists/analyze-tasks.md`
- `checklists/implement-done.md`

## Delivery notes

- Keep implementation incremental by story checkpoints in tasks.md.
- Preserve deterministic CLI behavior and stable exit code semantics.
- Use `mise run spec ready` for final verification.
