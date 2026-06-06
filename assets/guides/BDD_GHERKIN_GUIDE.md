<!-- markdownlint-disable-file -->

# KB BDD and Gherkin guide

KB uses Gherkin to describe user-visible app behavior as executable examples.
Use this guide while writing `.feature` files under `assets/features/e2e/` and
matching Playwright BDD step definitions under `e2e/steps/`.

**Normative contracts:** register every new Gherkin phrase in `e2e/steps/` before merge;
seed titles and tags MUST match the release fixture (`e2e/support/seed_fixture.support.ts`).
See [TESTING_GUIDE § E2e contracts](./TESTING_GUIDE.md#e2e-contracts) and this guide's step patterns below.

## Cucumber Given / When / Then (required)

From the [Cucumber Gherkin reference](https://cucumber.io/docs/gherkin/reference/):

| Keyword   | Purpose                                      | kb rule                                                             |
| --------- | -------------------------------------------- | ------------------------------------------------------------------- |
| **Given** | Establish state before the action            | No user actions that change app state; harness fixture steps are OK |
| **When**  | Single main user action (or chained actions) | One primary `When` per scenario; use `And` for follow-on actions    |
| **Then**  | Observable outcome                           | UI or user-inspectable persistence only — not SQLite or private RPC |

**Duplicate step text:** Cucumber matches step text without the keyword. Do not
write `Given I see X` and `Then I see X` with identical wording — use distinct
phrases (see step catalog).

**Background:** at most four lines; shared fixture context only. Do not hide the
behavior under test in Background ([Cucumber Background guidance](https://cucumber.io/docs/gherkin/reference/#background)).

**Then steps and persistence:** asserting `the fixture task source includes …`
is valid when the scenario reads YAML the user could open. Asserting database
rows directly is not valid in Gherkin-facing tests.

## Writing checklist

Before committing a `.feature` file, verify every item in this checklist.

- The file has one `Feature`.
- The `Feature` names a user-visible capability, not an implementation unit.
- Each `Scenario` describes one behavior.
- Each scenario uses business language that a product maintainer can read.
- Each scenario has one main `When`.
- Most scenarios have three to seven steps.
- Scenario variants use `Scenario Outline` and `Examples`.
- Fixture data names, tags, statuses, and file paths are real and seeded by the
  e2e fixture.
- Scenario text avoids CSS selectors, React component names, RPC method names,
  SQLite details, and private state.
- Every automated scenario carries at least one `@spec:<slug>` tag.
- P0/P1 scenarios keep `@todo` until automation and quality-score evidence
  exist.
- New steps are registered in `step-catalog.md` before merge.

## Feature template

Start new app e2e feature files from this structure.

```gherkin
@e2e @smoke @p0 @todo @spec:<source-spec-slug>
Feature: <user-visible capability>
  <one sentence explaining why this behavior matters for release confidence.>

  Background:
    Given the app is running with the release e2e fixture

  Scenario: <specific observable example>
    Given I am viewing <stable app area>
    When I <perform one user-visible action>
    Then I see <meaningful user-visible outcome>
```

Use first person for browser-app behavior (`I search`, `I open`, `I see`) unless
a scenario genuinely needs more than one actor.

## Tag policy

| Tag                 | Meaning                                                    |
| ------------------- | ---------------------------------------------------------- |
| `@e2e`              | Browser-level app scenario.                                |
| `@smoke`            | Fast release smoke scenario.                               |
| `@regression`       | Full regression scenario.                                  |
| `@p0`, `@p1`, `@p2` | Priority tier.                                             |
| `@spec:<slug>`      | Source SDD spec slug.                                      |
| `@todo`             | Planned but not automated; excluded from gates.            |
| `@native`           | Requires packaged Electrobun/native behavior later.        |
| `@visual`           | Contains stable screenshot assertion.                      |
| `@fixture-mutation` | Harness-only; documented in step catalog (not a gate tag). |

Playwright BDD tags (`@skip`, `@fixme`, `@fail`) apply to generated tests.
Use `@todo` for planned automation so metrics can count debt; reserve `@skip` for
temporarily broken implemented tests.

Filter smoke with:

```sh
bunx bddgen --tags "@smoke and not @todo"
```

## Step vocabulary

The table below is a **starter** subset. The full inventory lives in
[`step-catalog.md`](../features/e2e/contracts/step-catalog.md). Add a new phrase only
when existing shapes cannot express the behavior; update the catalog in the same
PR.

| Gherkin step                                            | Screenplay mapping                        |
| ------------------------------------------------------- | ----------------------------------------- |
| `Given the app is running with the release e2e fixture` | Harness fixture and preview lifecycle.    |
| `Given I am viewing the knowledge list`                 | Actor starts from a known app surface.    |
| `When I search for "Release"`                           | Actor performs a search task.             |
| `When I filter by type "bookmark"`                      | Actor changes a filter task.              |
| `When I open the detail preview`                        | Actor performs an app navigation task.    |
| `When I trigger the primary action`                     | Actor performs the selected entry action. |
| `Then the list shows "Release Bookmark"`                | Actor asks a visible-list question.       |
| `Then the detail panel shows the selected entry`        | Actor asks a detail-panel question.       |
| `Then I see action feedback for "Release Command"`      | Actor asks an action-feedback question.   |

For filter steps, prefer catalog phrases (`I choose the "bookmark" type filter`)
over abbreviated forms (`I filter by type "bookmark"`) unless the catalog is
updated to match.

## Rule blocks (optional)

When a feature has many scenarios, group them with Cucumber `Rule:`:

```gherkin
Rule: Type filters narrow the list by entry type
  Scenario Outline: Type filters show only selected entry types
    ...
```

## Background examples

Use `Background` only when every scenario in the feature needs the same context.
Do not put the behavior under test in the background.

### Prefer: shared fixture context only

```gherkin
Feature: List and detail navigation

  Background:
    Given the app is running with the release e2e fixture

  Scenario: Keyboard navigation opens the detail preview
    Given I am viewing the knowledge list
    When I move to the first entry
    And I open the detail preview
    Then the detail panel shows the selected entry
```

### Avoid: hidden behavior in `Background`

```gherkin
Background:
  Given I already opened the detail preview
```

The avoided example hides the behavior under test. Put navigation, search,
filtering, editing, or action execution in the scenario steps.

## Scenario Outline examples

Use `Scenario Outline` when the same behavior has stable variants.

```gherkin
Scenario Outline: Type filters show matching entries
  Given I am viewing the knowledge list
  When I filter by type "<type>"
  Then the list includes "<entry>"
  And the list excludes "<excluded>"

  Examples:
    | type     | entry           | excluded        |
    | bookmark | Release Bookmark | Release Command |
    | command  | Release Command  | Release Cheat   |
```

## Bad to better

Use this section when translating rough notes into executable Gherkin.

### Avoid: vague scenario with no observable contract

```gherkin
Scenario: Search works
  Given there is data
  When I use search
  Then everything updates
```

### Prefer: concrete fixture-backed behavior

```gherkin
Scenario: Search narrows the list to matching entries
  Given I am viewing the knowledge list
  When I search for "Release Bookmark"
  Then the list shows "Release Bookmark"
  And the footer reports the filtered result count
```

Use `Showing N` / filtered-count footer semantics from the fixture manifest —
not `Page N of M` unless product copy changes.

### Avoid: implementation-focused scenario

```gherkin
Scenario: Search calls RPC
  Given the React list component has mounted
  When the renderer calls entries.search
  Then the reducer stores the result
```

### Prefer: user-visible app behavior

```gherkin
Scenario: Search narrows the list to matching entries
  Given I am viewing the knowledge list
  When I search for "Release Bookmark"
  Then the list shows "Release Bookmark"
  And the list does not show "Release Command"
```

## Screenplay mapping

Keep Playwright BDD steps thin. The step definition translates Gherkin, then
Screenplay support code performs browser work and asks questions.

| Gherkin concept   | Screenplay concept | KB example                                                 |
| ----------------- | ------------------ | ---------------------------------------------------------- |
| App user          | Actor              | `the user` or `I` in scenario text.                        |
| Browser access    | Ability            | `BrowseApp` wraps the Playwright page and fixture context. |
| Business action   | Task               | `OpenDetailPreview.forSelectedEntry()`.                    |
| Browser operation | Interaction        | `PressKey.named("ArrowRight")`.                            |
| Assertion target  | Question           | `DetailPanel.matchesSelectedEntry()`.                      |
| Cross-step state  | remember / recall  | `selectedEntryTitle` after select steps.                   |
| Async UI          | eventually         | Frecency reorder, sync modal, toasts — no fixed sleep.     |

Do not put selector details or assertions directly in every step definition.
Put that behavior behind `e2e/screenplay/*.{task,question,interaction}.ts`.

References: [Serenity Screenplay](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals),
[@cucumber/screenplay.js](https://github.com/cucumber/screenplay.js/) (patterns,
not necessarily the npm package — see
[step-catalog.md](../features/e2e/contracts/step-catalog.md) § Step definition shape).

## First e2e slice boundaries

The first executable slice should be small enough to stabilize quickly and broad
enough to catch release-breaking regressions.

- Include deterministic app boot with seeded bookmark, command, cheat, and task
  entries ([fixture-manifest.md](../features/e2e/contracts/fixture-manifest.md)).
- Include search, type/tag/task filters, keyboard navigation, detail preview,
  and one observable primary action.
- Exclude packaged native-only behavior until preview smoke is trustworthy.
- Exclude broad visual screenshot coverage unless a stable named surface is
  release-critical.
- Exclude real user config, DB, and source directories; use `APP_CONFIG_PATH`
  and isolated fixture state.
