# Catalog (`assets/catalog/`)

YAML registries only — no feature prose, no skill prose. Human process lives in `assets/guides/`.

| File                           | Purpose                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`catalog.yaml`](catalog.yaml) | Shipped-feature registry (metadata + lifecycle). Discovery: `mise run feature find <key>` via `@<key>` tags on Gherkin and unit specs.             |
| [`SKILLS.yaml`](SKILLS.yaml)   | Agent skill registry (owned / project / global). Edit via `mise run skill add`, `create`, or `reconcile`; validate with `mise run skill validate`. |

See [`assets/docs/specs/000-governance/design.md`](../docs/specs/000-governance/design.md) for catalog governance and [`assets/guides/SKILLS.md`](../guides/SKILLS.md) for skill schema and workflows.
