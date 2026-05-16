# Project Skill Guide

This guide records which agent skills are part of kb's project workflow, which
global skills are useful companions, and which skills should not be adopted by
default. It is a routing ledger, not a replacement for `CLAUDE.md`,
`.agents/skills/kb-context/SKILL.md`, or the domain guides in this directory.

## Decision Rules

Apply these rules before adopting or invoking a skill:

1. kb-specific instructions win over generic skill advice.
2. `CLAUDE.md`, `AGENTS.md`, and `.agents/skills/kb-context/SKILL.md` define
   the standing workflow.
3. `assets/guides/` define the project style, testing, runtime, and quality
   expectations.
4. Electrobun work must use `.cursor/electrobun-skill-routing.md` before
   choosing a narrower Electrobun skill.
5. Generic skills may be used as optional companions only when they do not
   weaken the quality gate, FCIS boundaries, TypeBox-only RPC model, or
   prototype approval gate.

Do not vendor or symlink a global skill only because it sounds useful. Add a
skill to project routing only when it changes agent behavior in a repeatable
project-specific situation.

## Current Project Skills

| Skill                          | Status                        | Rationale                                                                                                                                           |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kb-context`                   | Adopted, local                | Mandatory project orientation. It defines FCIS, the allowed RPC shape, guide routing, and the project quality workflow.                             |
| `kb-rpc`                       | Adopted, local                | Canonical app-level RPC guidance for Elysia, Eden Treaty, and TypeBox. It prevents drift toward unsupported schema or ORM patterns.                 |
| `kb-testing`                   | Adopted, local                | Canonical testing workflow for co-located Bun specs, harnesses, and Electron/Electrobun-shaped test boundaries.                                     |
| `kb-quality-gate`              | Adopted, local                | Executable completion gate. Prefer this over generic verification checklists when declaring work complete or preparing commits.                     |
| `electrobun-best-practices`    | Adopted, local                | Baseline for desktop stack work. Load for `electrobun.config.ts`, shell main code, windows, views, native UI, build, and distribution.              |
| `electrobun-native-ui`         | Adopted, local                | Focused companion for menus, dialogs, tray, clipboard, and native UI integration.                                                                   |
| `electrobun-window-management` | Adopted, local                | Focused companion for `BrowserWindow`, `BrowserView`, lifecycle, multi-view, and window orchestration work.                                         |
| `electrobun`                   | Linked companion              | General Electrobun reference. Prefer narrower routed skills when the task is specific.                                                              |
| `electrobun-plugin-guide`      | Linked companion              | Entry point when the right Electrobun skill is unclear. This should defer to project routing before implementation.                                 |
| `electrobun-core`              | Linked companion              | Use for main process, `BrowserWindow`, `BrowserView`, lifecycle, and app shell behavior.                                                            |
| `electrobun-config`            | Linked companion              | Use for `electrobun.config.ts`, build view entries, copy rules, and asset wiring.                                                                   |
| `electrobun-dev`               | Linked companion              | Use for Electrobun dev server, watch mode, hot reload, and devtools issues.                                                                         |
| `electrobun-build`             | Linked companion              | Use for build pipeline failures, bundle output, signing-adjacent build concerns, and CI build behavior.                                             |
| `electrobun-platform`          | Linked companion              | Use for macOS, Windows, Linux, CEF, and platform-specific differences.                                                                              |
| `electrobun-distribution`      | Linked companion              | Use for packaging, signing, notarization, and release distribution concerns.                                                                        |
| `electrobun-testing`           | Linked companion              | Use for Electrobun-specific test strategy, but keep `kb-testing` as the project test authority.                                                     |
| `electrobun-kitchen-sink`      | Linked companion              | Reference examples only. Do not copy patterns without reconciling them with kb guides.                                                              |
| `electrobun-workflow`          | Linked companion              | Use for Electrobun development workflow questions. It does not replace kb's feature/spec workflow.                                                  |
| `electrobun-rpc`               | Routed companion to link      | Use for native Electrobun IPC only: `BrowserView.defineRPC`, `Electroview.defineRPC`, and `ElectrobunRPCSchema`. App-level kb RPC remains `kb-rpc`. |
| `agent-electrobun`             | Adopted as a linked companion | Useful for Electrobun app automation and inspection. It is not a replacement for project tests or quality gates.                                    |
| `bun-development`              | Adopted as a linked companion | Useful for Bun implementation details. `assets/guides/BUN_RUNTIME.md` remains the project authority.                                                |
| `bun-runtime`                  | Adopted as a linked companion | Useful for runtime-specific Bun behavior. Use alongside, not instead of, the project Bun guide.                                                     |

## Candidate Skill Evaluation

| Skill                              | Recommendation                              | Rationale                                                                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ast-grep`                         | Add as an optional companion                | The quality stack already uses ast-grep. Load it when authoring, debugging, or explaining structural search rules.                                                                                                                                                             |
| `bash-scripting`                   | Keep global-only                            | Useful for shell-heavy hooks or embedded `mise.toml` commands. kb should still prefer mise tasks over ad-hoc standalone scripts.                                                                                                                                               |
| `bdd-gherkin-specification`        | Keep global-only                            | Useful for acceptance-language discovery, but kb does not currently use Gherkin as its canonical test format.                                                                                                                                                                  |
| `bdd-patterns`                     | Keep global-only                            | Helpful only when shaping BDD material. It should not become a default feature or test workflow.                                                                                                                                                                               |
| `bdd-principles`                   | Keep global-only                            | Good conceptual background for BDD, but too broad to project-route by default.                                                                                                                                                                                                 |
| `bdd-scenarios`                    | Keep global-only                            | Useful for scenario phrasing when a spec explicitly needs BDD examples. Do not convert existing Bun specs to Gherkin by default.                                                                                                                                               |
| `domain-name-brainstormer`         | Do not add                                  | Product naming and domain brainstorming are unrelated to this repo's implementation and governance workflow.                                                                                                                                                                   |
| `dry-principle`                    | Add as an optional review companion         | Useful when duplication findings or refactors need judgment. Keep it subordinate to FCIS, `CODESTYLE_GUIDE.md`, and the small-module rule.                                                                                                                                     |
| `elysia`                           | Add as an optional companion under `kb-rpc` | Useful for Elysia route mechanics, TypeBox route schemas, handler typing, and `app.handle()` testing patterns. Do not follow its generic `src/modules`, Vitest, pnpm, Docker, auth, or OpenAPI scaffolding unless a kb spec explicitly calls for it.                           |
| `elysiajs`                         | Keep global-only as an upstream reference   | Broad Elysia guidance can help when checking framework APIs, but it also suggests Zod, Valibot, Drizzle, Better Auth, WebSockets, deployment scaffolds, and online `llms.txt` lookup. kb must keep TypeBox, Eden Treaty, `bun:sqlite`, and preview mirror rules from `kb-rpc`. |
| `electrobun-rpc`                   | Already covered                             | It is already routed for native Electrobun IPC. Keep the boundary clear: app RPC uses `kb-rpc`.                                                                                                                                                                                |
| `electrobun-rpc-patterns`          | Keep global-only                            | Useful for advanced IPC patterns such as batching or streaming. Do not add until the app needs those patterns.                                                                                                                                                                 |
| `electrobun-sdlc`                  | Keep global-only                            | Useful for larger Electrobun feature planning, but kb's specs, prototype gate, and quality gate are the canonical lifecycle.                                                                                                                                                   |
| `electrobun-webgpu`                | Keep global-only                            | Load only for real WebGPU, `GpuWindow`, canvas, or WGSL work. It should not be part of normal desktop routing.                                                                                                                                                                 |
| `formatter-development`            | Do not add                                  | It targets formatter implementation, not normal Biome usage in this repo.                                                                                                                                                                                                      |
| `functional-core-imperative-shell` | Already covered; do not adopt raw           | kb already has FCIS as a project architecture rule. This global skill's mandatory `// pattern: ...` comments do not match current source conventions, so use `FCIS.guide.md` and `kb-context` instead.                                                                         |
| `mise-expert`                      | Add as an optional companion                | Useful for tool versions, environment setup, and mise configuration questions that are broader than task orchestration.                                                                                                                                                        |
| `mise-tasks`                       | Add as an optional companion                | Already useful for editing `mise.toml`, task dependencies, and multi-step project workflows.                                                                                                                                                                                   |
| `playwright-bdd-gherkin-syntax`    | Keep global-only                            | Use only if the project explicitly introduces Gherkin-backed Playwright tests. Current preview/e2e workflows do not require it.                                                                                                                                                |
| `quality-assurance`                | Keep global-only                            | Useful for broad QA thinking, but `kb-quality-gate`, `DoD.md`, and `TESTING_GUIDE.md` are stricter project authorities.                                                                                                                                                        |
| `react:components`                 | Keep global-only with adaptation            | Useful for translating design ideas into React components, but its Vite/npm assumptions must be adapted to kb's renderer, Bun, and guide stack.                                                                                                                                |
| `solid-principles`                 | Add as an optional review companion         | Useful for class/module design review. Keep it subordinate to FCIS and existing project architecture rules.                                                                                                                                                                    |
| `stitch-design`                    | Use only behind the prototype gate          | Useful for design intake and prototypes. Production `src/` changes still require explicit prototype approval first.                                                                                                                                                            |
| `stitch-loop`                      | Do not add                                  | Its autonomous website iteration workflow does not match kb's desktop app and gated implementation process.                                                                                                                                                                    |
| `systematic-debugging`             | Add as an optional companion                | Useful before fixing failing tests, quality gate failures, regressions, and unclear behavior.                                                                                                                                                                                  |
| `using-git-worktrees`              | Keep global-only                            | Useful when the user asks for isolated parallel work. Do not create worktrees automatically in the normal desktop session.                                                                                                                                                     |
| `verification-before-completion`   | Keep as an optional principle               | Helpful as a reminder, but the executable authority is `kb-quality-gate` plus the relevant project guide checks.                                                                                                                                                               |

