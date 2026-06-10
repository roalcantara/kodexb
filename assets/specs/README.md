# In-flight Spec Kit features

Active feature SDD lives here while implementation is in progress. See
[`assets/guides/DOC_AUTHORITY.md`](../guides/DOC_AUTHORITY.md) for layer rules and
catalog governance.

| Folder                                                                     | Status                                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`003-sync-frecency-preserve/`](003-sync-frecency-preserve/)               | In progress — preserve entry/binding frecency across sync rebuild                               |
| [`004-orchestrated-handoff/`](004-orchestrated-handoff/)                   | In progress — dual-analyze workflow + handoff-emit seam for worker dispatch                     |
| [`005-workflow-observability/`](005-workflow-observability/)               | In progress — TypeBox-validated JSONL audit + runs CLI for orchestrated-handoff                 |
| [`006-safety-hardening/`](006-safety-hardening/)                           | Draft — `spec security` subgate (secrets / deps / Electrobun surface) + handoff scrub validator |
| [`009-agentic-workflow-orchestrator/`](009-agentic-workflow-orchestrator/) | **Shipped** — program merged on `main`; optional follow-ups split to 010/011                    |
| [`010-workflow-packages/`](010-workflow-packages/)                         | Shipped — `@kb/workflow-*` workspaces + PROFILE-SDD-01 + SMOKE-01                                 |
| [`011-mise-sdd-cli/`](011-mise-sdd-cli/)                                   | Ready for PR — mise SDD hub + `spec test` + orchestrator dogfood closeout                       |

Shipped registry (YAML only): [`assets/catalog/catalog.yaml`](../catalog/catalog.yaml).
