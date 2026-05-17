---
title: Fishery test factories
description: Fishery API summary and kb test factory conventions
---

# Fishery (kb)

[Fishery](https://github.com/thoughtbot/fishery) builds typed test objects. In
this repo it is a **devDependency** only. Production code must not import it.

Use Fishery as kb's factory-first test data layer. Factories are not only a
place for valid defaults; they are also the place to model repeated test
contexts, relationships, scenario variants, and refactor-safe project shapes.

## Why factories

Factories make test data easier to understand and cheaper to change:

- They centralize the shape of valid project-owned objects.
- They make recurring contexts explicit instead of scattering magic literals.
- They keep specs focused on fields that matter for the behavior under test.
- They make renamed fields, added fields, and stricter types easier to update.
- They give TypeScript a single typed path for building test data.
- They can model scenarios through overrides, transient data, associations,
  after-build hooks, factory extensions, and named variants.

Prefer factories for any reusable project-owned shape, not only business-domain
records. Good factory candidates include knowledge rows, config objects, RPC
payloads, renderer props, window geometry, display/work-area data, typed events,
and any exported type whose default valid shape matters to several tests.

## Decision model

Use this order when choosing how to create test data:

1. **Registered factory** — use `factoryFor(...)` when the data is a recurring
   project-owned shape or exported type.
2. **Contextual factory variant** — add a named variant or factory extension
   when the same scenario appears in several specs, such as
   `'task:blocked'`, `'rectangle:zeroOrigin'`, or `'knowledge:ftsStrong'`.
3. **Local builder** — use a one-file helper only while the shape is genuinely
   local, unstable, or not yet worth adding to the shared registry.
4. **Inline literal** — use only for tiny one-off values where a name would add
   noise and the value does not represent a reusable project concept.

Promotion is cheap and encouraged. When a local builder appears in a second
file, or when a test shape starts representing a real project concept, promote
it into `src/__tests__/factories/factories.builder.ts`.

## Do / Don't

| Do                                                                   | Don't                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Use `factoryFor('task')` for task-shaped data.                       | Rebuild task objects by hand in several specs.               |
| Add named variants for repeated scenarios.                           | Hide scenario meaning in anonymous override blobs.           |
| Override only fields relevant to the context.                        | Override every field "just to be explicit".                  |
| Use `associations` for related objects.                              | Build relationships with duplicated IDs in each spec.        |
| Use `transient` for context inputs not present on the final object.  | Add fake fields to result objects just to drive the factory. |
| Use `afterBuild` for final derived links that need the built object. | Mutate factory results in every individual spec.             |
| Keep Fishery in tests and helpers only.                              | Import Fishery from production code.                         |
| Prefer `build` in unit specs.                                        | Use `create` unless persistence is the behavior under test.  |

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

`factoryFor(...)` returns the built object. Do not call `.build()` on the
result:

```ts
const rectangle = factoryFor('rectangle')

// Good: use the object directly.
expect(rectangle.width).toBe(1920)

// Bad: factoryFor already executed the factory.
factoryFor('rectangle').build()
```

## Call forms

Use the shortest call form that still makes the scenario clear.

### Default build

Use no options when the default project shape is enough.

```ts
const rectangle = factoryFor('rectangle')

// Result:
// { x: 0, y: 0, width: 1920, height: 1080 }
```

### Plain partial

Use a plain partial when you only need to override result fields.

```ts
const rectangle = factoryFor('rectangle', { width: 680, height: 420 })

// Result:
// { x: 0, y: 0, width: 680, height: 420 }
```

The wrapper passes the partial to Fishery as build params, and Fishery overlays
those params on top of the factory defaults.

### Wrapped options

Use the wrapped form when you need advanced options or when the scenario reads
better with an explicit `overrides` key.

```ts
const rectangle = factoryFor('rectangle', {
  overrides: { width: 680, height: 420 }
})

// Result:
// { x: 0, y: 0, width: 680, height: 420 }
```

With only `overrides`, the result is the same as the plain partial form. The
wrapped form is required when you also need `transient`, `associations`, or
`afterBuild`.

## Registry and import path

Factories live in
[`src/__tests__/factories/factories.builder.ts`](../../src/__tests__/factories/factories.builder.ts).
Import the typed helper from **`@testing`** (see `tsconfig.json` `paths`).

```ts
import { factoryFor } from '@testing'

const row = factoryFor('bookmark', { overrides: { desc: 'x' } })
```

## Contextual factory patterns

Each feature below follows the same rule: keep the spec body focused on the
behavior, and move recurring setup meaning into the factory layer.

### Overrides

Overrides change fields on the final built object. Use them when the context is
specific to the current example or when a named variant would be premature.

Do:

```ts
const task = factoryFor('task', {
  overrides: { key: 'review-pr', status: 'todo' }
})

// Result includes all task defaults, with only key and status changed.
expect(task.key).toBe('review-pr')
expect(task.status).toBe('todo')
```

Don't:

```ts
const task = factoryFor('task', {
  overrides: {
    id: 2,
    type: 'task',
    key: 'review-pr',
    source: minimalEntriesYml,
    desc: 'Build kb',
    tags: ['dev', 'kb'],
    priority: 'high',
    status: 'todo',
    taskOrder: 2,
    doc: '# Task',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000
  }
})
```

The second example copies the factory defaults into the spec. That makes future
refactors harder and hides which fields matter.

### Named variants

Named variants are better than repeated override blocks when a scenario appears
in more than one spec.

Do:

```ts
const taskWithDepsFactory = taskFactory.params({
  status: 'todo',
  dependsOn: [1]
})

const factories = {
  task: taskFactory,
  'task:withDeps': taskWithDepsFactory
} as const
```

Then tests can read the scenario directly:

```ts
const weaker = factoryFor('knowledge:weaker')

// Result includes the registered BM25 ranking scenario:
// weaker.type === 'bookmark'
// weaker.source === 'kb:spec:knowledge/fts:weaker'
```

Don't repeat this in many specs:

```ts
const task = factoryFor('task', {
  overrides: { status: 'todo', dependsOn: [1] }
})
```

For dependency scenarios, `task:withDeps` should usually build the task that has
dependencies, not the dependency itself. Keep the relationship direction in the
factory name:

```ts
const dependency = factoryFor('task', {
  overrides: { id: 1, key: 'setup-project', status: 'done' }
})

const task = factoryFor('task', {
  overrides: { id: 2, key: 'review-pr', dependsOn: [dependency.id] }
})
```

The existing `knowledge:weaker` and `knowledge:stronger` factories follow this
pattern for BM25 ranking specs.

### Transient data

Use transient data when an input should influence the built result but should
not appear as a field on that result. Transient data is useful for scenario
inputs such as "registered", "blocked by task 1", "with three children", or
"with visit score".

When adding or changing a factory:

```ts
type TaskTransient = {
  blockedBy?: number
}

const taskFactory = Factory.define<TaskKnowledge, TaskTransient>(({ sequence, transientParams }) => {
  const dependency = transientParams.blockedBy

  return {
    id: 4_000_000_000 + sequence,
    type: 'task',
    key: `Task title ${sequence}`,
    source: minimalEntriesYml,
    desc: 'Build kb',
    tags: ['dev', 'kb'],
    priority: 'high',
    status: dependency === undefined ? 'doing' : 'todo',
    dependsOn: dependency === undefined ? undefined : [dependency],
    doc: `# Task ${sequence}\n\n> Build kb`,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000
  }
})
```

At the call site:

```ts
const task = factoryFor('task', { transient: { blockedBy: 1 } })

