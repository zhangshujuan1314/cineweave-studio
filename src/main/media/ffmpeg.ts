import { spawn, execFile, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

// ── Types ──────────────────────────────────────────────────────

export interface ProbeStream {
  index: number
  codecType: 'video' | 'audio' | 'subtitle' | 'data' | 'unknown'
  codecName: string
  width?: number
  height?: number
  frameRate?: string   // e.g. "24000/1001"
  bitRate?: number
  channels?: number
  sampleRate?: number
  language?: string
  rotation?: number     // display rotation metadata
  duration?: string
}

export interface ProbeResult {
  container: string
  durationMs: number
  durationSeconds: number
  bitRate: number
  streams: ProbeStream[]
  raw: string           // raw ffprobe JSON output
}

export interface TranscodeOptions {
  inputPath: string
  outputPath: string
  width?: number
  height?: number
  videoBitrate?: string
  audioBitrate?: string
}

// ── FFmpeg detection ──────────────────────────────────────────

let ffmpegPath: string | null = null
let ffprobePath: string | null = null

function resolveBundledPath(name: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'ffmpeg', name)
  }
  // Development: look in system PATH
  return name
}

export async function detectFfmpeg(): Promise<{ ffmpeg: string; ffprobe: string; found: boolean }> {
  const platform = process.platform
  const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'

  // Try bundled first, then PATH
  const bundledFfmpeg = resolveBundledPath(ffmpegName)
  const bundledFfprobe = resolveBundledPath(ffprobeName)

  if (existsSync(bundledFfmpeg) && existsSync(bundledFfprobe)) {
    ffmpegPath = bundledFfmpeg
    ffprobePath = bundledFfprobe
    return { ffmpeg: bundledFfmpeg, ffprobe: bundledFfprobe, found: true }
  }

  // Check PATH
  try {
    await execFileAsync(ffmpegName, ['-version'])
    await execFileAsync(ffprobeName, ['-version'])
    ffmpegPath = ffmpegName
    ffprobePath = ffprobeName
    return { ffmpeg: ffmpegName, ffprobe: ffprobeName, found: true }
  } catch {
    return { ffmpeg: ffmpegName, ffprobe: ffprobeName, found: false }
  }
}

function getFfmpeg(): string {
  if (!ffmpegPath) throw new Error('FFmpeg not configured. Run detectFfmpeg() first.')
  return ffmpegPath
}

function getFfprobe(): string {
  if (!ffprobePath) throw new Error('FFprobe not configured. Run detectFfmpeg() first.')
  return ffprobePath
}

// ── execFile promise wrapper ──────────────────────────────────

function execFileAsync(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

// ── Probe ──────────────────────────────────────────────────────

export async function probe(inputPath: string): Promise<ProbeResult> {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputPath
  ]
  const raw = await execFileAsync(getFfprobe(), args)
  const data = JSON.parse(raw)

  const format = data.format || {}
  const streamList: ProbeStream[] = (data.streams || []).map((s: Record<string, unknown>) => ({
    index: s.index as number,
    codecType: mapCodecType(s.codec_type as string),
    codecName: (s.codec_name as string) || 'unknown',
    width: s.width as number | undefined,
    height: s.height as number | undefined,
    frameRate: s.r_frame_rate as string | undefined,
    bitRate: s.bit_rate ? Number(s.bit_rate) : undefined,
    channels: s.channels as number | undefined,
    sampleRate: s.sample_rate ? Number(s.sample_rate) : undefined,
    language: s.tags && (s.tags as Record<string, unknown>).language as string | undefined,
    rotation: detectRotation(s),
    duration: s.duration as string | undefined
  }))

  return {
    container: format.format_name || 'unknown',
    durationMs: format.duration ? Math.round(Number(format.duration) * 1000) : 0,
    durationSeconds: format.duration ? Number(format.duration) : 0,
    bitRate: format.bit_rate ? Number(format.bit_rate) : 0,
    streams: streamList,
    raw
  }
}

function mapCodecType(codecType: string): ProbeStream['codecType'] {
  switch (codecType) {
    case 'video': return 'video'
    case 'audio': return 'audio'
    case 'subtitle': return 'subtitle'
    case 'data': return 'data'
    default: return 'unknown'
  }
}

function detectRotation(stream: Record<string, unknown>): number | undefined {
  const tags = stream.tags as Record<string, unknown> | undefined
  const sideDataList = stream.side_data_list as Array<Record<string, unknown>> | undefined
  if (sideDataList) {
    for (const sd of sideDataList) {
      if (sd.rotation !== undefined && sd.rotation !== null) {
        return Number(sd.rotation)
      }
    }
  }
  if (tags?.rotate) {
    return Number(tags.rotate)
  }
  return undefined
}

// ── Transcode (proxy generation) ───────────────────────────────

export function spawnTranscode(
  options: TranscodeOptions,
  onProgress: (pct: number) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): ChildProcess {
  const args: string[] = [
    '-y',
    '-i', options.inputPath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    '-nostats',
    options.outputPath
  ]

  if (options.width && options.height) {
    args.splice(-6, 0, '-vf', `scale=${options.width}:${options.height}`)
  }

  const proc = spawn(getFfmpeg(), args, {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  // Parse progress from ffmpeg stdout
  proc.stdout?.on('data', (data: Buffer) => {
    const text = data.toString()
    const timeMatch = /out_time_us=(\d+)/.exec(text) || /out_time=(\d+):(\d+):(\d+)/.exec(text)
    if (timeMatch) {
      // Rough progress; caller should provide total duration for accurate %
      onProgress(-1) // indeterminate
    }
  })

  proc.on('close', (code) => {
    if (code === 0) onComplete()
    else onError(new Error(`FFmpeg exited with code ${code}`))
  })

  proc.on('error', onError)

  return proc
}

// ── Scene detection (for Phase 3, interface ready now) ────────

export async function detectScenes(
  inputPath: string,
  threshold = 0.3,
  minShotDurationMs = 1000
): Promise<number[]> {
  const args = [
    '-i', inputPath,
    '-vf', `select='gt(scene,${threshold})',showinfo`,
    '-vsync', 'vfr',
    '-f', 'null',
    '-'
  ]
  const raw = await execFileAsync(getFfmpeg(), args)
  const timestamps: number[] = []
  const regex = /pts_time:([\d.]+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    const tMs = Math.round(Number(match[1]) * 1000)
    // Filter out shots shorter than minShotDurationMs
    if (timestamps.length === 0 || tMs - timestamps[timestamps.length - 1] >= minShotDurationMs) {
      timestamps.push(tMs)
    }
  }
  return timestamps
}
