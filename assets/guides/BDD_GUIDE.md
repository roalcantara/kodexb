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

## External references

| Source                    | URL                                                                                               | kb usage                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Cucumber                  | [cucumber.io/docs](https://cucumber.io/docs)                                                      | Executable Gherkin; Given/When/Then semantics |
| Serenity Screenplay       | [Screenplay fundamentals](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals) | Actor, tasks, questions vocabulary            |
| `@cucumber/screenplay.js` | [github.com/cucumber/screenplay.js](https://github.com/cucumber/screenplay.js/)                   | Thin steps, remember/recall, eventually       |

Do not add CodeceptJS or a second Cucumber runner without an explicit spike
documented in the active feature spec.

## Verification layers

| Layer                | Location                                                       | Role                                                                                 |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Process guides       | `assets/guides/`                                               | Normative testing, BDD, and e2e policy (R11).                                        |
| In-flight SDD        | `assets/specs/NNN-<slug>/`                                     | Spec Kit workspace while building (task-scoped).                                     |
| Gherkin features     | `assets/features/e2e/`                                         | Product-level examples that describe user-visible behavior.                          |
| Playwright glue      | `e2e/steps/`, `e2e/screenplay/`, `e2e/support/`                | Executable step definitions, Screenplay tasks/questions, and deterministic fixtures. |
| Unit/component specs | `src/**/*.spec.ts`, `src/**/*.test.ts`                         | Lower-level behavior and edge-case coverage.                                         |

The canonical feature domain for app e2e is `assets/features/e2e/`.

## Folder layout

- `assets/features/e2e/` — canonical Gherkin `.feature` files.
- `e2e/steps/` — thin Playwright BDD step definitions.
- `e2e/screenplay/` — actors, abilities, tasks, questions, and interactions.
- `e2e/support/` — deterministic fixture setup, preview lifecycle, reports, and
  metrics helpers.
- `e2e/.generated/` — playwright-bdd output (gitignored).
- `tmp/e2e/` — generated traces, reports, and per-run metrics.

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
locators (Cucumber guidance), then stable app-owned test ids when accessible
names cannot express the target.

## When to add what

- New release-facing app behavior → add or update a scenario under
  `assets/features/e2e/`, register steps under `e2e/steps/`, and satisfy
  [TESTING_GUIDE § Cross-feature e2e acceptance (R11)](./TESTING_GUIDE.md#cross-feature-e2e-acceptance-r11).
- User-visible refactor of list, detail, palette, filter, sync, or settings →
  update or add e2e scenarios in the same increment unless the active spec
  documents an approved unit-only deferral.
- Seed data or ordering change → update `e2e/support/seed_fixture.support.ts`
  and matching Gherkin strings.
- New test setup, browser operation, or assertion helper → add a suffixed
  artifact under `e2e/steps/`, `e2e/screenplay/`, or `e2e/support/`.
- Shared testing rules → update `assets/guides/TESTING_GUIDE.md` or this guide.

## Related guides

- [BDD_GHERKIN_GUIDE.md](BDD_GHERKIN_GUIDE.md) — how to write KB feature files.
- [TESTING_GUIDE.md](TESTING_GUIDE.md) — how to run verification gates and e2e metrics.
