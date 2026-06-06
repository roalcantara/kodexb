<!-- markdownlint-disable-file -->

# Tools directory taxonomy

Normative guide for **`tools/`** — repository automation (scripts, validators, harnesses).
Not application product code (`src/`), agent skill prose (`.agents/skills/`), or registries/data
(`assets/`).

**Machine contract:** [`tools/tools.manifest.toml`](../../tools/tools.manifest.toml) — folder →
purpose family, enforced by `layout_validate.script.ts` in CI.

## Purpose families

Purpose answers **why the repo maintains this automation**. Coupling (`imports_src`,
`coupling_role` in inventory) answers **what it may depend on**. Both axes are required.

| Family | Job | Path under `tools/` |
| ------ | --- | ------------------- |
| **governance** | Enforce invariants — policies, registries, SDD workflow | `governance/policies/`, `governance/registries/`, `governance/specs/` |
| **orchestration** | Sequence workflow steps when mise/GHA/HK fires | `orchestration/scripts/`, `orchestration/fixtures/` |
| **metrics** | Repo metrics over time — harnesses + promoted baselines | `metrics/harnesses/`, `metrics/baselines/` |
| **dev** | Product-adjacent runtime (preview server, bundler plugins) | `dev/preview/`, `dev/build/` |
| **bin** | Thin TypeScript dispatch stubs (see below) | `bin/` (flat) |
| **support** | Shared TS libraries imported by other tools | `support/lib/` only |

**Target tree:**

```txt
tools/
├── governance/
│   ├── policies/          # ast-grep rules, hooks, CST yaml
│   ├── registries/        # catalog + skill automation (reads assets/catalog/*.yaml)
│   └── specs/             # Spec Kit lint, trace, gate.sh, …
├── orchestration/
│   ├── scripts/           # shell workflow steps
│   └── fixtures/          # static inputs (act, …)
├── metrics/
│   ├── harnesses/         # perf, e2e-quality (run / report / compare)
│   └── baselines/         # committed reference JSON (perf baseline)
├── dev/                   # ONLY family that may import src/
│   ├── preview/
│   └── build/
├── bin/                   # thin TS stubs → governance/*
├── support/
│   └── lib/               # repo_root, cli, spawn helpers
├── inventory/             # tools file inventory CSVs (analysis)
└── tools.manifest.toml

tmp/metrics/               # ephemeral metric output (gitignored) — NOT under tools/
```

**Not app telemetry:** `tools/metrics/` is repo quality/perf automation — not OpenTelemetry or
runtime metrics under `src/`.

### Generated metrics

**Generated metrics live in `tmp/metrics/`, never `tools/`.** The inventory may label rows
`purpose_family=metrics/generated/*`; that is a logical role only. Harnesses must print their
output path on `run`.

| Series | Harness | Baseline (committed) | Generated (ephemeral) |
| ------ | ------- | -------------------- | --------------------- |
| perf | `metrics/harnesses/perf/` | `metrics/baselines/perf/baseline.json` | `tmp/metrics/perf/` |
| e2e-quality | `metrics/harnesses/e2e-quality/` | `metrics/baselines/e2e-quality/quality-baseline.json` (+ `scenario-scores.json`, schema) | `tmp/metrics/e2e-quality/` or `tmp/e2e/metrics/` |

## `bin/` — narrow definition

**`bin/` holds only thin TypeScript dispatch stubs that delegate to `governance/*` domain logic**
(catalog, test, spec, skill, inventory). Rails-style: one file per mise-facing command, no domain
logic in the stub.

**Not in `bin/`** (invoked **in place** by path):

- Bash scripts (`gate.sh`, `worktree-add.sh`, `opencode_check.sh`) → co-locate under
  `governance/specs/` or `orchestration/scripts/`
- Policy data (`container-structure-test.yml`) → `governance/policies/`
- Metric harnesses (`perf.script.ts`, `e2e_metrics.script.ts`) → `metrics/harnesses/`
- HK-fired validators (`commit_message.script.ts`) → `governance/policies/hooks/`
- Fat hosts (`dev/preview/server.script.ts`) → stay under `dev/`

## Import law

**Only `tools/dev/**` may import `src/`** (and path aliases that resolve into `src/`).

Enforced by dependency-cruiser (`tools-non-dev-no-import-src` in `.dependency-cruiser.cjs`).

## Three-way disambiguation

