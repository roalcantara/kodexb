# COH-3 spike — ls-lint expressibility + blast radius

Feature: `017-src-cohesion-consolidation`
Date: 2026-06-20

## Step 1 — Expressibility

**Question:** Can ls-lint enforce multi-segment extensions like `.util.ts` (as opposed to just `.ts`)?

**Result:** No — ls-lint uses `path.extname()` internally, so only the final segment (`.ts`) is available as a YAML rule key. A key of `.util.ts` causes a YAML parse error.

**Workaround:** Enforce the suffix through the **regex on the basename** (the part before `.ts`). This is already how the existing config works — e.g. `src/shell/main/helpers` uses `.ts: regex:^[a-z][a-z0-9_]*\.helper(\.spec)?$` to require the `.helper` suffix.

**Verdict:** Expression is possible. The contract is encoded in the regex, not the extension key. Adds one extra line of regex complexity per suffix category.

## Step 2 — Blast radius (per-suffix table)

All 6 candidate `src/core` directories were given ls-lint rules matching their suffix vocabulary. The `.ls-lint.yml` was modified additively and `bun run lint:ls` was run. **Zero new failures.**

| Dir | Suffix(es) | Status |
|---|---|---|
| `knowledges/detail/` | `.parser`, `.assembler` | 0 failures |
| `knowledges/tags/` | `.util`, `.const` | 0 failures |
| `knowledges/task_views/` | `.util`, `.const` | 0 failures |
| `knowledges/schemas/` | `.schema` | 0 failures |
| `knowledges/` (root) | `.util` | 0 failures |
| `core/validation/` | `.helper` | 0 failures |

**Result:** Every file already follows the suffix convention (or is a barrel `index.ts`).

## Step 3 — Decision

**Verdict: PROCEED**

- Enforcement is expressible via the basename regex.
- Total new failures = **0** (well below the ≤10 threshold).
- No file renames required.
- The added rules are purely additive — they codify the existing naming convention without forcing any change.

## Additive rule templates

The following blocks can be inserted before `ignore:` in `.ls-lint.yml`:

```yaml
  src/core/domain/models/knowledges/detail:
    .ts: regex:(([a-z][a-z0-9_]*\.(parser|assembler)(\.spec)?)|index)

  src/core/domain/models/knowledges/tags:
    .ts: regex:(([a-z][a-z0-9_]*\.(util|const)(\.spec)?)|index)

  src/core/domain/models/knowledges/task_views:
    .ts: regex:(([a-z][a-z0-9_]*\.(util|const)(\.spec)?)|index)

  src/core/domain/models/knowledges/schemas:
    .ts: regex:(([a-z][a-z0-9_]*\.schema(\.spec)?)|index)

  src/core/domain/models/knowledges:
    .ts: regex:(([a-z][a-z0-9_]*\.util(\.spec)?)|index)

  src/core/validation:
    .ts: regex:(([a-z][a-z0-9_]*\.helper(\.spec)?)|index)
```

Note: `src/core/domain/models/sources/parsers` and the `entries/*` sub-dirs already have ls-lint rules. These additions cover every remaining uncovered `src/core` sub-directory.
