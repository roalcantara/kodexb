@e2e @regression @p1 @spec:shortcuts
Feature: Shortcuts import and sync collisions
  As a kb maintainer
  I want sync to surface hard global binding collisions
  So that YAML edits are validated before I rely on the overlay

  Background:
    Given the app is running with the release e2e fixture
    And I am viewing the knowledge list

  Scenario: Sync reports a hard global collision after YAML introduces a clashing binding
    Given the fixture sources include a new global shortcut binding that clashes with an existing global
    When I run sync
    Then sync reports a hard collision for the clashing chord
    When I open the shortcuts quick-lookup overlay
    And I search shortcuts for "Release Clash E2E"
    Then the shortcuts overlay row "Release Clash E2E" shows a hard collision warning
