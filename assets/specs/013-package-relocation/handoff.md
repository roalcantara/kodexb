# Handoff — `013-package-relocation`

**Spec:** `assets/specs/013-package-relocation/`

| ID | Done when | Evidence |
| --- | --- | --- |
| PR-1 AC1 | `@kb/flow` physical relocation and internal resolution | `bun run typecheck && bun test packages/flow/` |
| PR-1 AC2 | `@kb/exec` physical relocation and internal resolution | `bun run typecheck && bun test packages/exec/` |
| PR-1 AC3 | Workspace dependency declaration in `@kb/exec` | `cat packages/exec/package.json \| grep "@kb/flow"` |
| PR-2 AC1 | `tools/` directory relocated to `@kb/ops` (`packages/ops/src/`) | `ls packages/ops/src/governance/` |
| PR-2 AC2 | Tool modules dependency resolving cleanly | `bun run lint:depcruise` |
| PR-3 AC1 | Root `bin/` dispatch shims exist | `ls bin/` |
| PR-3 AC2 | Root shims successfully forward executions | `bun bin/spec.script.ts lint assets/specs/013-package-relocation --strict` |
| PR-4 AC1 | tsconfig path mappings resolve correctly | `bun run typecheck` |
| PR-4 AC2 | Dependency cruiser boundary rules enforced | `bun run lint:depcruise` |
| PR-4 AC3 | Suffix rules enforced under `@kb/ops` | `bun run lint:ls && bun run lint:ast-grep` |
| PR-5 AC1 | Non-Code Assets relocated back to root-level `tools/` | `ls tools/governance/ && ls tools/inventory/ && ls tools/metrics/` |
| PR-6 AC1 | Dev-Time utilities decoupled to `@kb/dev` | `ls packages/dev/src/preview/` |