## Adoption Policy

Use this policy when adding or changing project skill routing:

1. For Electrobun and Bun reference skills, prefer `mise run link:skills`.
   Absolute local symlinks under `.agents/skills/` are environment setup, not
   reviewable source.
2. For generic global skills, prefer documenting them as optional companions in
   `CLAUDE.md`, `.agents/skills/kb-context/SKILL.md`, or this guide instead of
   vendoring them.
3. For a skill with assumptions that conflict with kb, create a kb-specific
   wrapper or routing note before using it repeatedly.
4. For a skill that weakens or bypasses the quality stack, do not adopt it
   unless a maintainer explicitly approves the change.
5. When a skill becomes project-routed, update all relevant routing surfaces in
   the same change: this guide, `CLAUDE.md`, `.agents/skills/kb-context/SKILL.md`,
   and `.cursor/electrobun-skill-routing.md` when the skill is Electrobun-specific.

## Optional Companion Matrix

| Situation                                          | Optional companion skills                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Failing tests, regressions, unclear behavior       | `systematic-debugging`                                                                    |
| Structural search or repository rules              | `ast-grep`                                                                                |
| Elysia route mechanics under kb RPC                | `elysia`, after `kb-rpc`                                                                  |
| Unused exports, files, or dependencies             | `knip`                                                                                    |
| Duplication findings and extraction judgment       | `jscpd`, `dry-principle`                                                                  |
| FCIS placement or purity questions                 | `FCIS.guide.md`, `kb-context`; do not use raw `functional-core-imperative-shell` comments |
| `mise.toml`, task wiring, tool versions            | `mise-tasks`, `mise-expert`                                                               |
| Review preparation or review feedback              | `requesting-code-review`, `receiving-code-review`                                         |
| Design or prototype intake                         | `stitch-design`, only under the prototype gate                                            |
| React component translation from a design artifact | `react:components`, adapted to kb's renderer and guide stack                              |
| Advanced native Electrobun IPC                     | `electrobun-rpc-patterns`, after `electrobun-rpc` and `kb-rpc` boundaries are understood  |
| Isolated parallel development                      | `using-git-worktrees`, only when requested or approved                                    |
