import { describe, it, expect } from 'vitest'
import { parseSrt, parseVtt, parseAss, detectSubtitleFormat, formatSrtTime, toSrt } from '../../src/shared/media/subtitles'

describe('Subtitle parser', () => {
  describe('SRT', () => {
    it('parses basic SRT', () => {
      const srt = [
        '1', '00:00:01,000 --> 00:00:03,500', 'Hello world', '',
        '2', '00:00:05,000 --> 00:00:08,000', 'Second line', 'Third line'
      ].join('\n')
      const entries = parseSrt(srt)
      expect(entries).toHaveLength(2)
      expect(entries[0].startMs).toBe(1000)
      expect(entries[0].endMs).toBe(3500)
      expect(entries[0].text).toBe('Hello world')
      expect(entries[1].startMs).toBe(5000)
      expect(entries[1].text).toBe('Second line\nThird line')
    })

    it('handles empty input', () => {
      expect(parseSrt('')).toHaveLength(0)
    })

    it('handles dot separator', () => {
      const srt = ['1', '00:00:01.000 --> 00:00:02.000', 'Test'].join('\n')
      const entries = parseSrt(srt)
      expect(entries).toHaveLength(1)
      expect(entries[0].startMs).toBe(1000)
    })
  })

  describe('VTT', () => {
    it('parses basic VTT', () => {
      const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello world\n\n00:00:05.000 --> 00:00:08.000\nSecond line'
      const entries = parseVtt(vtt)
      expect(entries).toHaveLength(2)
      expect(entries[0].startMs).toBe(1000)
      expect(entries[0].text).toBe('Hello world')
    })

    it('strips VTT tags', () => {
      const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<c.red>word</c>'
      const entries = parseVtt(vtt)
      expect(entries[0].text).toBe('word')
    })
  })

  describe('ASS', () => {
    it('parses basic ASS', () => {
      const ass = [
        '[Script Info]', 'Title: Test', '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
        'Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,Hello world',
        'Dialogue: 0,0:00:05.00,0:00:08.00,Default,John,0,0,0,,{\b1}Bold text'
      ].join('\n')
      const entries = parseAss(ass)
      expect(entries).toHaveLength(2)
      expect(entries[0].startMs).toBe(1000)
      expect(entries[0].endMs).toBe(3500)
      expect(entries[0].text).toBe('Hello world')
      expect(entries[1].speaker).toBe('John')
    })
  })

  describe('format detection', () => {
    it('detects SRT', () => {
      expect(detectSubtitleFormat('1\n00:00:01,000 --> 00:00:02,000\nTest')).toBe('srt')
    })
    it('detects VTT', () => {
      expect(detectSubtitleFormat('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTest')).toBe('vtt')
    })
    it('detects ASS', () => {
      expect(detectSubtitleFormat('[Script Info]\nTitle: Test')).toBe('ass')
    })
  })

  describe('formatSrtTime', () => {
    it('formats zero', () => { expect(formatSrtTime(0)).toBe('00:00:00,000') })
    it('formats 1h2m3s4ms', () => { expect(formatSrtTime(3723004)).toBe('01:02:03,004') })
  })

  describe('toSrt', () => {
    it('roundtrips SRT', () => {
      const entries = [{ index: 1, startMs: 1000, endMs: 3000, text: 'Hello' }]
      const srt = toSrt(entries)
      expect(srt).toContain('00:00:01,000 --> 00:00:03,000')
      expect(srt).toContain('Hello')
    })
  })
})
