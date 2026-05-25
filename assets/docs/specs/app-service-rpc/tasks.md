<!-- markdownlint-disable-file -->
# Phase 5 — App Service + Elysia RPC — Tasks

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checappox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 5 as defined in [`requirements.md`](requirements.md) and [`design.md`](design.md), using the concrete execution detail in [`implementation-plan.md`](implementation-plan.md).

**Primary verification:** `bun test && bun run lint` are green; preview and desktop both route `/api/*` through the same `RpcApp`.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/app-service-rpc/{requirements,design,implementation-plan}.md`
- [ ] Read `assets/docs/specs/foundation/{design,roadmap}.md` Phase 5 section
- [ ] Read `.agents/skills/app-context/SKILL.md`, `.agents/skills/app-rpc/SKILL.md`, `.agents/skills/app-testing/SKILL.md`, `.agents/skills/app-quality-gate/SKILL.md`
- [ ] Read `.cursor/electrobun-skill-routing.md` then the referenced Electrobun RPC skills (do not guess IPC binding APIs)

---

## Task 1: Add dependencies

**Files:** Modify `package.json`, `bun.lock`

- [ ] Follow **Implementation Plan Task 1** (add `elysia`, `@elysiajs/eden`)
- [ ] Verify: `bun run typecheck`

---

## Task 2: Consolidate TypeBox request schemas

**Files:** Modify `src/shell/main/rpc/schemas.ts`, `src/shell/main/rpc/requests.ts`

- [ ] Follow **Implementation Plan Task 2**
- [ ] Verify: `bun test src/shell/main/rpc/requests.spec.ts`

---

## Task 3: Add `RpcApp` (`createRpcServer`)

**Files:** Create `src/shell/main/rpc/server.ts`

- [ ] Follow **Implementation Plan Task 3**
- [ ] Verify: `bun run typecheck`

---

## Task 4: Add `RpcApp` integration tests

**Files:** Create `src/shell/main/rpc/server.spec.ts`

- [ ] Follow **Implementation Plan Task 4**
- [ ] Verify: `bun test src/shell/main/rpc/server.spec.ts`

---

## Task 5: Preview server parity (forward to `rpc.handle`)

**Files:** Modify `tools/preview/server.ts`

- [ ] Follow **Implementation Plan Task 8**
- [ ] Verify:

```bash
bun tools/preview/server.ts
curl -s -X POST http://localhost:3456/api/getStats -H 'Content-Type: application/json' -d '{}'
```

Expected: JSON response (not 404).

---

## Task 6: Desktop IPC binding (`host.ts`) + main bootstrap

**Files:** Create `src/shell/main/rpc/host.ts`, modify `src/shell/main/main.ts`

- [ ] Follow **Implementation Plan Task 5** (Electrobun bridge + sync messages)
- [ ] Follow **Implementation Plan Task 6** (boot config + App + RpcApp + host)
- [ ] Verify: `bun test src/shell/main` and manual smoke with `bun run dev`

---

## Task 7: Renderer Eden client migration

**Files:** Modify `src/shell/renderer/rpc/client.ts`, create `src/shell/renderer/rpc/rpc_app.types.ts` (type-only)

- [ ] Follow **Implementation Plan Task 7**
- [ ] Verify: `bun test src/shell/renderer/rpc`

---

## Task 8: Remove legacy manual RPC maps

**Files:** Delete `src/shell/main/rpc/requests.ts`, delete `src/shell/main/rpc/requests.spec.ts`

- [ ] Follow **Implementation Plan Task 9**
- [ ] Verify: `bun test`

---

## Task 9: Slim Electrobun schema typing to messages-only

**Files:** Modify `src/shared/rpc/app_rpc_schema.ts`

- [ ] Follow **Implementation Plan Task 10**
- [ ] Verify: `bun run typecheck`

---

## Task 10: Quality gate + roadmap update

**Files:** Modify `assets/docs/specs/foundation/roadmap.md`

- [ ] Run:

```bash
bun test
bun run lint
```

- [ ] Only after passing verification, mark Phase 5 done in `assets/docs/specs/foundation/roadmap.md`