| Path | What it is |
| ---- | ---------- |
| `tools/governance/registries/catalog/` | **Code** — validate, list, ship; reads YAML |
| `assets/catalog/catalog.yaml` | **Data** — shipped feature registry (metadata only) |
| `tools/governance/policies/ast-grep/` | **Policy** — structural lint rules |

Same pattern for skills: `tools/governance/registries/skill/` (code) vs `assets/catalog/SKILLS.yaml`
(data).

## Decision tree (new files)

1. **Purpose** — governance / orchestration / metrics / dev / bin / support?
2. **Subject** — product app, registry in `assets/`, spec artifacts, or repo invariant?
3. **Coupling** — may it import `src/`? (only `dev/*` when app-coupled)
4. **Invoker** — mise/HK/package.json call this file by path?
   - TS dispatcher for a domain → thin stub in `bin/`
   - Bash, harness, policy yaml → **in place** under the purpose family
5. **Lifecycle** — dev loop, pre-commit, CI, on-demand?
6. **Metrics lifecycle** — harness code → `metrics/harnesses/`; promoted metric JSON →
   `metrics/baselines/<series>/`; ephemeral → `tmp/metrics/`. No metric baselines under
   `assets/` or legacy spec trees.

### Tie-breakers

- **Fat entrypoint** (`invoked_by=mise` + domain logic): domain stays in `governance/*`; extract
  thin `bin/<name>.script.ts`.
- **Policy vs orchestration:** defines invariant → `governance/policies`; only wires steps →
  `orchestration/`.
- **Bash co-locates with purpose:** `gate.sh` with specs; `compile_renderer_styles.sh` with
  orchestration scripts — no dedicated bash top-level.
- **Fixtures:** `orchestration/fixtures/` (workflow static inputs) ≠ `src/__tests__/fixtures/`
  (product test data).

## Governance vs orchestration vs metrics

| Term | Meaning | Example |
| ---- | ------- | ------- |
| Governance | *Enforce* invariants | ast-grep rules, catalog validate, spec lint |
| Orchestration | *Sequence* workflow steps | style compile shell, HK calling validators |
| Metrics | *Track numbers over time* | perf compare, e2e quality baseline |
| Harness | Code that collects metrics | `perf.script.ts`, `e2e_metrics.script.ts` |
| Baseline | Promoted reference JSON | `baseline.json`, `quality-baseline.json` |
| Generated | Ephemeral run output | under `tmp/metrics/` |

## Artifact suffixes

TypeScript under `tools/` uses **`.script.ts`** (except `orchestration/scripts/` shell helpers).
Co-located tests: **`.script.spec.ts`**. ast-grep rules: **`<id>.rule.yml`**.

Details: [`CODESTYLE_GUIDE.md`](CODESTYLE_GUIDE.md) § Tools directory.

## Inventory maintenance

| File | Role |
| ---- | ---- |
| `tools/inventory/tools_file_inventory_source.csv` | Human judgments — edit this |
| `tools/inventory/tools_file_inventory.csv` | **Generated** — do not hand-edit |

Regenerate:

```sh
bun tools/bin/tools_inventory_report.script.ts
```

(`coupling_role` and `proposed_home` in the CSV are analysis columns — not destination paths
during migration; after layout is stable they should match physical paths.)

## Mise entrypoints

User-facing commands: **`mise run <task>`** — not direct `bun tools/...` except debugging.

| Task | Stub | Domain |
| ---- | ---- | ------ |
| `test` | `tools/bin/test.script.ts` | catalog tag runner + test orchestration |
| `catalog` | `tools/bin/catalog.script.ts` | `governance/registries/catalog/` |
| `spec` | `tools/bin/spec.script.ts` | `governance/specs/` |
| `skill` | `tools/bin/skill.script.ts` | `governance/registries/skill/` |
| `perf` | (harness in place) | `metrics/harnesses/perf/perf.script.ts` |

See [`MISE_GUIDE.md`](MISE_GUIDE.md) for task definitions.

## Enforcement

| Check | Owner |
| ----- | ----- |
| Folder layout | `tools/tools.manifest.toml` + `layout_validate.script.ts` |
| `src/` imports | dependency-cruiser |
| Suffix contracts | ast-grep + ls-lint |

Layout validator skips gitignored paths (`tmp/`, `graphify-out/`).

## Related guides

- [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md) — catalog vs guides vs specs (product documentation)
- [`MISE_GUIDE.md`](MISE_GUIDE.md) — mise task patterns
- [`CODESTYLE_GUIDE.md`](CODESTYLE_GUIDE.md) — file naming under `tools/`
