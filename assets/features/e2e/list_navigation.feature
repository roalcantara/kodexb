@e2e @smoke @p0 @spec:renderer-nav-flow @spec:foundation @list_navigation
Feature: List navigation
  As a daily kb user
  I want the knowledge list to open with predictable content and keyboard flow
  So that I can inspect entries without touching the mouse

  Background:
    Given the app is running with the release e2e fixture

  Scenario: Seeded list shows the main entry types
    Given I am viewing the knowledge list
    Then I see a bookmark entry
    And I see a command entry
    And I see a cheat entry
    And I see a task entry

  Scenario: Keyboard navigation cycles list, split, full detail, and list
    Given I am viewing the knowledge list
    When I move to the first entry
    And I open the detail preview
    And I expand the detail view
    And I return to the split view
    And I return to the list view
    Then the list surface is focused
    And no detail panel is visible

  Scenario: Row selection follows arrow keys in split view
    Given I am viewing the knowledge list
    And I move to the first entry
    And I open the detail preview
    When I move to the next entry
    Then the selected row changes
    And the detail panel shows the selected entry
