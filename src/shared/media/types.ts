/**
 * Shared media types for IPC boundary crossing.
 *
 * These types are used by main (ffprobe parsing), preload (bridge), and
 * renderer (UI display).  Absolute paths MUST NOT appear in any field that
 * reaches the renderer — use basenames or project-relative paths only.
 */

// ─── Stream-level types ───────────────────────────────────────────────

export interface VideoStreamInfo {
  readonly kind: 'video';
  readonly index: number;
  readonly codecName: string;
  readonly codecLongName: string;
  readonly width: number;
  readonly height: number;
  readonly pixelFormat: string | null;
  /** Computed effective frame rate (float). */
  readonly frameRate: number | null;
  /** Raw ffprobe avg_frame_rate string, e.g. "24000/1001". */
  readonly avgFrameRate: string | null;
  readonly bitRate: number | null;
  /** Rotation from display-matrix side data, degrees: 0 | 90 | 180 | 270. */
  readonly rotation: number;
  readonly sampleAspectRatio: string | null;
  readonly displayAspectRatio: string | null;
  readonly profile: string | null;
  readonly level: number | null;
  readonly colorRange: string | null;
  readonly colorSpace: string | null;
  readonly colorTransfer: string | null;
  readonly colorPrimaries: string | null;
  /** Tags dictionary from ffprobe (language, title, etc.). */
  readonly tags: Record<string, string>;
}

export interface AudioStreamInfo {
  readonly kind: 'audio';
  readonly index: number;
  readonly codecName: string;
  readonly codecLongName: string;
  readonly sampleRate: number | null;
  readonly channels: number | null;
  readonly channelLayout: string | null;
  readonly bitRate: number | null;
  readonly language: string | null;
  readonly tags: Record<string, string>;
}

export interface SubtitleStreamInfo {
  readonly kind: 'subtitle';
  readonly index: number;
  readonly codecName: string;
  readonly codecLongName: string;
  readonly language: string | null;
  /** True for codecs like subrip/webvtt/ass/mov_text. */
  readonly isTextBased: boolean;
  readonly tags: Record<string, string>;
}

export type StreamInfo = VideoStreamInfo | AudioStreamInfo | SubtitleStreamInfo;

// ─── Compatibility ────────────────────────────────────────────────────

/** Codec + container combinations that play in an HTML5 <video> element. */
const HTML5_COMPATIBLE_FORMATS = new Set([
  'mp4',
  'mov',
  'webm',
]);

const HTML5_COMPATIBLE_VIDEO_CODECS = new Set([
  'h264',
  'vp8',
  'vp9',
  'av1',
]);

const HTML5_COMPATIBLE_AUDIO_CODECS = new Set([
  'aac',
  'mp3',
  'opus',
  'vorbis',
]);

/**
 * Heuristic for whether the media can play through an HTML5 <video> tag
 * without transcode.  This is intentionally conservative — we always
 * recommend proxy generation unless the container AND primary streams
 * are all in the known-safe set.
 */
export function isHtml5Compatible(
  formatName: string,
  video: VideoStreamInfo | null,
  audio: AudioStreamInfo | null,
): { compatible: boolean; reason: string | null } {
  const fmtLower = formatName.toLowerCase();
  // Normalise compound format names like "mov,mp4,m4a,3gp"
  const formatParts = fmtLower.split(',').map((s) => s.trim());
  const containerOk = formatParts.some((f) => HTML5_COMPATIBLE_FORMATS.has(f));

  if (!containerOk) {
    return { compatible: false, reason: `Container "${formatName}" is not HTML5 compatible` };
  }

  if (video && !HTML5_COMPATIBLE_VIDEO_CODECS.has(video.codecName)) {
    return { compatible: false, reason: `Video codec "${video.codecName}" is not HTML5 compatible` };
  }

  if (audio && !HTML5_COMPATIBLE_AUDIO_CODECS.has(audio.codecName)) {
    return { compatible: false, reason: `Audio codec "${audio.codecName}" is not HTML5 compatible` };
  }

  // Rotated video (90/270) often causes layout issues in video elements.
  if (video && (video.rotation === 90 || video.rotation === 270)) {
    return { compatible: false, reason: `Rotated video (${video.rotation}deg) may not display correctly` };
  }

  return { compatible: true, reason: null };
}

