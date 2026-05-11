# Graph Report - /Users/roalcantara/Work/bun/kb/src/core  (2026-05-11)

## Corpus Check
- Corpus is ~9,419 words - fits in a single context window. You may not need a graph.

## Summary
- 256 nodes · 443 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Knowledge assembly and schemas|Knowledge assembly and schemas]]
- [[_COMMUNITY_Entry parsers and base schemas|Entry parsers and base schemas]]
- [[_COMMUNITY_Source document and knowledge factory|Source document and knowledge factory]]
- [[_COMMUNITY_Entry factory, tasks, source location|Entry factory, tasks, source location]]
- [[_COMMUNITY_TypeBox validation helpers|TypeBox validation helpers]]
- [[_COMMUNITY_Entry constants and row validation|Entry constants and row validation]]
- [[_COMMUNITY_Link parsing and safeParse|Link parsing and safeParse]]
- [[_COMMUNITY_Bookmark and YouTube knowledge|Bookmark and YouTube knowledge]]
- [[_COMMUNITY_Notes and language guards|Notes and language guards]]
- [[_COMMUNITY_Entry type guards|Entry type guards]]
- [[_COMMUNITY_Path expansion helper|Path expansion helper]]
- [[_COMMUNITY_Markdown language constants|Markdown language constants]]
- [[_COMMUNITY_Defaults constant|Defaults constant]]

## God Nodes (most connected - your core abstractions)
1. `safeParse()` - 13 edges
2. `TypeBoxValidationError` - 8 edges
3. `toEntry()` - 7 edges
4. `toEntryWithSourceHint()` - 7 edges
5. `buildBookmarkPreamble()` - 7 edges
6. `parse()` - 7 edges
7. `buildPreamble()` - 6 edges
8. `approxEntryKeyLine()` - 6 edges
9. `parseBaseEntryFields()` - 5 edges
10. `parseSingleLinkItem()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `parseBaseEntryFields()` --calls--> `parse()`  [INFERRED]
  domain/models/entries/parsers/base_fields.parser.ts → validation/typebox.helper.ts
- `parseSourceBaseEntryFields()` --calls--> `parse()`  [INFERRED]
  domain/models/entries/schemas/base.schema.ts → validation/typebox.helper.ts
- `toEntry()` --calls--> `parse()`  [INFERRED]
  domain/models/entries/factories/entry.factory.ts → validation/typebox.helper.ts
- `toEntryWithSourceHint()` --calls--> `formatErrors()`  [INFERRED]
  domain/models/entries/factories/entry.factory.ts → validation/typebox.helper.ts
- `toKnowledge()` --calls--> `parse()`  [INFERRED]
  domain/models/knowledges/factories/knowledge.factory.ts → validation/typebox.helper.ts

## Communities (24 total, 3 thin omitted)

### Community 0 - "Knowledge assembly and schemas"
Cohesion: 0.06
Nodes (40): assembleDoc(), assembleNotesDoc(), AssemblyError, buildPreamble(), renderFragment(), renderNoteFragments(), doc, knowledge (+32 more)

### Community 1 - "Entry parsers and base schemas"
Cohesion: 0.09
Nodes (20): r, raw, result, parseMetaFromSource(), makeError(), parseNoteBlock(), parseNoteBlocksFromSource(), normalizeKnowledgeTag() (+12 more)

### Community 2 - "Source document and knowledge factory"
Cohesion: 0.12
Nodes (20): deriveId(), a, b, entry, expected, k, toKnowledge(), parseSourceFile() (+12 more)

### Community 3 - "Entry factory, tasks, source location"
Cohesion: 0.14
Nodes (18): e, raw, toEntry(), toEntryWithSourceHint(), parseBaseEntryFields(), approxEntryKeyLine(), escapeRegex(), nextTopLevelSectionLine() (+10 more)

### Community 4 - "TypeBox validation helpers"
Cohesion: 0.13
Nodes (19): checkCache, compile(), formatErrors(), makeGuard(), parse(), check, err, errors (+11 more)

### Community 5 - "Entry constants and row validation"
Cohesion: 0.12
Nodes (16): DEFAULT_ENTRY_ICONS, ENTRY_KEYS, ENTRY_TYPE_SECTIONS, ENTRY_TYPE_VALUES, PATTERNS, SECTION_ENTRY_TYPE_VALUES, SECTION_ENTRY_TYPES, TASK_PRIORITY_VALUES (+8 more)

### Community 6 - "Link parsing and safeParse"
Cohesion: 0.2
Nodes (14): makeError(), parseLinksFromSource(), parseSingleLinkItem(), parseTitledLink(), httpUrlSchema, LinkItem, linkItemSchema, linkMapValueSchema (+6 more)

### Community 7 - "Bookmark and YouTube knowledge"
Cohesion: 0.21
Nodes (14): buildBookmarkPreamble(), baseEntry, entry, out, extractYouTubeId(), candidates, YOUTUBE_THUMB_JPEG_STEMS, youTubeEmbedUrl() (+6 more)

### Community 8 - "Notes and language guards"
Cohesion: 0.27
Nodes (5): parseNotes(), parseNotesFromBlocks(), isNoteLang(), NoteFragment, RawNotes

### Community 10 - "Path expansion helper"
Cohesion: 0.4
Nodes (4): expandPath(), braceVar, EXPAND_PATH_CASES, mockEnv

## Knowledge Gaps
- **91 isolated node(s):** `DEFAULTS`, `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang`, `EntryKey`, `SectionEntryType` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parse()` connect `TypeBox validation helpers` to `Entry parsers and base schemas`, `Source document and knowledge factory`, `Entry factory, tasks, source location`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `toKnowledge()` connect `Source document and knowledge factory` to `TypeBox validation helpers`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `safeParse()` connect `Link parsing and safeParse` to `Entry parsers and base schemas`, `TypeBox validation helpers`, `Entry constants and row validation`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `DEFAULTS`, `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Knowledge assembly and schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Entry parsers and base schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Source document and knowledge factory` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._