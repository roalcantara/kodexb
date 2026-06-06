<!-- markdownlint-disable-file -->

# Legacy SDD archive (do not link from guides)

Historical feature specifications migrated from in-flight to archaeology.
**Not** an agent entrypoint — see [`assets/guides/DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md).

## What lives here

Numbered `NNN-<slug>/` folders with archived SDD artifacts
(`requirements.md`, `design.md`, `tasks.md`, `handoff.md`). Index in
`assets/catalog/library.yaml` (tool-generated).

## Where new work goes

| Purpose | Path | Authority |
|---|---|---|
| In-flight feature specs | `assets/specs/NNN-<slug>/` | [`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md) |
| E2e acceptance contracts | `assets/features/e2e/contracts/` | [`TESTING_GUIDE.md` R11](../../guides/TESTING_GUIDE.md#cross-feature-e2e-acceptance-r11) |
| Process guides | `assets/guides/` | Per-guide ownership |
| Shipped catalog | `assets/catalog/catalog.yaml` | [`DOC_AUTHORITY.md` § Catalog](../../guides/DOC_AUTHORITY.md#catalog-governance) |

## Agent routing

Permanent docs (CLAUDE.md, AGENTS.md, README.md, guides) **must not** link into
this directory. Enforced by ast-grep. Tooling under `tools/governance/specs/`
is allowlisted.

To reference an archived spec in a conversation, name the slug
(e.g. `018-e2e`) — do not link to the file.
