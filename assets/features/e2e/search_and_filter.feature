@e2e @smoke @p0 @spec:command-palette-filter-ux @spec:compact-filter-redesign @compact_filter
Feature: Search and filter
  As a daily kb user
  I want search and filters to narrow the list predictably
  So that I can find the right entry quickly

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Search narrows the visible entries
    When I search for "release bookmark"
    Then I see only entries matching "release bookmark"
    And the footer reports the filtered result count

  Scenario Outline: Type filters show only selected entry types
    When I open the filter overlay
    And I choose the "<type>" type filter
    Then every visible entry has type "<type>"
    And the active filter summary includes "<type>"

    Examples:
      | type     |
      | bookmark |
      | command  |
      | cheat    |
      | task     |

  Scenario: Tag filters combine with search
    When I search for "release"
    And I open the filter overlay
    And I choose the "regression" tag filter
    Then every visible entry matches "release"
    And every visible entry includes the "regression" tag

  Scenario Outline: Task view filters show the expected task subset
    When I open the filter overlay
    And I choose the "<task_view>" task view filter
    Then every visible task belongs to the "<task_view>" task view

    Examples:
      | task_view  |
      | actionable |
      | today      |
      | overdue    |
