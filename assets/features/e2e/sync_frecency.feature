@spec:sync-frecency
Feature: Sync frecency persistence
  Stretch scenario — release gate is integration tests in app_sync_frecency.spec.ts.

  Scenario: Frecency survives sync
    Given the preview harness has recorded entry visits
    When the user triggers a full catalog sync
    Then list sort order reflects pre-sync frecency for surviving entries
