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

| Layer                | Location                                                    | Role                                                              |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Process guides       | `assets/guides/`                                            | Normative testing, BDD, and e2e policy (R11).                     |
| In-flight SDD        | `assets/specs/NNN-<slug>/`                                  | Spec Kit workspace while building (task-scoped).                  |
| Gherkin features     | `assets/features/` (domain files + legacy `e2e/` subfolder) | Product-level examples; tag `@e2e` or `@unit` for runner routing. |
| BDD browser glue     | `bdd/e2e/steps/`, `bdd/e2e/screenplay/`, `bdd/e2e/support/` | Playwright BDD step defs, Screenplay, preview harness.            |
| BDD unit glue        | `bdd/unit/steps/`, `bdd/unit/support/`, `bdd/unit/runner/`  | Cucumber + Bun App-layer acceptance (`@unit`, `@ac:…`).           |
| Unit/component specs | `src/**/*.spec.ts`, `src/**/*.test.ts`                      | Lower-level behavior and edge-case coverage.                      |

The canonical feature root is `assets/features/` (domain files such as
`sync.feature`; legacy suites remain under `assets/features/e2e/` until merged).

## Folder layout (`bdd/`)

| Path                                                        | Runner                                       | Tags                    |
| ----------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| `bdd/e2e/steps/`, `bdd/e2e/screenplay/`, `bdd/e2e/support/` | playwright-bdd + Playwright + preview server | `@e2e`                  |
| `bdd/unit/steps/`, `bdd/unit/support/`, `bdd/unit/runner/`  | `@cucumber/cucumber` via `bun` (no browser)  | `@unit`, `@ac:SF-n_ACm` |
| `bdd/e2e/.generated/`                                       | playwright-bdd output (gitignored)           | —                       |
| `tmp/bdd/e2e/`                                              | Playwright traces, JUnit, metrics            | —                       |

Commands:

- `mise run test tag <catalog_key> <slice>` — AC slice runs Cucumber unit (`sf1ac1` → `@ac:SF-1_AC1`).
- `bun run bdd:unit -- --tags @sync_frecency_preserve --tags @ac:SF-1_AC1`
- `bun run bdd:e2e` / `mise run test e2e` — browser suite only (`@e2e` in `playwright.config.ts`).

## Folder layout (legacy note)

Older docs may still say top-level `e2e/`; that tree is now `bdd/e2e/`.

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
  `assets/features/` (or legacy `assets/features/e2e/`), register steps under
  `bdd/e2e/steps/` or `bdd/unit/steps/`, and satisfy
  [TESTING_GUIDE § Cross-feature e2e acceptance (R11)](./TESTING_GUIDE.md#cross-feature-e2e-acceptance-r11).
- User-visible refactor of list, detail, palette, filter, sync, or settings →
  update or add e2e scenarios in the same increment unless the active spec
  documents an approved unit-only deferral.
- Seed data or ordering change → update `bdd/e2e/support/seed_fixture.support.ts`
  and matching Gherkin strings.
- New test setup, browser operation, or assertion helper → add a suffixed
  artifact under `bdd/e2e/steps/`, `bdd/e2e/screenplay/`, or `bdd/e2e/support/`.
- App-layer acceptance (no UI) → `bdd/unit/steps/` + register in
  `bdd/unit/support/register_steps.support.ts`.
- Shared testing rules → update `assets/guides/TESTING_GUIDE.md` or this guide.

## Related guides

- [BDD_GHERKIN_GUIDE.md](BDD_GHERKIN_GUIDE.md) — how to write KB feature files.
- [TESTING_GUIDE.md](TESTING_GUIDE.md) — how to run verification gates and e2e metrics.
