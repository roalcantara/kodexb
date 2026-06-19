# Handoff: DRY & Safety Refactoring (`014-ops-cli-kernel`)

You are taking over the final refactoring phase (`Phase 8`) of the Ops CLI Kernel task. The previous phase (Phases 1-7) established the kernel support modules. Your job is to implement Phase 8 refactoring to DRY-up the code, integrate functional error handling, and standardize command dispatching.

## Scope of Work

Follow the tasks defined in **Phase 8** of `assets/specs/014-ops-cli-kernel/tasks.md`:
1. **Batch Env Readers (`OCK-REF-01`)**: Create `usageFlags` and `usageStrings` in `usage_env.script.ts` to allow parsing multiple environment flags/positionals in single calls.
2. **Async-Safe main (`OCK-REF-02`)**: Enhance `runBinMain` in `dispatch.script.ts` to accept `Promise<void | number>` and catch async rejections.
3. **Action Map Dispatching (`OCK-REF-03`)**: Replace switch-case blocks in `catalog.script.ts` and `test.script.ts` with clean action mappings, batch env readers, and `runBinMain`.
4. **`neverthrow` Result I/O (`OCK-REF-04`)**: Integrate the `neverthrow` library in `text_file.script.ts` (`readTextFile` returns `Result<string, Error>`) and `allowlist.loader.script.ts` to avoid raw exception leaks.
5. **Quality Gate (`OCK-REF-05`)**: Verify everything is green using `gate.sh`.

---

## Guidelines for a Clean Quality Gate

To ensure that the quality gate passes cleanly with zero errors or warnings, adhere to the following coding rules:

### 1. Zero `biome-ignore` (No Ignoring Linters)
The codebase has 0 `biome-ignore` statements. Do **not** introduce new ones. Solve TypeScript or linter issues at the type level:
* **Avoid `any`**: Instead of casting to `any` to satisfy type checking, use appropriate generic constraints. E.g., for batch env keys, use `K extends string` and map them to `Record<K, boolean>`.
* **Explicit Returns**: Ensure all functions have explicit types, especially when returning `neverthrow`'s `Result` type.

### 2. Async Rejections inside `runBinMain`
When handling async functions inside `runBinMain(fn)`, remember that a synchronous `try/catch` block **cannot** catch rejected promises. Ensure you explicitly catch promise rejections and exit cleanly:
```typescript
try {
  const res = fn();
  if (res instanceof Promise) {
    res.catch(err => {
      getLogger(['kb', 'ops', 'dispatch']).error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  }
} catch (err) {
  getLogger(['kb', 'ops', 'dispatch']).error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
```

### 3. Pure Functions & Co-located Specs (Principle V)
* Every new export or function refactoring (like the batch env readers) **must** be covered by co-located test assertions in their respective `.spec.ts` files.
* Do not import modules across package boundaries unless explicitly allowed.

---

## Verification Commands

Run these commands periodically during implementation to confirm compliance:
```bash
# Verify unit tests for the kernel support library
bun test packages/ops/src/support/lib/

# Verify that subcommand behaviors still run cleanly
mise run catalog validate
mise run test spec-audit

# Run the full quality gate (lint + format + typecheck + knip + depcruise)
bash .agents/skills/app-quality-gate/scripts/gate.sh
```
