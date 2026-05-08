# Graph Report - .  (2026-05-08)

## Corpus Check
- 44 files · ~72,656 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 45 nodes · 25 edges · 20 communities (9 shown, 11 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 157,753 input · 5,061 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Shell Architecture|Shell Architecture]]
- [[_COMMUNITY_Renderer App|Renderer App]]
- [[_COMMUNITY_Main Process|Main Process]]
- [[_COMMUNITY_Index Files|Index Files]]
- [[_COMMUNITY_RPC Client|RPC Client]]
- [[_COMMUNITY_Database Rules|Database Rules]]
- [[_COMMUNITY_TypeBox Rules|TypeBox Rules]]
- [[_COMMUNITY_Logging Rules|Logging Rules]]
- [[_COMMUNITY_Async Rules|Async Rules]]
- [[_COMMUNITY_Core Rules|Core Rules]]
- [[_COMMUNITY_FCIS Layers|FCIS Layers]]
- [[_COMMUNITY_Core|Core]]

## God Nodes (most connected - your core abstractions)
1. `kb` - 9 edges
2. `src/shell/app/` - 3 edges
3. `Renderer Entry Point` - 2 edges
4. `src/shell/main/` - 2 edges
5. `src/shell/renderer/` - 2 edges
6. `rootEl` - 1 edges
7. `win` - 1 edges
8. `Rule: No Renderer App Import` - 1 edges
9. `Rule: No Fishery Import` - 1 edges
10. `Rule: No Zod in Routes` - 1 edges

## Surprising Connections (you probably didn't know these)
- `kb` --conceptually_related_to--> `Andromeda Void Design System`  [INFERRED]
  README.md → DESIGN.md
- `kb` --references--> `Conventional Commits`  [EXTRACTED]
  README.md → CHANGELOG.md
- `kb` --references--> `release-it`  [EXTRACTED]
  README.md → CHANGELOG.md
- `src/shell/app/` --references--> `SQLite`  [EXTRACTED]
  CLAUDE.md → assets/docs/specs/foundation/design.md
- `src/shell/app/` --references--> `Drizzle ORM`  [EXTRACTED]
  CLAUDE.md → assets/docs/specs/foundation/design.md

## Communities (20 total, 11 thin omitted)

### Community 0 - "Project Documentation"
Cohesion: 0.2
Nodes (10): Conventional Commits, release-it, Andromeda Void Design System, Biome, Bun, Electrobun, kb, Mise (+2 more)

### Community 1 - "Shell Architecture"
Cohesion: 0.33
Nodes (6): src/shell/app/, src/shell/main/, src/shell/renderer/, Drizzle ORM, Elysia RPC Bridge, SQLite

## Knowledge Gaps
- **26 isolated node(s):** `rootEl`, `win`, `Rule: No Renderer App Import`, `Rule: No Await in Promise.all`, `Rule: No Fishery Import` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `rootEl`, `win`, `Rule: No Renderer App Import` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._