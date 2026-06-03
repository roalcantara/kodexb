<!-- markdownlint-disable-file -->

# Implementation review — `<feature-slug>`

**Reviewer:** · **PR:** · **Spec:** `MILESTONE_02/<phase>/<feature-slug>/`

**Skills loaded:** `app-context`, `app-testing`, `app-quality-gate`

## Spec traceability

| Requirement | AC satisfied? | Test / measure cited |
| ----------- | ------------- | -------------------- |
|             |               |                      |

## Code

- [ ] FCIS boundaries preserved (no renderer→app, core→shell)
- [ ] Co-located `.spec.ts` for new/changed modules
- [ ] No `console.*` in `src/`
- [ ] TypeBox only (no Zod)
- [ ] New routes mirrored in `tools/preview/server.ts` if RPC added

## Quality gate

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Result:

## Verdict

- [ ] Approve
- [ ] Request changes (list blockers)

**Blockers:**
