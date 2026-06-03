<!-- markdownlint-disable-file -->

# Milestone 02 — scope charter

**Opened:** 2026-06-02 · **Driver:** Post–v0.10.0 architectural review consolidation

## Purpose

Ship **honest persistence and keyboard-grade list performance**, then pay down **architecture seam debt** without a rewrite.

- Milestone 01 delivered the product, CI, and the review itself.
- Milestone 02 **implements** the ranked backlog from [`consolidated-review.md`](./consolidated-review.md).

## Goals

1. **Correctness** — no RPC success when YAML or frecency state is wrong.
2. **Measurable acceptance** — every fix has AC + `bun test` evidence before merge.
3. **Incremental hygiene** — enum/type consolidation and renderer structure in phased PRs, not one branch.

## Non-goals (M02)

- Full `renderer/features/` tree migration (rank 29).
- Splitting `App` into five services in one milestone (rank 30).
- Replacing TypeBox / Eden / SQLite stack.
- Rewriting guides for every stale paragraph (rank 23) unless touched by a spec.

## Success metrics

| Metric                                  | Target                                   |
| --------------------------------------- | ---------------------------------------- |
| 🔴 specs implemented                     | 3/3                                      |
| Integration tests for sync + tasks      | New specs green in CI                    |
| Tag facet query count per stats refresh | 1 SQL round-trip (design target)         |
| Maintainer “trust” issues               | Zero open P0 from consolidated ranks 1–2 |

## Relationship to foundation

[`foundation/design.md`](../../MILESTONE_01/foundation/design.md) states YAML is source of truth and SQLite is a projection.
M02 **closes the gap** where implementation violates that story (ranks 1–2).

Existing [`sync/`](../../MILESTONE_01/sync/requirements.md) spec owns import **resilience**;
[`sync-frecency-persistence`](../01_sync-frecency-persistence/requirements.md) **amends** rebuild policy for **learned local state** tables.
