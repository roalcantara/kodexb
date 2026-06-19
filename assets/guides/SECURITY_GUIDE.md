<!-- markdownlint-disable-file -->

# Security guide

Canonical source of truth for the project's **repository safety
primitives**: secret scanning, dependency CVE checks, Electrobun config
AST validation, and the consolidated `mise run spec ready` gate. Companion
to [`CI_GUIDE.md`](CI_GUIDE.md) (CI workflow shape) and
[`OBSERVABILITY_GUIDE.md`](OBSERVABILITY_GUIDE.md) (event substrate that
security tooling emits through).

If anything here disagrees with code or `hk.pkl`, the code is wrong —
open a PR to fix it, not the guide.

## Scope

This guide covers **build-time and commit-time safety**, executed locally
through `hk` hooks and in CI through declared `mise` tasks. It does **not**
cover:

- Runtime worker / agent sandboxing (tool allowlists, FS scope for
  dispatched workers). That is the orchestrator's concern, defined per
  workflow spec.
- Application authentication or authorization.
- Network-level security.

## Primitives

### Secret scanning — Gitleaks via `hk`

Raw-secret detection is delegated to the industry-standard
[Gitleaks](https://github.com/gitleaks/gitleaks) tool via `hk`'s builtin:

```pkl
// hk.pkl
local hygieneSteps = new Mapping<String, Step> {
    ["gitleaks"] = Builtins.gitleaks
    // …
}
```

Project-level exclusions live in `.gitleaks.toml` (fixtures, intentional
sample tokens, cache directories). `hk` runs `gitleaks` on every
`pre-commit` and inside the `commit / pr / ci` profiles.

Custom entropy heuristics for project-specific patterns may layer on top
of Gitleaks but never replace it.

### Dependency CVE checks

Lockfile deltas are scanned via `git diff --name-only --staged bun.lock`
plus a project-curated advisory list at
`packages/ops/src/governance/security/cve.list.yml`. The scan only touches added or
version-bumped packages — it does not re-scan the entire lockfile every
run.

The script entry point is `packages/ops/src/governance/security/scan.script.ts`.
`bun audit` integration is wrapped behind the same scan harness so the
advisory list and `bun audit` results compose into a single decision.

### Electrobun config AST validation

`electrobun.config.ts` is parsed via `ts-morph` (not regex) to verify
required safety settings on every declared `BrowserView`:

- `sandbox: true`
- `partition` is non-empty
- `navigation` has no wildcard origins

Logic lives in
`packages/ops/src/governance/security/checks/electrobun_surface.script.ts`. The check
runs on every PR and in the `full` profile.

### Atomic security event logging

Security scans emit events through the project's standard NDJSON event
substrate (see [`OBSERVABILITY_GUIDE.md`](OBSERVABILITY_GUIDE.md)) using
`O_APPEND` for atomic appends under concurrent invocations. The writer is
`packages/ops/src/governance/security/run_writer.script.ts`.

Events emitted include scan start/end, finding details (redacted), and
the exit-policy decision (block / warn / pass). The same event substrate
powers retention and the `runs` CLI.

### File-selection fast path

Local hook runs use a changed-files-only mode driven by
`packages/ops/src/governance/security/file_selection.script.ts`. CI runs use full
trees. The behavior is selected via the `--changed-only` flag in the hook
step (`hk.pkl` `spec-security-changed`).

## Consolidated readiness gate

The single command that means "I am ready to claim this feature done" is:

```bash
mise run spec ready <featureDir> --key <catalogKey>
```

This consolidates:

- Tag tests for the catalog key.
- Catalog validation.
- The deterministic security subgate (`mise run spec audit security`).
- The full app quality gate (`.agents/skills/app-quality-gate/scripts/gate.sh`).

Generic substitutes (`npm test`, `bun test` alone, ad-hoc lint runs) are
**not** sufficient. The readiness gate is the contract.

## `hk` profile policy

| Profile      | Purpose                                                           | When it runs                              |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------- |
| (no profile) | Fast hygiene + Gitleaks                                           | every `hk check`, `pre-commit`            |
| `commit`     | Cheap extras (shebangs, symlinks)                                 | `hk check --profile commit`, `pre-commit` |
| `pr`         | Same as `commit` + actionlint, hadolint, tombi, Gitleaks baseline | `hk check --profile pr`, PR workflow      |
| `ci`         | Mirrors `mise run lint check --ci`                                | `hk check --profile ci`, CI workflow      |
| `full`       | Mirrors `gate.sh` stages                                          | `hk check --profile full`                 |
| `slow`       | Optional deep checks (Gitleaks full repo)                         | `hk check --profile slow`                 |

Adding a new check means adding a step to `hk.pkl` under the appropriate
profile, **not** inlining the command anywhere else.

## Failure policy

- **Pre-commit**: blocks the commit. Fix and re-stage.
- **PR profile**: blocks the PR job. Findings are surfaced inline.
- **CI profile**: blocks the merge. Gitleaks runs in baseline mode (warn,
  not fail) until findings are triaged (`gitleaks-baseline-ci` step).
- **Readiness gate**: blocks the "done" claim. Use the gate's diagnostics
  rather than skipping with `--no-verify`.

Never bypass with `--no-verify`, `--no-gpg-sign`, or by disabling a
profile. If a check is wrong, fix the check or the rule, not the gate.

## Where security tooling lives

```
packages/ops/src/governance/security/
├── scan.script.ts              CLI entry shell
├── run_writer.script.ts        O_APPEND event writer
├── retention.script.ts         Lazy + explicit prune
├── exit_policy.script.ts       block / warn / pass decision
├── file_selection.script.ts    changed-files fast path
├── security.types.ts           Shared TypeBox models
├── events.types.ts             Event TypeBox models
├── cve.list.yml                Curated advisory dataset
├── checks/
│   ├── dependencies.script.ts
│   └── electrobun_surface.script.ts
└── fixtures/                   Deterministic test inputs
```

## What this guide deliberately does not cover

- Runtime worker / agent sandboxing. This is the orchestrator's concern,
  defined per workflow spec. See [Runtime worker sandbox](#runtime-worker-sandbox) below.
- App-level auth / permissions.
- Network or transport security.
- Supply-chain attestations beyond CVE matching. Revisit when the project
  ships signed releases.

## Runtime worker sandbox

The working implement is the `packages/ops/src/governance/specs/workflow/sandbox.script.ts` Adapter (L1 pure checker),
wired through `workflow_invoker.script.ts`, which runs optional per-stage `sandbox` descriptor
checks before dispatching commands:

```ts
import { checkSandbox } from './packages/ops/src/governance/specs/workflow/sandbox.script.ts'

const violation = checkSandbox(stage.sandbox, { command, path, host })
```

**Dimensions enforced** (AWO-11.1, AWO-11.2):

| Dimension       | Code entry point         | Blocked by                                            | Profile field                   |
| --------------- | ------------------------ | ----------------------------------------------------- | ------------------------------- |
| tool allowlist  | `checkToolAllowlist`     | command not starting with a listed tool               | `stage.sandbox.tool_allowlist`  |
| fs scope        | `checkFsScope`           | path matches deny pattern or falls outside allow_root | `stage.sandbox.fs_scope`        |
| secret handling | `validateSecretHandling` | `passthrough` without `acknowledged_unsafe`           | `stage.sandbox.secret_handling` |
| network         | `checkNetwork`           | host not permitted under declared policy              | `stage.sandbox.network`         |

Noncompliant writes emit a `sandbox.violation` NDJSON event and mark the stage `BLOCKED`.
Profile `sandbox` is optional — stages that omit it skip enforcement entirely (AWO-11 AC1).

### Secret handling

`secret_handling: passthrough` is blocked at profile load **unless** the stage also
declares `acknowledged_unsafe: true` (AWO-11 AC3). This is a profile-authoring gate,
not a runtime toggle: a profile that does not carry the acknowledgement will fail
`loadProfile()`.

### Invariant

sandbox checks are L1 pure — no spawn, no I/O, no toolchain identifiers. The engine
(L1) is tool-agnostic: it checks `command:` prefixes and paths against the declared
descriptor fields, whatever values kb (L3) supplies.
