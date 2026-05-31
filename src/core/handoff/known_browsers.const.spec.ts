import { describe, expect, it } from 'bun:test'
import { KNOWN_BROWSER_BUNDLE_IDS, KNOWN_BROWSERS } from './known_browsers.const'

describe('KNOWN_BROWSERS', () => {
  it('contains Chrome with correct bundle id', () => {
    expect(KNOWN_BROWSERS.Chrome).toBe('com.google.Chrome')
  })

  it('contains Safari with correct bundle id', () => {
    expect(KNOWN_BROWSERS.Safari).toBe('com.apple.Safari')
  })

  it('contains kit-based browsers', () => {
    expect(KNOWN_BROWSERS.Arc).toBe('com.arc.browser')
    expect(KNOWN_BROWSERS.Orion).toBe('com.orion.browser')
  })
})

describe('KNOWN_BROWSER_BUNDLE_IDS', () => {
  it('contains known bundle ids', () => {
    expect(KNOWN_BROWSER_BUNDLE_IDS.has('com.google.Chrome')).toBe(true)
    expect(KNOWN_BROWSER_BUNDLE_IDS.has('org.mozilla.firefox')).toBe(true)
  })

  it('does not contain unknown bundle ids', () => {
    expect(KNOWN_BROWSER_BUNDLE_IDS.has('com.example.UnknownApp')).toBe(false)
  })
})
