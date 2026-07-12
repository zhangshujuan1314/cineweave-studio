export class FfmpegNotFoundError extends Error {
  constructor() { super('FFmpeg/FFprobe not found. Please install FFmpeg or configure the path in Settings.') }
}

export class MediaProbeError extends Error {
  constructor(fileName: string, cause: string) {
    super('Failed to probe ' + fileName + ': ' + cause)
  }
}

export class TranscodeError extends Error {
  constructor(fileName: string, cause: string) {
    super('Transcode failed for ' + fileName + ': ' + cause)
  }
}

export class MediaNotFoundError extends Error {
  constructor() { super('Media file not found. The file may have been moved or deleted.') }
}
