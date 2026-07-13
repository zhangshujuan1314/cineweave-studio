/**
 * Subtitle parser for SRT, VTT, and ASS formats.
 */

export interface SubtitleEntry {
  index: number
  startMs: number
  endMs: number
  text: string
  speaker?: string
}

function parseSrtTime(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(timeStr.trim())
  if (!match) throw new Error('Invalid SRT time: ' + timeStr)
  const [, h, m, s, ms] = match
  return Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms)
}

function parseVttTime(timeStr: string): number {
  const trimmed = timeStr.trim()
  let match = /^(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(trimmed)
  if (match) {
    const [, h, m, s, ms] = match
    return Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms)
  }
  match = /^(\d{1,2}):(\d{2})\.(\d{3})$/.exec(trimmed)
  if (match) {
    const [, m, s, ms] = match
    return Number(m) * 60000 + Number(s) * 1000 + Number(ms)
  }
  throw new Error('Invalid VTT time: ' + timeStr)
}

function parseAssTime(timeStr: string): number {
  const match = /^(\d+):(\d{2}):(\d{2})\.(\d{2})$/.exec(timeStr.trim())
  if (!match) throw new Error('Invalid ASS time: ' + timeStr)
  const [, h, m, s, cs] = match
  return Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(cs) * 10
}

function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function parseSrt(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const blocks = normalizeLineEndings(content).split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    let timeLineIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) { timeLineIdx = i; break }
    }
    if (timeLineIdx < 0) continue
    const timeLine = lines[timeLineIdx]
    const timeParts = timeLine.split('-->')
    if (timeParts.length !== 2) continue
    try {
      const startMs = parseSrtTime(timeParts[0])
      const endMs = parseSrtTime(timeParts[1])
      const text = lines.slice(timeLineIdx + 1).join('\n').trim()
      if (!text) continue
      const idx = timeLineIdx > 0 && /^\d+$/.test(lines[0]) ? Number(lines[0]) : entries.length + 1
      entries.push({ index: idx, startMs, endMs, text })
    } catch { /* skip */ }
  }
  return entries
}

export function parseVtt(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const normalized = normalizeLineEndings(content)
  const headerEnd = normalized.indexOf('\n\n')
  if (headerEnd < 0) return entries
  const body = normalized.slice(headerEnd + 2)
  const blocks = body.split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    let timeLineIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) { timeLineIdx = i; break }
    }
    if (timeLineIdx < 0) continue
    const timeLine = lines[timeLineIdx]
    const timeParts = timeLine.split('-->')
    if (timeParts.length !== 2) continue
    try {
      const startMs = parseVttTime(timeParts[0])
      const endStr = timeParts[1].trim().split(/\s+/)[0]
      const endMs = parseVttTime(endStr)
      const text = lines.slice(timeLineIdx + 1).join('\n').trim()
      if (!text) continue
      const cleanText = text.replace(/<[^>]+>/g, '')
      entries.push({ index: entries.length + 1, startMs, endMs, text: cleanText })
    } catch { /* skip */ }
  }
  return entries
}

export function parseAss(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const lines = normalizeLineEndings(content).split('\n')
  let inEvents = false
  let formatFields: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '[Events]') { inEvents = true; continue }
    if (trimmed.startsWith('[') && trimmed !== '[Events]') { inEvents = false; continue }
    if (!inEvents) continue
    if (trimmed.startsWith('Format:')) {
      formatFields = trimmed.slice(7).split(',').map(f => f.trim().toLowerCase())
      continue
    }
    if (trimmed.startsWith('Dialogue:')) {
      const data = trimmed.slice(9)
      const parts = data.split(',')
      if (formatFields.length === 0) continue
      const fieldMap: Record<string, string> = {}
      for (let i = 0; i < formatFields.length - 1 && i < parts.length - 1; i++) {
        fieldMap[formatFields[i]] = parts[i].trim()
      }
      const textIdx = formatFields.indexOf('text')
      if (textIdx >= 0) {
        fieldMap['text'] = parts.slice(textIdx).join(',').trim()
      } else {
        fieldMap['text'] = parts.slice(formatFields.length - 1).join(',').trim()
      }
      try {
        const startMs = parseAssTime(fieldMap['start'] || '0:00:00.00')
        const endMs = parseAssTime(fieldMap['end'] || '0:00:00.00')
        const speaker = fieldMap['name'] || fieldMap['character'] || undefined
        let text = (fieldMap['text'] || '').replace(/\{[^}]*\}/g, '')
        text = text.replace(/\N/g, '\n').replace(/\n/g, '\n').trim()
        if (!text) continue
        entries.push({ index: entries.length + 1, startMs, endMs, text, speaker })
      } catch { /* skip */ }
    }
  }
  return entries
}

export type SubtitleFormat = 'srt' | 'vtt' | 'ass'

export function detectSubtitleFormat(content: string): SubtitleFormat {
  const trimmed = content.trim()
  if (trimmed.startsWith('WEBVTT')) return 'vtt'
  if (trimmed.includes('[Script Info]') || trimmed.includes('[V4+ Styles]')) return 'ass'
  return 'srt'
}

export function parseSubtitles(content: string, format?: SubtitleFormat): SubtitleEntry[] {
  const fmt = format || detectSubtitleFormat(content)
  switch (fmt) {
    case 'srt': return parseSrt(content)
    case 'vtt': return parseVtt(content)
    case 'ass': return parseAss(content)
  }
}

export function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const remainder = ms % 1000
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ',' + String(remainder).padStart(3, '0')
}

export function toSrt(entries: SubtitleEntry[]): string {
  return entries.map((e, i) => {
    const idx = e.index || i + 1
    return idx + '\n' + formatSrtTime(e.startMs) + ' --> ' + formatSrtTime(e.endMs) + '\n' + e.text
  }).join('\n\n') + '\n'
}
