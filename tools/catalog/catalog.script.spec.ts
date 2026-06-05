import { describe, expect, it } from 'bun:test'
import { catalogListRows, catalogRunTag, findByCatalogRef, normalizeTag } from './catalog.script.ts'

describe('catalog.lib', () => {
  it('normalizeTag adds @ prefix', () => {
    expect(normalizeTag('command_palette')).toBe('@command_palette')
    expect(normalizeTag('@command_palette')).toBe('@command_palette')
  })

  it('catalogRunTag derives tag from catalog key', () => {
    expect(catalogRunTag('command_palette')).toBe('@command_palette')
  })

  it('findByCatalogRef resolves by key or tag', () => {
    const catalog = {
      command_palette: { title: 'Command palette and filter UX', status: 'shipped' }
    }
    expect(findByCatalogRef(catalog, 'command_palette')?.id).toBe('command_palette')
    expect(findByCatalogRef(catalog, '@command_palette')?.id).toBe('command_palette')
    expect(findByCatalogRef(catalog, '@command_palette')?.tag).toBe('@command_palette')
  })

  it('catalogListRows maps entries', () => {
    const rows = catalogListRows({
      command_palette: {
        title: 'Palette',
        status: 'shipped',
        specs: ['014-command-palette-filter-ux'],
        superseded_by: null
      }
    })
    expect(rows).toEqual([
      {
        key: 'command_palette',
        title: 'Palette',
        status: 'shipped',
        specs: ['014-command-palette-filter-ux'],
        superseded_by: null
      }
    ])
  })
})
