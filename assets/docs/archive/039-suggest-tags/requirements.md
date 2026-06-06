<!-- markdownlint-disable-file -->
# suggestTags — Requirements

## REQUIREMENT SYNTAX (EARS)

### REQ-TAG-1: Co-occurrence suggestions

1. WHEN `suggestTags(entryId)` is called for an entry with existing tags, THEN
   the system SHALL find tags that co-occur with those tags across all entries
   in the database and return the top 5 by frequency.

### REQ-TAG-2: Keyword fallback

1. WHEN the entry has no tags or fewer than 2 co-occurrence results, THEN the
   system SHALL extract keywords from `entry.key` and `entry.desc`, match them
   against all existing tag names, and include the matches.

### REQ-TAG-3: Exclusion

1. THE system SHALL exclude tags already present on the entry from the
   returned suggestions.

### REQ-TAG-4: Bounded output

1. THE system SHALL return at most 8 tag suggestions.

2. WHEN the entry does not exist, THEN the system SHALL return an empty array.
