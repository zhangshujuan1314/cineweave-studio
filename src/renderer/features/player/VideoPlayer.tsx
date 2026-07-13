import { useRef, useEffect, useCallback, useState } from 'react'

interface VideoPlayerProps {
  src: string
  currentTimeMs: number
  onTimeUpdate: (timeMs: number) => void
  onPlayStateChange?: (playing: boolean) => void
  subtitles?: Array<{ startMs: number; endMs: number; text: string }>
}

export default function VideoPlayer({
  src,
  currentTimeMs,
  onTimeUpdate,
  onPlayStateChange,
  subtitles = []
}: VideoPlayerProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const seekPendingRef = useRef(false)

  // Sync external time → video
  useEffect(() => {
    const video = videoRef.current
    if (!video || seekPendingRef.current) return
    const diff = Math.abs(video.currentTime * 1000 - currentTimeMs)
    if (diff > 100) {
      video.currentTime = currentTimeMs / 1000
    }
  }, [currentTimeMs])

  // Video time → external
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    seekPendingRef.current = false
    onTimeUpdate(Math.round(video.currentTime * 1000))
  }, [onTimeUpdate])

  const handlePlay = useCallback(() => {
    setPlaying(true)
    onPlayStateChange?.(true)
  }, [onPlayStateChange])

  const handlePause = useCallback(() => {
    setPlaying(false)
    onPlayStateChange?.(false)
  }, [onPlayStateChange])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video) setDuration(Math.round(video.duration * 1000))
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }, [])

  const seek = useCallback((ms: number) => {
    const video = videoRef.current
    if (!video) return
    seekPendingRef.current = true
    video.currentTime = ms / 1000
    onTimeUpdate(ms)
  }, [onTimeUpdate])

  // Find current subtitle
  const currentSub = subtitles.find(s => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs)

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
      />
      {currentSub && (
        <div className="vp-subtitle-overlay">
          <span>{currentSub.text}</span>
        </div>
      )}
      <div className="vp-controls">
        <button className="vp-btn" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
        <input
          type="range"
          className="vp-seek"
          min={0}
          max={duration}
          value={currentTimeMs}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="vp-time">{formatTime(currentTimeMs)} / {formatTime(duration)}</span>
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
