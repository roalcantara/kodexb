---
title: Fishery test factories
description: Fishery API summary and kb test factory conventions
---

# Fishery (kb)

[Fishery](https://github.com/thoughtbot/fishery) builds typed test objects. In this repo
it is a **devDependency** only. Production code must not import it.

## API surface used in kb

- **`Factory.define<T>(fn)`** — default object from `sequence`, `params`, `transientParams`,
  `associations`, `afterBuild`, `onCreate`, `afterCreate`.
- **`factory.build(partial?, options?)`** — synchronous object. `options` may include
  `transient` and `associations` (Fishery second argument).
- **`factory.buildList(count, partial?, options?)`** — list of builds.
- **`factory.params` / `.transient` / `.associations` / `.afterBuild`** — immutable
  factory extensions for reusable presets (traits).
- **`factory.create(...)`** — async when `onCreate` is defined; returns a different type
  if the third generic is set. Prefer **`build`** in unit tests unless persistence is
  the behavior under test.
- **`rewindSequence()`** — reset per-factory counters between isolated examples.

See the upstream README for full detail: [thoughtbot/fishery](https://github.com/thoughtbot/fishery).

## kb wrapper: `createFactoryFor`

[`src/__tests__/helpers/testing.factory.ts`](../../src/__tests__/helpers/testing.factory.ts)
returns `factoryFor(name, opts?)` where `opts` is either:

1. A **plain partial** passed straight to Fishery `build`, or
2. A **wrapped object**: `{ overrides?, associations?, transient?, afterBuild? }` — the
   wrapper forwards `associations` / `transient` to Fishery’s second argument and runs
   `afterBuild` on the result.

Registry objects must use `as const` so names and result types infer.

## Registry and import path

Factories live in
[`src/__tests__/factories/factories.builder.ts`](../../src/__tests__/factories/factories.builder.ts).
Import the typed helper from **`@testing`** (see `tsconfig.json` `paths`).

```ts
import { factoryFor } from '@testing'

const row = factoryFor('bookmark', { overrides: { desc: 'x' } })
```

## Factories vs YAML fixtures

- **Factories** — default `Knowledge` rows, `Env`, `RawConfig`, etc. for fast unit tests.
- **YAML under `src/__tests__/fixtures/`** — still used for **import/sync** integration
  paths that must exercise real files and parsers.

This matches [Better Specs](https://betterspecs.org): create only the data each example
needs; keep integration coverage on real corpora where that is the point.