// Result:
// task.dependsOn === [1]
// task.status === 'todo'
// 'blockedBy' is not a field on task
```

The current kb wrapper accepts `transient` as a generic record. If a transient
shape becomes important, add focused tests for that factory and document the
accepted transient keys near the factory definition.

Do:

```ts
const task = factoryFor('task', { transient: { blockedBy: 1 } })
```

Don't:

```ts
const task = factoryFor('task', {
  overrides: {
    blockedBy: 1, // Not part of TaskKnowledge.
    dependsOn: [1]
  }
})
```

### Associations

Use associations when the scenario depends on related objects and the factory
can derive the final object from those relationships. Associations are the
better choice when the related object is meaningful, not just its ID.

When adding a graph-shaped factory, define the relationship in the factory
itself and then register that factory before calling it through `factoryFor`.
For example, a future `TaskGraph` factory could derive `dependsOn` from
associated dependencies:

```ts
type TaskGraph = {
  task: TaskKnowledge
  dependencies: TaskKnowledge[]
}

const taskGraphFactory = Factory.define<TaskGraph>(({ associations }) => {
  const dependencies = associations.dependencies ?? [taskFactory.build()]

  return {
    dependencies,
    task: taskFactory.build({
      dependsOn: dependencies.map(dependency => dependency.id)
    })
  }
})

