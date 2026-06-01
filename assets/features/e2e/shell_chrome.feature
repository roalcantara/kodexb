@e2e @regression @p1 @spec:shell-chrome
Feature: Shell chrome
  As a keyboard-first user
  I want a Raycast-style list shell without toolbar action buttons
  So that discovery flows through the footer and command palette

  Background:
    Given the app is running with the release e2e fixture

  Scenario: Main list has no Sync toolbar button
    Then the knowledge list does not show a Sync toolbar button
