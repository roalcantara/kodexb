export type SkillLocation = 'owned' | 'project' | 'global'

export type PolicyType = 'required' | 'routed' | 'optional' | 'reference' | 'blocked'

export type SkillPolicy = {
  type: PolicyType
  usage?: {
    summary?: string
    when?: { load?: string[]; avoid?: string[] }
  }
  routing?: Record<string, unknown>
  surfaces?: Record<string, string>
  reason?: string
  redirect_to?: string[]
}

export type SkillEntry = {
  location: SkillLocation
  rationale: string
  policy: SkillPolicy
}

export type SkillRegistry = {
  schema_version: number
  description?: string
  locations?: Record<string, string>
  skills: Record<string, SkillEntry>
}

export type FindingCategory =
  | 'schema'
  | 'lock_without_yaml'
  | 'yaml_without_lock'
  | 'global_in_lock'
  | 'installed_missing'
  | 'installed_extra'
  | 'policy_incomplete'
  | 'owned_dir_missing'

export type Finding = {
  category: FindingCategory
  skill_id?: string
  message: string
}

export type DriftReport = {
  actual_skills: string[]
  expected_skills: string[]
  missing: string[]
  extra: string[]
}

export type ValidatePayload = {
  valid: boolean
  schema_version: number
  counts_by_location: Record<string, number>
  counts_by_policy_type: Record<string, number>
  findings: Finding[]
  summary: Record<string, number>
  drift: DriftReport | null
}

export type SkillListRow = {
  id: string
  location: SkillLocation
  policy_type: PolicyType
  rationale: string
  usage_summary?: string
  load_triggers?: string[]
  avoid_triggers?: string[]
  installed: boolean
  install_path?: string
  blocked?: { reason?: string; redirect_to?: string[] }
  electrobun_routes?: string[]
  incomplete?: boolean
}

export type ListFormat = 'compact' | 'grouped' | 'cards'

export type CliOptions = {
  action: string
  raw: boolean
  json: boolean
  dryRun: boolean
  listSkills: boolean
  listFormat: ListFormat
  verbose: boolean
  interactive: boolean
  locations: Set<SkillLocation>
  types: Set<PolicyType>
  installedOnly: boolean
  missingOnly: boolean
  url?: string
  skillId?: string
  policyType?: PolicyType
  rationale?: string
  description?: string
  extraArgs: string[]
}

export type ReconcilePayload = {
  mode: 'dry-run' | 'write'
  missing_in_yaml: string[]
  orphan_in_yaml: string[]
  global_in_lock: string[]
  owned_drift: string[]
  would_append: string[]
  would_write: boolean
}

export type ReportPayload = {
  schema_version: number
  total_skills: number
  by_location: Record<string, number>
  by_policy_type: Record<string, number>
  electrobun_routes: number
  valid: boolean
  drift: DriftReport
  skills?: SkillListRow[]
}
