export type CatalogFindingCategory = 'schema' | 'shipped_no_tags' | 'orphan_tag' | 'placement' | 'forbidden_field'

export type CatalogFinding = {
  category: CatalogFindingCategory
  level: 'error' | 'warn'
  key?: string
  file?: string
  message: string
}

export type CatalogValidatePayload = {
  valid: boolean
  findings: CatalogFinding[]
  summary: Record<string, number>
}

export type CatalogShipCheck = {
  id: string
  ok: boolean
  message: string
}

export type CatalogShipPayload = {
  ready: boolean
  key: string
  status: string
  tag: string
  checks: CatalogShipCheck[]
  provenance: {
    features: string[]
    units: string[]
  }
}
