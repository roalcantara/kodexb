import type { FileSet } from './orchestrated_handoff.script'

/** Default FileSet with all files present. Reused across spec fixtures to avoid clone warnings. */
export const ALL_FILES: FileSet = {
  spec: true,
  plan: true,
  tasks: true,
  handoff: true,
  analyzePlanChecklist: true,
  analyzeTasksChecklist: true,
  handoffEmittedGherkin: true,
  implementComplete: true
}

/** Factory that fills in missing fields with ALL_FILES defaults. */
export function makeFiles(overrides: Partial<FileSet> = {}): FileSet {
  return { ...ALL_FILES, ...overrides }
}
