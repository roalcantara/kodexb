@e2e @regression @p1 @spec:task-management @task_management
Feature: Task management
  As a user who keeps lightweight tasks in kb
  I want task edits to update both the UI and source data
  So that task state survives the release workflow

  Background:
    Given the app is running with the release e2e fixture
    And the release fixture is re-synced
    And I am viewing the knowledge list

  Scenario: Create a task from the app workflow
    When I create a task named "Release verification follow-up"
    Then the task list includes "Release verification follow-up"
    And the fixture task source includes "Release verification follow-up"

  Scenario: Edit an existing task
    Given I select the "Release Todo Task" task
    When I change the task description to "Confirm release smoke coverage"
    Then the detail panel shows "Confirm release smoke coverage"
    And the fixture task source includes "Confirm release smoke coverage"

  Scenario Outline: Cycle task fields from the list
    Given I select the "<task>" task
    When I cycle the task "<field>"
    Then the selected task shows the next "<field>" value

    Examples:
      | task              | field    |
      | Release Todo Task | status   |
      | Release Todo Task | priority |

  Scenario: Reorder tasks
    Given I am viewing task entries
    And "Release Todo Task" is below "Release Doing Task"
    When I move "Release Todo Task" upward
    Then "Release Todo Task" appears above "Release Doing Task"

  Scenario: Delete a task
    Given I create a task named "Temporary release task"
    When I delete the "Temporary release task" task
    Then the task list does not include "Temporary release task"
    And the fixture task source does not include "Temporary release task"
