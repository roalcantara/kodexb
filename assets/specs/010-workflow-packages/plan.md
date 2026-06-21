<!-- markdownlint-disable-file -->

# Plan — `010-workflow-packages`

**Spec:** [`spec.md`](./spec.md) — WEP-1 … WEP-9.
**Predecessor:** [`009`](../009-agentic-workflow-orchestrator/) merged on `main`.
**Successor:** [`011-mise-sdd-cli`](../011-mise-sdd-cli/) — mise CLI (blocked on 010).

**Delivery:** **one PR**, `feature/010-workflow-packages`.

---

## Summary

1. Promote L1/L2 workflow code to `@kb/workflow-core` and `@kb/workflow-runtime`.
2. Complete kb `default.yaml` SDD bindings (PROFILE-SDD-01).
3. Wire orchestrator smoke (SMOKE-01) for nightly/CI.
4. Keep kb-only governance lints outside packages.

**Not in 010:** mise task tree, `task_runner`, `spec test` — see [`011` plan](../011-mise-sdd-cli/plan.md).

---

## Package boundary

| Package                | Owns                                                                                            | Must not import          |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| `@kb/workflow-core`    | schemas, machine, evidence, intervention, snapshot, pure sandbox policy                         | spawn, toolchain strings |
| `@kb/workflow-runtime` | orchestrator, invokers, persistence, profile_loader, memory, retro, providers, sandbox dispatch | `src/shell/**`, renderer |

```text
packages/workflow-core/src/     ← schemas/, machine, evidence, intervention, snapshot, sandbox_policy
packages/workflow-runtime/src/  ← orchestrator, invokers, persistence, profile_loader, memory, …
tools/governance/specs/workflow/ ← kb CLI seams + re-exports + conformance + profile_guide_crossref
```

Co-located `*.spec.ts` move with modules. Update root `package.json` workspaces + `tsconfig` paths.

---

## PROFILE-SDD-01 (WEP-6)

Extend [`default.yaml`](../../catalog/workflows/default.yaml) so each SDD stage has evidence and/or triggers aligned with [`orchestrated_handoff.script.ts`](../../../packages/workflow-runtime/src/orchestrated_handoff.script.ts) `detectPhase()` order:

| Stage            | Binding intent                                  |
| ---------------- | ----------------------------------------------- |
| specify          | `spec lint` + `spec gate` (already partial)     |
| plan             | worker / advisory (no stub `command:` required) |
| analyze-plan     | worker                                          |
| tasks            | worker                                          |
| analyze-tasks    | worker                                          |
| handoff-generate | `mise run spec handoff-generate` post trigger   |
| implement        | sandbox + worker; evidence as plan defines      |
| pr-prep          | `hk check --profile pr`                         |
| review           | human_gated                                     |
| gate (terminal)  | `mise run spec gate` + quality gate via profile |

Use **current** mise invocations (pre-011 names). 011 updates bindings when commands rename.

---

## SMOKE-01 (WEP-7)

Evolve `.github/workflows/smoke.yml` from direct `mise run spec gate` to orchestrator-driven gate:

1. Drive a **committed fixture feature dir** (`tools/__tests__/fixtures/workflow/smoke-feature/`) for deterministic CI/nightly — per the 009 "never depend on live `assets/specs/NNN-*`" rule (see spec Clarifications 2026-06-10). `.specify/feature.json` resolution is manual/local-only.
2. `mise run spec workflow run` (current name until 011) with profile `default`.
3. Assert run reaches terminal `gate` with success.

Keep smoke **non-blocking** for PR merges; engine unit tests stay synthetic.

---

## Traceability

| Req     | Primary touch                                |
| ------- | -------------------------------------------- |
| WEP-1…3 | `packages/*`, `package.json`                 |
| WEP-4   | governance shims, conformance specs          |
| WEP-5   | `WORKFLOW_RUNTIME_GUIDE.md`                          |
| WEP-6   | `assets/catalog/workflows/default.yaml`      |
| WEP-7   | `.github/workflows/smoke.yml`, `CI_GUIDE.md` |
| WEP-8   | `profile_guide_crossref.script.ts` placement |
| WEP-9   | `handoff.md` verify block                    |

---

## Bun package manager (WEP-10)

Normative for workspace promotion — [Bun workspaces](https://bun.com/docs/pm/workspaces), [catalogs](https://bun.com/docs/pm/catalogs), [install](https://bun.com/docs/pm/cli/install).

| Practice               | kb application                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Catalog**            | Root `catalog` (or `workspaces.catalog`) owns `xstate`, `@sinclair/typebox`, `yaml`; packages use `"catalog:"` |
| **Workspace protocol** | `@kb/workflow-core`: `"workspace:*"` in runtime                                                                |
| **Private packages**   | `"private": true` on both workflow packages (no publish)                                                       |
| **Per-package tests**  | `packages/*/bunfig.toml` with `[test] root = "."`; run via `cd packages/<pkg> && bun test`                     |
| **CI install**         | Prefer `bun ci` / `--frozen-lockfile` in GitHub Actions                                                        |
| **Isolated linker**    | Default for workspace monorepos — do not regress to hoisted without ADR                                        |
| **Filter installs**    | Optional: `bun install --filter './packages/workflow-core'` for focused dev                                    |

Example root fragment:

```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "xstate": "^5.32.0",
      "@sinclair/typebox": "^0.34.49",
      "yaml": "^2.9.0"
    }
  },
  "dependencies": {
    "xstate": "catalog:",
    "@sinclair/typebox": "catalog:"
  }
}
```

Example workspace package:

```json
{
  "dependencies": {
    "@kb/workflow-core": "workspace:*",
    "xstate": "catalog:",
    "@sinclair/typebox": "catalog:"
  }
}
```

---

## Verification

See [`handoff.md`](./handoff.md).
