<!-- markdownlint-disable-file -->

# Electrobun corpus audit — Handoff

**Date:** 2026-05-27
**Branch context:** Audit is docs-only; safe to commit independently of shell-chrome / handoff WIP.

---

## Delivered

| Artifact                       | Path                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Corpus audit report            | [`report.md`](report.md)                                                                                             |
| Inventory refresh              | [`../elysia-electrobun-capability-inventory/inventory.yml`](../elysia-electrobun-capability-inventory/inventory.yml) |
| Inventory report (regenerated) | [`../elysia-electrobun-capability-inventory/report.md`](../elysia-electrobun-capability-inventory/report.md)         |

**Electrobun inventory count:** 28 → **33** entries (+ Screen, BuildConfig API, BrowserView navigation, WGPU tag, getting-started cluster).

**Package pin:** `electrobun@^1.18.1`

---

## Maintainer actions

1. [x] **Review adoption tiers** in [`report.md`](report.md) §Adoption matrix and §Top 10 — sign-off: [`v0.10.0-scope.md`](../v0.10.0-scope.md) (2026-06-01).
2. [x] **Confirm implementation vehicle** for Should-tier work — [`electrobun-utils-adoption`](../electrobun-utils-adoption/handoff.md) covers clipboard, cursor placement, and `before-quit` / `unregisterAll`; sign-off: [`v0.10.0-scope.md`](../v0.10.0-scope.md) (2026-06-01).
3. [x] **Assign inventory priorities** (`must-have` / `nice-to-have` / …) — sign-off: [`v0.10.0-scope.md`](../v0.10.0-scope.md) (2026-06-01); see [`../elysia-electrobun-capability-inventory/inventory.yml`](../elysia-electrobun-capability-inventory/inventory.yml) for the assigned values.
4. **Window persistence** — Could-tier items (`saveWindowState`, `loadWindowStateSync` wiring) need a separate spec; helpers exist in `src/shell/main/window/state.ts` but main.ts does not call them.
5. **Doc gap** — `/guides/migrating-from-0x-to-v1` redirected to marketing home on 2026-05-27; no inventory entry until content is reachable.

---

## Maintainer sign-off (2026-06-01)

- Adoption matrix reviewed; implementation vehicle for Should-tier work is electrobun-utils-adoption Phases 1–3.
- v0.10.0 scope contract: assets/docs/specs/v0.10.0-scope.md
- Inventory priorities assigned for 14 Electrobun capability ids; all Elysia ids remain undecided.
- Window persistence, updater, menus, and tray are postponed to post–v0.10.0 specs.
- Step complete; no src/ changes in this pass.

---

## Suggested priority order (if approving work)

1. electrobun-utils-adoption Phase 3 (`before-quit` / shortcuts)
2. electrobun-utils-adoption Phase 1 (clipboard + open helpers)
3. electrobun-utils-adoption Phase 2 (Screen cursor placement)
4. shell-window-persistence spec (new) — bounds save/restore
5. Distribution blockers — signing docs, updater (defer until release)

---

## Verification (docs-only)

```sh
ruby -e "require 'yaml'; YAML.load_file('assets/docs/specs/elysia-electrobun-capability-inventory/inventory.yml')"
```

No `src/` quality gate required for this audit commit.
