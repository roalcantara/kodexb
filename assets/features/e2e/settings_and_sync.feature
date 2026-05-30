@e2e @regression @p1 @spec:sync-ui @spec:foundation
Feature: Settings and sync
  As a maintainer of my local knowledge base
  I want settings and sync to use the selected sources and database
  So that the app reflects my configured data

  Background:
    Given the app is running with the release e2e fixture

  Scenario: Settings shows the active fixture configuration
    When I open settings
    Then settings shows the fixture sources directory
    And settings shows the fixture database path
    And settings shows the configured page size

  Scenario: Reset restores persisted settings
    Given I open settings
    And I change the page size to "100"
    When I reset settings
    Then settings shows the persisted page size

  Scenario: Saving page size refreshes the list
    Given I open settings
    When I change the page size to "25"
    And I save settings
    Then settings reports that changes were saved
    And the knowledge list uses page size "25"

  Scenario: Sync imports fixture source changes
    Given the fixture sources include a new bookmark named "Synced Release Link"
    When I run sync
    Then sync reports completion
    And the knowledge list includes "Synced Release Link"

  @spec:sync
  Scenario: Sync reports invalid source files without losing valid entries
    Given the fixture sources include an invalid source file
    When I run sync
    Then sync reports the invalid file
    And the knowledge list still includes valid fixture entries
