@e2e @smoke @regression @p1 @spec:shortcuts @shortcuts
Feature: Shortcuts list and detail integration
  As a kb user
  I want shortcut keymaps in the list page like other entry types
  So that I can browse, filter, and inspect bindings alongside bookmarks and tasks

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Shortcut type filter shows keymap entries
    When I filter the list by type "Shortcut"
    Then the list shows the "Release VS Code" entry
    And the list row "Release VS Code" shows the shortcut entry glyph

  Scenario: Main search finds a keymap by binding action text
    When I search the list for "Release Go To File"
    Then the list shows the "Release VS Code" entry

  Scenario: Keymap detail navigates to chord detail and back
    Given I filter the list by type "Shortcut"
    And I select the "Release VS Code" entry
    When I open the keymap detail for the selected shortcut entry
    And I select keymap binding "Release Go To File"
    And I open chord detail for the selected binding
    Then the chord detail shows bindings for chord "cmd+p"
    When I navigate back from chord detail to keymap
    Then the keymap binding "Release Go To File" is selected
