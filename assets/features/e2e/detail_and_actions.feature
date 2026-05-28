@e2e @smoke @p0 @spec:phase-7-detail-view @spec:entry-action-panel @spec:actions-system
Feature: Detail and entry actions
  As a kb user
  I want detail and primary actions to reflect the selected entry
  So that I can trust the app before acting on a result

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Detail shows metadata and body for the selected entry
    Given I select the "Release Bookmark" entry
    When I open the detail preview
    Then the detail panel shows "Release Bookmark"
    And the detail panel shows its source
    And the detail panel shows its tags
    And the detail panel shows its notes

  Scenario Outline: Primary action produces an observable result
    Given I select the "<entry>" entry
    When I run the primary action
    Then I see a successful action result for "<entry>"

    Examples:
      | entry            |
      | Release Bookmark |
      | Release Command  |

  Scenario: Copy action uses the selected entry payload
    Given I select the "Release Cheat" entry
    When I copy the selected entry
    Then the clipboard action reports the copied "Release Cheat" content

  Scenario: Opening source uses the selected entry source
    Given I select the "Release Bookmark" entry
    When I open the selected entry source
    Then the source action targets the fixture source file
