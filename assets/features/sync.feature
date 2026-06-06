@sync
Feature: Sync
  As a maintainer of my local knowledge base
  I want sync to finish even when some source files or entries are invalid
  So that one bad YAML row does not block the rest of my library

  @sync_resilience @e2e @regression @p1
  Scenario: Partial file import keeps valid rows and reports the bad entry
    Given the app is running with the release e2e fixture
    And the release fixture sources are restored on disk
    And the fixture sources include the sync resilience corpus
    When I run sync
    Then sync reports partial import from "partial_valid.yml"
    And I expand sync errors for file "partial_valid.yml"
    And sync error accordion for "partial_valid.yml" shows "broken"
    And the knowledge list includes "Sync Partial Alpha" after sync

  @sync_resilience @e2e @regression @p1
  Scenario: Malformed file is skipped and listed as failed
    Given the app is running with the release e2e fixture
    And the release fixture sources are restored on disk
    And the fixture sources include the sync resilience corpus
    When I run sync
    Then sync modal lists failed file "malformed_yaml.yml"
    And the knowledge list still includes valid fixture entries

  @sync_resilience @e2e @regression @p1
  Scenario: Sync summary shows file totals after errors
    Given the app is running with the release e2e fixture
    And the fixture sources include the sync resilience corpus
    When I run sync
    Then sync summary shows at least 1 file with errors
    And sync summary shows file totals
    And sync reports completion

  @sync_resilience @e2e @regression @p1
  Scenario: Expanding a failed file shows full error text
    Given the app is running with the release e2e fixture
    And the fixture sources include the sync resilience corpus
    When I run sync
    And I expand sync errors for file "malformed_yaml.yml"
    Then sync error accordion for "malformed_yaml.yml" shows "malformed_yaml.yml"

  @sync_frecency_preserve @unit @ac:SF-1_AC1
  Scenario: Surviving entries keep list order after full sync
    Given a temp catalog with two bookmarks and one command
    And I have visited the frequent bookmark three times and the rare bookmark once
    When I run a full source sync
    Then list order for surviving entries matches pre-sync order
    And the frequent bookmark ranks above the rare bookmark
    And the command has zero frecency score

  @sync_frecency_preserve @unit @ac:SF-1_AC2
  Scenario: Removed entries disappear without disturbing remaining order
    Given a temp catalog with two bookmarks and one command
    And I have visited the frequent bookmark three times and the rare bookmark once
    And the rare bookmark is removed from the source YAML
    When I run a full source sync
    Then the rare bookmark is absent from the list
    And list order for surviving entries matches pre-sync order

  @sync_frecency_preserve @unit @ac:SF-1_AC3
  Scenario: New entries rank below frequently used items until first open
    Given a temp catalog with two bookmarks and one command
    And I have visited the frequent bookmark three times
    And a new bookmark is added to the source YAML
    When I run a full source sync
    Then the new bookmark appears below the frequent bookmark in the list
    And the new bookmark has zero frecency score
    When I open the new bookmark once
    Then the new bookmark has a positive frecency score

  @sync_frecency_preserve @unit @ac:SF-2_AC1
  Scenario: Shortcut binding usage survives sync
    Given a temp catalog with entries and shortcuts
    And I have used the Go to File binding twice and the Command Palette binding once
    When I run a full source sync
    Then the Go to File binding score is unchanged after sync
    And the Go to File binding score exceeds the Command Palette binding score

  @sync_frecency_preserve @unit @ac:SF-2_AC2
  Scenario: Removed shortcut bindings disappear without disturbing survivors
    Given a temp catalog with entries and shortcuts
    And I have used the Go to File binding twice and the Command Palette binding once
    And the Go to File binding is removed from the source YAML
    When I run a full source sync
    Then the Go to File binding is absent from the binding list
    And the Command Palette binding is still present
    And the Go to File binding has zero score in the database
    And the Command Palette binding score is unchanged after sync

  @sync_frecency_preserve @unit @ac:SF-3_AC2
  Scenario: YAML title edits appear while entry frecency is preserved
    Given a temp catalog with two bookmarks and one command
    And the frequent bookmark has been visited twice
    When I change the frequent bookmark title in the source YAML
    And I run a full source sync
    Then the frequent bookmark has the updated title
    And the frequent bookmark frecency score is unchanged from before sync

  @sync_frecency_preserve @unit @ac:SF-3_AC4
  Scenario: Partial import leaves catalog partial but restores usage scores
    Given a temp catalog with entries and an extra bundle
    And the frequent bookmark has been visited twice
    When I run a partial source sync that processes only one bundle
    Then the number of catalog entries is reduced
    And the frequent bookmark frecency score matches the pre-sync value

  @sync_frecency_preserve @e2e @regression @p1
  Scenario: Frequently opened items keep their place after sync
    Given the app is running with the release e2e fixture
    And the release fixture sources are restored on disk
    And the release fixture is re-synced
    And I am viewing the knowledge list
    And I have opened some items several times
    When I sync my files from disk
    Then the items I use most still appear before the ones I rarely open
