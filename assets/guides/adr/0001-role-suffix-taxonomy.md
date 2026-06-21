# ADR-0001: Role suffix taxonomy

**Status:** Accepted
**Date:** 2026-06-21
**Driver:** 018-architecture-role-taxonomy

## Context

The project uses a Rails-style suffix taxonomy (`<name>.<role>.ts`) documented
in `CODESTYLE_GUIDE.md` § File Naming. An audit of `src/` found ~100 `.util.ts`
files, many of which perform I/O or hold OS-integration logic — violating the
"pure stateless helper" contract. There is no mechanism to prevent gradual drift
or to guide naming decisions when the existing vocabulary is insufficient.

## Decision

1. **Finalize the vocabulary** — Add `.resolver.ts` to cover identifier/value
   resolution from lookups or environment. All suffixes are singular; plurals
   only for aggregate re-export modules.
2. **Single-word doctrine** — Prefer single-word filenames licensed by their
   suffix. Shared qualifiers go in a subfolder; compound names are a last resort.
3. **`.util` purity rule** — `.util.ts` is reserved for pure, stateless,
   side-effect-free helper functions. Shell I/O artifacts must use a role suffix
   (`.adapter`, `.port`, `.service`, etc.).
4. **Standing metric** — A `role-conformance` harness in `tools/metrics`
   classifies every `.util.ts`, compares against a committed baseline, and flags
   regression. See `TOOLS_GUIDE.md` § Metrics taxonomy.
5. **ls-lint enforcement** — Already-conformant directories are locked with
   basename-regex rules (017 COH-3 mechanism). Has-violations directories are
   assigned to roadmap PRs.

## Consequences

- **Positive:** Naming decisions have a documented rationale. Drift is detected
  by the standing metric. The single-word doctrine produces shorter, scan-friendly
  filenames.
- **Negative:** Renaming existing files across the codebase is staged as a
  multi-PR roadmap (not a single big-bang change). Authors must learn and follow
  the subfolder convention.
- **Risk:** Without the roadmap being executed, the gap between the documented
  taxonomy and the actual codebase persists. Mitigated by the committed baseline
  — the metric makes the gap visible, not ignored.
