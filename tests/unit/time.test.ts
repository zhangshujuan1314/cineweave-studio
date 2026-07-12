import { describe, it, expect } from 'vitest'
import { validateInterval, formatTimecode, msToSeconds, secondsToMs, clampMs } from '../../src/shared/time'

describe('Time utilities', () => {
  describe('validateInterval', () => {
    it('accepts valid interval', () => { expect(validateInterval(0, 1000)).toBe(true) })
    it('rejects negative start', () => { expect(validateInterval(-1, 1000)).toBe(false) })
    it('rejects start >= end', () => {
      expect(validateInterval(1000, 1000)).toBe(false)
      expect(validateInterval(1001, 1000)).toBe(false)
    })
  })
  describe('formatTimecode', () => {
    it('formats zero', () => { expect(formatTimecode(0, 24)).toBe('00:00:00:00') })
    it('formats 1 second', () => { expect(formatTimecode(1000, 24)).toBe('00:00:01:00') })
    it('formats 1 hour', () => { expect(formatTimecode(3600000, 24)).toBe('01:00:00:00') })
  })
  describe('conversions', () => {
    it('msToSeconds', () => { expect(msToSeconds(1000)).toBe(1) })
    it('secondsToMs', () => { expect(secondsToMs(1)).toBe(1000) })
  })
  describe('clampMs', () => {
    it('clamps below min', () => { expect(clampMs(-100, 0, 1000)).toBe(0) })
    it('clamps above max', () => { expect(clampMs(2000, 0, 1000)).toBe(1000) })
  })
})
