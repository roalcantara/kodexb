import { describe, expect, it } from 'bun:test'
import { runShip } from './catalog_ship.script'

describe('catalog_ship.script', () => {
  it('runShip fails when catalog key is unknown', async () => {
    const payload = await runShip({ key: '__no_such_feature__' })
    expect(payload.ready).toBe(false)
    expect(payload.checks.some(c => c.id === 'catalog_entry' && !c.ok)).toBe(true)
  })

  it('runShip includes provenance shape for known pilot key', async () => {
    const payload = await runShip({ key: 'command_palette' })
    expect(payload.key).toBe('command_palette')
    expect(payload.tag).toBe('@command_palette')
    expect(Array.isArray(payload.provenance.features)).toBe(true)
    expect(Array.isArray(payload.provenance.units)).toBe(true)
    expect(payload.checks.length).toBeGreaterThan(0)
  })
})
