import { describe, expect, it } from 'bun:test'

import { tagFrequencyClassName, tagFrequencyTier } from './tag_frequency_class.util'

describe('tag_frequency_class.util', () => {
  describe('tagFrequencyTier', () => {
    it('maps count boundaries', () => {
      expect(tagFrequencyTier(1)).toBe('rare')
      expect(tagFrequencyTier(24)).toBe('rare')
      expect(tagFrequencyTier(25)).toBe('modest')
      expect(tagFrequencyTier(99)).toBe('modest')
      expect(tagFrequencyTier(100)).toBe('common')
      expect(tagFrequencyTier(499)).toBe('common')
      expect(tagFrequencyTier(500)).toBe('dominant')
    })
  })

  describe('tagFrequencyClassName', () => {
    it('returns cmp-tag frequency modifier', () => {
      expect(tagFrequencyClassName(9)).toBe('cmp-tag cmp-tag--freq-rare')
      expect(tagFrequencyClassName(412)).toBe('cmp-tag cmp-tag--freq-common')
    })
  })
})
