<!-- markdownlint-disable-file -->

# Increment intake

Paste into Companion Refine or pass as `$ARGUMENTS` to `/speckit-specify`.

## Intent

<one paragraph — what and why>

## Constraints

- **Release:** v0.x
- **Out of scope:** …

## Gherkin (draft — refine on `assets/features/e2e/<slug>.feature`)

```gherkin
@spec:<slug>
Feature: …
  Scenario: …
    Given …
    When …
    Then …
```

## EARS hooks (optional ids before specify)

- **SF-1:** WHEN … THEN … — Measure: … — Evidence: `bun test …`
