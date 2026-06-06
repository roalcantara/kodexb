@e2e @regression @p1 @spec:entry-action-handoff @entry_action_handoff
Feature: Entry action handoff
  As a kb user
  I want entry actions to hand off to external apps like the arkn Raycast extension
  So that browsers, terminals, and editors receive the right payload with reliable UI feedback

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list
    And the e2e handoff API intercept is active

  # --- Footer affordances (browser-observable; no OS required) ---

  Scenario: Footer shows Open In Browser for a bookmark without secondary action
    Given I select the "Release Bookmark" entry
    Then the footer primary action is "Open In Browser"
    And the footer does not show a secondary action

  Scenario: Footer shows Paste and Run in Terminal for a command
    Given I select the "Release Command" entry
    Then the footer primary action is "Paste in Terminal"
    And the footer secondary action is "Run in Terminal"

  Scenario: Footer shows Paste Doc for a cheat without secondary action
    Given I select the "Release Cheat" entry
    Then the footer primary action is "Paste Doc"
    And the footer does not show a secondary action

  # --- Handoff RPC (preview intercept; normative for arkn mechanics) ---

  Scenario: Bookmark primary requests external open handoff
    Given I select the "Release Bookmark" entry
    When I run the primary action
    Then the handoff API receives an open external request for "https://kb.example.dev/release-bookmark"
    And a success action toast is shown

  Scenario: Command primary requests paste in terminal handoff
    Given I select the "Release Command" entry
    When I run the primary action
    Then the handoff API receives a paste in terminal request containing "echo"
    And a success action toast is shown

  Scenario: Command secondary requests run in terminal handoff
    Given I select the "Release Command" entry
    When I run the secondary action
    Then the handoff API receives a run in terminal request containing "echo"
    And a success action toast is shown

  Scenario: Cheat primary requests paste doc handoff
    Given I select the "Release Cheat" entry
    When I run the primary action
    Then the handoff API receives a paste doc handoff request
    And a success action toast is shown

  # --- Shared keyboard actions (arkn Actions / Metadata sections) ---

  Scenario: Copy Title shortcut shows success feedback
    Given I select the "Release Bookmark" entry
    When I press the copy title shortcut
    Then a success action toast is shown for copy title

  Scenario: Copy Description shortcut shows success feedback
    Given I select the "Release Bookmark" entry
    When I press the copy description shortcut
    Then a success action toast is shown for copy description

  Scenario: Open Source shortcut requests editor handoff
    Given I select the "Release Bookmark" entry
    When I press the open source shortcut
    Then the handoff API receives an open in editor request
    And a success action toast is shown

  # --- Failure path (requirements R2.5) ---

  Scenario: Handoff failure shows error toast and keeps list usable
    Given external handoff is stubbed to fail
    And I select the "Release Bookmark" entry
    When I run the primary action
    Then an error action toast is shown
    And the knowledge list surface is visible
    And the handoff API received no successful open external response

  # --- Native OS (documented; optional automation) ---

  @todo @native-handoff
  Scenario: Bookmark primary hides kb after successful browser handoff
    Given I select the "Release Bookmark" entry
    When I run the primary action in the native desktop shell
    Then the kb main window is hidden

  @todo @native-handoff
  Scenario: Command primary hides kb after successful terminal paste
    Given I select the "Release Command" entry
    When I run the primary action in the native desktop shell
    Then the kb main window is hidden
