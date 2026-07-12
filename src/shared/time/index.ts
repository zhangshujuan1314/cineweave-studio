export function msToSeconds(ms: number): number { return ms / 1000 }
export function secondsToMs(seconds: number): number { return Math.round(seconds * 1000) }

export function formatTimecode(ms: number, frameRate = 24): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const frames = Math.floor(((ms % 1000) / 1000) * frameRate)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}

export function validateInterval(startMs: number, endMs: number): boolean {
  return startMs >= 0 && endMs > startMs
}
export function clampMs(ms: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, ms))
}
export function nowMs(): number { return Date.now() }
