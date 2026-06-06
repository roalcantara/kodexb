# Catalog (`assets/catalog/`)

YAML registries only — no feature prose, no skill prose. Human process lives in `assets/guides/`.

| File                           | Purpose                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`catalog.yaml`](catalog.yaml) | Shipped-feature registry (metadata + lifecycle). List: `mise run catalog list`. Validate: `mise run catalog validate`. Ship gate: `mise run catalog ship <key>`. Executables: `mise run test tag <key> --list` via `@<key>` tags. |
| [`library.yaml`](library.yaml) | Legacy SDD archive folder index (NNN-slug → path). Tool-generated from `tools/governance/specs/library_manifest.script.ts`. Do not hand-edit. Verify: `bun tools/governance/specs/library_manifest.script.ts --verify`. |
| [`SKILLS.yaml`](SKILLS.yaml)   | Agent skill registry (owned / project / global). Edit via `mise run skill add`, `create`, or `reconcile`; validate with `mise run skill validate`.                                                                                |

```bash
mise run catalog list
mise run catalog validate
mise run catalog ship command_palette
mise run test tag --list
mise run test tag command_palette --list
mise run test tag command_palette
```

See [`assets/guides/DOC_AUTHORITY.md`](../guides/DOC_AUTHORITY.md) for catalog governance and [`assets/guides/SKILLS.md`](../guides/SKILLS.md) for skill schema and workflows.
