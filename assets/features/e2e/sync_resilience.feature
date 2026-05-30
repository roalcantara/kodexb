@e2e @regression @p1 @spec:sync
Feature: Sync resilience
  As a maintainer of my local knowledge base
  I want sync to finish even when some source files or entries are invalid
  So that one bad YAML row does not block the rest of my library

  Background:
    Given the app is running with the release e2e fixture
    And the fixture sources include the sync resilience corpus

  Scenario: Sync completes within bounded time when the corpus has errors
    When I run sync
    Then sync finishes within 60 seconds
    And sync reports completion

  Scenario: Partial file import keeps valid rows and reports the bad entry
    When I run sync
    Then sync reports partial import from "partial_valid.yml"
    And sync error detail mentions "broken"
    And the knowledge list includes "Sync Partial Alpha" after sync

  Scenario: Malformed file is skipped and listed as failed
    When I run sync
    Then sync modal lists failed file "malformed_yaml.yml"
    And the knowledge list still includes valid fixture entries

  Scenario: Sync summary shows file totals after errors
    When I run sync
    Then sync reports completion
    And sync summary shows at least 1 file with errors

  Scenario: Expanding a failed file shows full error text
    When I run sync
    And I expand sync errors for file "malformed_yaml.yml"
    Then sync error accordion for "malformed_yaml.yml" shows "malformed_yaml.yml"
