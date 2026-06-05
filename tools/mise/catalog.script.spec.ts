import { describe, expect, it } from 'bun:test'
import { catalogListRows, loadCatalog } from '../catalog/catalog.script.ts'

describe('catalog.script', () => {
  it('catalogListRows includes command_palette pilot entry', async () => {
    const rows = catalogListRows(await loadCatalog())
    const palette = rows.find(r => r.key === 'command_palette')
    expect(palette?.status).toBe('shipped')
  })
})
