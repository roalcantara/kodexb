@e2e @regression @p1 @sync
Feature: My favorite items stay on top after sync
  When I refresh my knowledge from disk, the app should not forget which
  items I use most.

  Scenario: Frequently opened items keep their place after sync
    Given I have opened some items several times
    When I sync my files from disk
    Then the items I use most still appear before the ones I rarely open
