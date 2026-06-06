@e2e @regression @p1 @spec:shortcuts @shortcuts
Feature: Shortcuts quick-lookup overlay
  As a keyboard-first kb user
  I want a global overlay to find keymap bindings by action or chord
  So that I can resolve collisions and recall shortcuts quickly

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Quick-lookup opens focused and closes with escape
    When I open the shortcuts quick-lookup overlay
    Then the shortcuts quick-lookup overlay is open with search focused
    When I dismiss the shortcuts quick-lookup overlay
    Then the shortcuts quick-lookup overlay is closed
    And the knowledge list is ready for keyboard navigation

  Scenario: Text search finds a binding by action name
    When I open the shortcuts quick-lookup overlay
    And I search shortcuts for "Release Go To File"
    Then the shortcuts overlay shows a row with action "Release Go To File"

  Scenario: Chord search shows conflicts-first card for a shared chord
    When I open the shortcuts quick-lookup overlay
    And I search shortcuts by chord "cmd+p"
    Then the shortcuts overlay shows a conflicts card for "cmd+p"
    And the shortcuts overlay lists bindings for "release-vscode" and "release-browser"

  Scenario: Hard collision row shows warning glyph
    When I open the shortcuts quick-lookup overlay
    And I search shortcuts for "Release Spotlight"
    Then the shortcuts overlay row "Release Spotlight" shows a hard collision warning

  Scenario: Overlay filter modal limits results to one app
    When I open the shortcuts quick-lookup overlay
    And I open the shortcuts overlay filter modal
    And I select shortcuts overlay filter app "release-vscode"
    Then every visible shortcuts overlay row belongs to app "release-vscode"
