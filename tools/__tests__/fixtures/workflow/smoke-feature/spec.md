# Smoke Feature

**Branch**: `feature/smoke-feature`
**Status**: Draft

## REQUIREMENT SMK-1: Orchestrator smoke gate

**Slice**: MVP

1. WHEN the orchestrator runs this feature through the default profile, THEN the terminal gate SHALL pass.
   - **Measure**: `mise run spec gate assets/specs/010-workflow-packages` or smoke fixture gate exits 0.
   - **Evidence**: Smoke workflow green.
