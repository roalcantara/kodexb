@e2e @regression @p1 @spec:command-palette-filter-ux
Feature: Command palette
  As a keyboard-first kb user
  I want the command palette to expose contextual actions
  So that I can act without leaving the current list flow

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Palette opens with library and app actions when no row is selected
    Given no list row is selected
    When I open the command palette
    Then the palette shows the "Library" section
    And the palette shows the "App" section
    And the palette does not show the "This entry" section

  Scenario: Palette includes entry actions for a selected row
    Given I select the "Release Bookmark" entry
    When I open the command palette
    Then the palette shows the "This entry" section
    And the palette shows the "Clipboard" section
    And the palette shows the "Source" section

  Scenario: Palette search narrows actions
    Given I select the "Release Bookmark" entry
    When I open the command palette
    And I search palette actions for "copy"
    Then every visible palette action matches "copy"

  Scenario: Palette escape restores list workflow
    Given I open the command palette
    When I dismiss the command palette
    Then the command palette is closed
    And the knowledge list is ready for keyboard navigation
