# E2e fixture seeding reference

## Feature-local task seeding pattern

Features that require their own task entries without depending on the shared release fixture
should seed them in `bdd/e2e/support/seed_fixture.support.ts` as a dedicated YAML block:

```ts
const MY_FEATURE_TASKS_YAML = `tasks:
  My feature probe:
    desc: Feature-local task for <purpose> scenarios
    tags: [<feature-tag>]
    status: todo
    priority: low
    task_order: <unique-offset>
`
```

Then add the file to the `writeReleaseFixtureSources` Promise.all:

```ts
writeFile(path.join(sourcesPath, 'tasks', '<feature-slug>.yml'), MY_FEATURE_TASKS_YAML),
```

The file should be placed in the `tasks/` sources directory with a name that matches the
feature slug (e.g. `spec-008-atomicity.yml`).

## Example: `008-task-mutation-failure-ux`

The 008 feature seeds two feature-local tasks in `bdd/e2e/support/seed_fixture.support.ts`:

| Task key                  | Purpose                         | Scenario uses                         |
|---------------------------|---------------------------------|---------------------------------------|
| `Atomicity conflict probe`| Update-conflict mutation tests   | TSA-2                                 |
| `Atomicity diagnostic probe`| Diagnostic correlation tests    | TSA-3                                 |

These are seeded as `tasks/spec-008-atomicity.yml` alongside `tasks/release.yml`.

## Principles

- Each feature directory owns its seed file via `seed_fixture.support.ts`.
- Tags are feature-scoped (e.g. `spec-008`) — not `release`.
- `task_order` avoids collisions by using a high offset unique to the feature.
- Renaming an unrelated release fixture task does not break feature scenarios.
