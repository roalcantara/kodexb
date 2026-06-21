<!-- markdownlint-disable-file -->

# Fix handoff — 010 Bun package manager (WEP-10)

**Parent PR:** `feature/010-workflow-packages` (package extraction landed; gate red on Biome + catalog gaps)
**Spec:** [`../spec.md`](../spec.md) WEP-10 · **Tasks:** Phase 10 in [`../tasks.md`](../tasks.md)

---

## Load

- `app-context`
- [`plan.md`](../plan.md) § Bun package manager
- [Bun catalogs](https://bun.com/docs/pm/catalogs) · [workspaces](https://bun.com/docs/pm/workspaces)

---

## P0

1. **Root catalog** — `package.json`: add `workspaces.catalog` (or top-level `catalog`) for `xstate`, `@sinclair/typebox`, `yaml`. Root `dependencies` that overlap → `"catalog:"`.

2. **Workspace manifests** — `packages/workflow-core/package.json` and `packages/workflow-runtime/package.json`: replace `"^…"` pins with `"catalog:"` for shared deps; keep `"@kb/workflow-core": "workspace:*"` in runtime.

3. **Biome gate** — `packages/workflow-core` + `packages/workflow-runtime`: fix 54 Biome errors (complexity, empty catch, etc.) until `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.

4. **Handoff Evidence** — already corrected in `handoff.md` AC table; verify commands run.

---

## P1

5. **CI install** — `.github/workflows/smoke.yml`: `bun ci` instead of `bun install`; consider dropping standalone `mise run spec gate` if orchestrator smoke covers terminal gate.

6. **WORKFLOW_RUNTIME_GUIDE** — short § on catalog + `workspace:*` + per-package `bunfig.toml`.

7. **`bun install`** — refresh `bun.lock`; confirm catalog section present.

---

## Out of scope

- Mise SDD CLI (`011-mise-sdd-cli`)
- npm publish of `@kb/workflow-*`
- Migrating entire root `dependencies` to catalog (only shared workflow deps required)

---

## Before done

```sh
cd packages/workflow-core && bun test
cd ../workflow-runtime && bun test
bun test --config /dev/null tools/governance/specs/workflow/
mise run spec lint assets/specs/010-workflow-packages
mise run spec gate assets/specs/010-workflow-packages
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

**Do not commit unless asked.**
