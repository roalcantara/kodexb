<!-- markdownlint-disable-file -->

# KB BDD guide

KB uses Behavior-Driven Development for living documentation of release-facing
desktop behavior. The first suite covers the deterministic e2e preview harness,
then grows into smoke and regression scenarios for the app's most important
flows.

## Skills to load

| Situation                                    | Skill                                                        |
| -------------------------------------------- | ------------------------------------------------------------ |
| Writing `.feature` files or acceptance specs | `bdd-gherkin-specification`                                  |
| Playwright BDD syntax and generated tests    | `playwright-bdd-gherkin-syntax`                              |
| Step definition patterns (Playwright BDD)    | `playwright-bdd-step-definitions` (`mise run skill install`) |
| Gherkin keywords and step-def rules          | `cucumber-gherkin`                                           |
| Declarative scenarios and pyramid            | `cucumber-best-practices`                                    |
| Scenario phrasing and edge cases             | `bdd-scenarios`                                              |
| BDD structure and Given-When-Then patterns   | `bdd-patterns`                                               |
| BDD philosophy and Three Amigos              | `bdd-principles`                                             |
| KB test harness and quality gates            | `app-testing`, `app-quality-gate`                            |

Also read `assets/guides/TESTING_GUIDE.md` before changing the test harness or
adding runner commands.

## External references (rationales in e2e design)

| Source                    | URL                                                                                               | kb usage                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Cucumber                  | [cucumber.io/docs](https://cucumber.io/docs)                                                      | Executable Gherkin; Given/When/Then semantics |
| Serenity Screenplay       | [Screenplay fundamentals](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals) | Actor, tasks, questions vocabulary            |
| `@cucumber/screenplay.js` | [github.com/cucumber/screenplay.js](https://github.com/cucumber/screenplay.js/)                   | Thin steps, remember/recall, eventually       |
| CodeceptJS                | [codecept.io/tutorial](https://codecept.io/tutorial)                                              | Locator policy only — runner deferred         |

Normative kb contracts live in `assets/docs/specs/e2e/design.md` (approach
comparison and Screenplay conventions). Do not add CodeceptJS or a second Cucumber
runner without an explicit spike outcome documented in T1.1 evidence.

## Verification layers

| Layer                | Location                                                       | Role                                                                                 |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| SDD specs            | `assets/docs/specs/<slug>/`                                    | Requirements, design, tasks, and handoff documents.                                  |
| E2e contracts        | `assets/docs/specs/e2e/fixture-manifest.md`, `step-catalog.md` | Normative seed data and Gherkin phrase map.                                          |
| Gherkin features     | `assets/features/<domain>/`                                    | Product-level examples that describe user-visible behavior.                          |
| Playwright glue      | `e2e/steps/`, `e2e/screenplay/`, `e2e/support/`                | Executable step definitions, Screenplay tasks/questions, and deterministic fixtures. |
| Unit/component specs | `src/**/*.spec.ts`, `src/**/*.test.ts`                         | Lower-level behavior and edge-case coverage.                                         |

The split keeps the repository root quiet while keeping executable
specifications outside the planning-doc tree. For the e2e suite, the canonical
feature domain is `assets/features/e2e/`.

## Folder layout

- `assets/docs/specs/e2e/` - SDD artifacts for the e2e rollout.
- `assets/docs/specs/e2e/fixture-manifest.md` - normative seed titles, tags, ordering.
- `assets/docs/specs/e2e/step-catalog.md` - Gherkin phrase to Screenplay map.
- `assets/features/e2e/` - canonical Gherkin `.feature` files for app e2e
  behavior.
- `e2e/steps/` - thin Playwright BDD step definitions.
- `e2e/screenplay/` - actors, abilities, tasks, questions, and interactions.
- `e2e/support/` - deterministic fixture setup, preview lifecycle, reports, and
  metrics helpers.
- `e2e/.generated/` - playwright-bdd output (gitignored).
- `tmp/e2e/` - generated traces, reports, and per-run metrics.

## Screenplay in KB

KB uses the Screenplay pattern to keep step definitions small and reusable.
Steps translate Gherkin phrases into actor activities and questions; they should
not contain long Playwright scripts.

- **Actors** represent app users exercising the preview harness.
- **Abilities** give actors access to the browser page and fixture context.
- **Tasks** express business intent, such as opening the detail preview (`attemptsTo`).
- **Interactions** perform browser operations, such as pressing a shortcut.
- **Questions** assert observable app state (`asksWhether` / `ask`).
- **Memory** uses `remember` / `recall` for selected entry title and similar keys.

Selectors belong behind tasks, questions, or interactions. Prefer role/name
locators (Cucumber and Codecept guidance), then stable app-owned test ids when
accessible names cannot express the target.

## When to add what

- New release-facing app behavior -> add or update a scenario under
  `assets/features/e2e/`, register steps in `step-catalog.md`, and add e2e AC
  to the feature's `requirements.md` (see [`e2e/requirements.md` R11](../docs/specs/e2e/requirements.md#r11---cross-feature-e2e-acceptance)).
- User-visible refactor of list, detail, palette, filter, sync, or settings ->
  update or add e2e scenarios in the same increment unless `tasks.md`
  documents an approved unit-only deferral.
- Seed data or ordering change -> update `fixture-manifest.md` and seed support code.
- New test setup, browser operation, or assertion helper -> add a suffixed
  artifact under `e2e/steps/`, `e2e/screenplay/`, or `e2e/support/`.
- Normative product, architecture, or rollout contract -> update
  `assets/docs/specs/<slug>/`.
- Shared testing rules -> update `assets/guides/TESTING_GUIDE.md` or this guide.

## Related guides

- [BDD_GHERKIN_GUIDE.md](BDD_GHERKIN_GUIDE.md) - how to write KB feature files.
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - how to run verification gates.
- [assets/docs/specs/e2e/design.md](../docs/specs/e2e/design.md) - full e2e architecture and quality model.
