@e2e @regression @spec:task-source-atomicity @task_source_atomicity
Feature: Task source atomicity
  As a user mutating tasks
  I want mutation outcomes to be truthful and conflict-safe
  So I can trust persistence and diagnostics

  Background:
    Given the app is running with the release e2e fixture
    And the release fixture is re-synced
    And I am viewing the knowledge list

  @spec:task-source-atomicity @e2e @regression @ac:TSA-1
  Scenario: Task mutation reports failure on source write failure
    Given I am viewing task entries
    And task source persistence is unavailable
    When I create a task named "Atomicity failure probe"
    Then the latest task mutation outcome status is "source_write_failed"

  @spec:task-source-atomicity @e2e @regression @ac:TSA-2
  Scenario: Failed mutation does not create sync reversal
    Given I am viewing task entries
    And I select the "Release Todo Task" task
    And task mutation source version is stale
    When I change the task description to "Stale conflict probe"
    Then the latest task mutation outcome status is "conflict"

  @spec:task-source-atomicity @e2e @regression @ac:TSA-3
  Scenario: Mutation failure emits correlated structured diagnostics
    Given I am viewing task entries
    And task source persistence is unavailable
    When I create a task named "Diagnostic probe"
    Then mutation diagnostics include operation "create"
    And mutation diagnostics include a unique correlation id