// ─── Probe result ─────────────────────────────────────────────────────

export interface ProbeResult {
  /** Basename of the probed file (never absolute). */
  readonly filename: string;
  /** Duration in milliseconds, or -1 if undetermined. */
  readonly durationMs: number;
  readonly formatName: string;
  readonly formatLongName: string;
  readonly bitRate: number | null;
  /** File size in bytes. */
  readonly size: number;
  readonly videoStreams: VideoStreamInfo[];
  readonly audioStreams: AudioStreamInfo[];
  readonly subtitleStreams: SubtitleStreamInfo[];
  /** Whether a transcode proxy is needed for HTML5 playback. */
  readonly needsTranscode: boolean;
  /** Human-readable reason when needsTranscode is true, null otherwise. */
  readonly transcodeReason: string | null;
}

// ─── Transcode ────────────────────────────────────────────────────────

export interface TranscodeOptions {
  /** Target video codec (default: "libx264"). */
  readonly videoCodec?: string;
  /** Target audio codec (default: "aac"). */
  readonly audioCodec?: string;
  /** CRF value (0-51, default 23).  Lower = higher quality / larger file. */
  readonly crf?: number;
  /** Maximum output height; width scales proportionally.  Omit for source resolution. */
  readonly maxHeight?: number;
  /** Target frame rate, null = keep source. */
  readonly frameRate?: number | null;
  /** If true, include all audio streams.  Default: first audio stream only. */
  readonly allAudioStreams?: boolean;
  /** Preset (default: "medium"). */
  readonly preset?: string;
  /** Additional ffmpeg args appended to the output position.  Trims, filters, etc. */
  readonly extraOutputArgs?: string[];
}

export interface TranscodeResult {
  /** Absolute path to the proxy file (main-process only — sanitise for IPC). */
  readonly outputPath: string;
  /** Output file size in bytes. */
  readonly size: number;
  /** Output duration in milliseconds. */
  readonly durationMs: number;
}

export interface TranscodeProgress {
  readonly jobId: string;
  readonly phase: 'starting' | 'transcoding' | 'complete' | 'error' | 'canceled';
  /** Progress 0-1, approximate. */
  readonly progress: number;
  /** Estimated remaining seconds, null if unknown. */
  readonly eta: number | null;
  /** Current frames processed. */
  readonly frames: number;
  /** Current speed multiplier (e.g. 2.3 = 2.3x realtime). */
  readonly speed: number | null;
}

// ─── Scene detection (Phase 3 interface) ──────────────────────────────

export interface SceneDetectionOptions {
  /** Sensitivity threshold 0-1 (default 0.3).  Lower = more cuts detected. */
  readonly threshold?: number;
  /** Minimum scene duration in milliseconds (default 1000).  Suppresses flashes. */
  readonly minSceneDurationMs?: number;
  /** Time window to analyse, [startMs, endMs] inclusive.  Null = full media. */
  readonly timeRange?: readonly [number, number] | null;
}

export interface SceneChangeEvent {
  /** Timecode in milliseconds where the scene changes. */
  readonly timeMs: number;
  /** Score from the select filter (0-1, higher = more certain). */
  readonly score: number;
}

// ─── Service detection ────────────────────────────────────────────────

export interface DetectionResult {
  readonly available: boolean;
  readonly ffmpegPath: string | null;
  readonly ffprobePath: string | null;
  readonly ffmpegVersion: string | null;
  readonly ffprobeVersion: string | null;
  /** User-friendly message when not found. */
  readonly message: string | null;
}

// ─── Job identifiers ──────────────────────────────────────────────────

export type MediaJobType =
  | 'probe'
  | 'transcode'
  | 'scene-detect'
  | 'thumbnail'
  | 'waveform';

export interface MediaJobInfo {
  readonly jobId: string;
  readonly type: MediaJobType;
  readonly startedAt: number;
  /** Basename of the source file, never absolute. */
  readonly sourceFilename: string;
}
