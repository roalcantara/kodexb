@e2e @regression @p1 @spec:list-frecency-sort @spec:entry-action-panel @list_frecency_sort @entry_action_panel
Feature: Frecency ranking
  As a returning kb user
  I want recently useful entries to rise in the list
  So that repeated work becomes faster over time

  Background:
    Given the app is running with the release e2e fixture
    And the release fixture is re-synced
    And I am viewing the knowledge list

  Scenario: Opening detail records a useful visit
    Given "Release Docs Link" is below "Release Todo Task"
    When I open the detail for "Release Docs Link"
    And I refresh the list
    Then "Release Docs Link" ranks above "Release Todo Task"

  Scenario: Running a primary action records usefulness
    Given "Release Command" has the highest frecency score
    And "Release Cheat" is below "Release Command"
    When I run the primary action for "Release Cheat"
    And I record 5 useful visits for "Release Cheat"
    Then "Release Cheat" ranks above "Release Command"

  Scenario: Search relevance still constrains frecency
    Given "Release Bookmark" has the highest frecency score
    When I search for "terminal command"
    Then the list shows entries matching "terminal command"
    And "Release Bookmark" is not shown unless it matches the search