// Result:
// graph.task.dependsOn === graph.dependencies.map(dependency => dependency.id)
```

Do:

```ts
const dependency = factoryFor('task', { overrides: { id: 1 } })
const task = factoryFor('task', {
  overrides: { dependsOn: [dependency.id] }
})
```

Don't:

```ts
const graph = {
  dependencies: [{ id: 1, /* copied task fields */ }],
  task: { dependsOn: [1], /* copied task fields */ }
}
```

The second form duplicates object shapes and makes the relationship fragile. If
the spec only needs IDs and no related object behavior, `transient` can be
clearer than `associations`.

### After-build hooks

Use `afterBuild` when a final transformation needs the completed object. This
is useful for derived fields, relationship wiring, or reusable final decoration.
Do not use it for simple field overrides.

Without `afterBuild`, specs often repeat mutation after construction:

```ts
const task = factoryFor('task', {
  overrides: { tags: ['dev'] }
})

const taskForReview = {
  ...task,
  tags: [...task.tags, 'review']
}

// Result:
// task.tags === ['dev']
// taskForReview.tags === ['dev', 'review']
```

With `afterBuild`, the transformation stays in the factory call:

```ts
const taskForReview = factoryFor('task', {
  overrides: { tags: ['dev'] },
  afterBuild: task => ({
    ...task,
    tags: [...task.tags, 'review']
  })
})

// Result:
// taskForReview.tags === ['dev', 'review']
```

Do:

```ts
const task = factoryFor('task', {
  afterBuild: built => ({
    ...built,
    doc: `${built.doc}\n\nRelated task: ${built.id}`
  })
})
```

Don't:

```ts
const task = factoryFor('task', {
  afterBuild: built => ({ ...built, status: 'done' })
})
```

Use `overrides: { status: 'done' }` for the second case. `afterBuild` is for
logic that needs the built object, not for ordinary field replacement.

### Use project factories for geometry too

Geometry is still test data. If it is a named project shape or appears in more
than one spec, use a factory rather than repeating anonymous literals.

```ts
describe('bookmark rows', () => {
  describe('with a custom tag', () => {
    const entry = factoryFor('bookmark', { overrides: { tags: ['ops'] } })

    it('exposes the tag on the row', () => {
      expect(entry.tags).toContain('ops')
    })
  })
})
```

Use a local builder only when the primitive shape is truly private to one spec
file and promotion would add indirection without reducing duplication.

## Adding or changing factories

When adding a factory:

1. Add it to `src/__tests__/factories/factories.builder.ts`.
2. Register it in the `factories` object with a stable, descriptive name.
3. Add or update `src/__tests__/factories/factories.builder.spec.ts`.
4. Prefer named variants for repeated contexts.
5. Keep defaults valid and boring; put scenario-specific meaning in variants,
   transient inputs, or targeted overrides.
6. Do not import production-only infrastructure or perform real side effects in
   `build`.

Factory names should describe the project concept or scenario:

```ts
// Good
'task:blocked'
'knowledge:weaker'
'rectangle'
'windowSize'

// Avoid
'thing'
'data'
'fixture1'
'testTask'
```

## Factories vs YAML fixtures

- **Factories** — default `Knowledge` rows, `Env`, `RawConfig`, etc. for fast unit tests.
- **YAML under `src/__tests__/fixtures/`** — still used for **import/sync** integration
  paths that must exercise real files and parsers.

This matches [Better Specs](https://betterspecs.org): create only the data each example
needs; keep integration coverage on real corpora where that is the point.

## Review checklist

- Does every repeated project-owned shape use `factoryFor(...)`?
- Does the factory name reveal the concept or scenario?
- Are overrides limited to the fields relevant to the context?
- Would a named variant make repeated overrides clearer?
- Are transient inputs used only for context, not fake result fields?
- Are YAML fixtures limited to file-format or import/sync integration behavior?
- Are Fishery imports limited to test helpers and factory files?
