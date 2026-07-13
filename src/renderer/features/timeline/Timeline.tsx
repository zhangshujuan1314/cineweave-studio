import { useState, useCallback, useRef } from 'react'

interface TimelineTrack {
  id: string
  type: 'shots' | 'subtitles' | 'markers' | 'emotion'
  label: string
  items: TimelineItem[]
}

interface TimelineItem {
  id: string
  startMs: number
  endMs: number
  label: string
  color?: string
}

interface TimelineProps {
  durationMs: number
  currentTimeMs: number
  tracks: TimelineTrack[]
  onSeek: (timeMs: number) => void
  onItemSelect?: (itemId: string, trackId: string) => void
  selectedItemId?: string
}

const MS_PER_PIXEL = 10 // 10ms per pixel at zoom level 1
const TRACK_HEIGHT = 40

export default function Timeline({
  durationMs,
  currentTimeMs,
  tracks,
  onSeek,
  onItemSelect,
  selectedItemId
}: TimelineProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [scrollLeft, setScrollLeft] = useState(0)

  const pixelsPerMs = MS_PER_PIXEL * zoom
  const totalWidth = Math.max(durationMs * pixelsPerMs, 800)

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const timeMs = x / pixelsPerMs
    onSeek(Math.max(0, Math.min(durationMs, timeMs)))
  }, [scrollLeft, pixelsPerMs, durationMs, onSeek])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(z => Math.max(0.1, Math.min(10, z * delta)))
    }
  }, [])

  const formatTime = (ms: number): string => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  const renderRuler = () => {
    const markers: React.ReactElement[] = []
    const stepMs = zoom < 0.5 ? 60000 : zoom < 2 ? 10000 : 5000
    for (let t = 0; t <= durationMs; t += stepMs) {
      const x = t * pixelsPerMs
      markers.push(
        <div key={t} className="tl-ruler-mark" style={{ left: x }}>
          <span className="tl-ruler-label">{formatTime(t)}</span>
        </div>
      )
    }
    return markers
  }

  const renderPlayhead = () => {
    const x = currentTimeMs * pixelsPerMs
    return <div className="tl-playhead" style={{ left: x }} />
  }

  const renderItems = (track: TimelineTrack) => {
    return track.items.map(item => {
      const x = item.startMs * pixelsPerMs
      const w = Math.max((item.endMs - item.startMs) * pixelsPerMs, 2)
      const isSelected = item.id === selectedItemId
      return (
        <div
          key={item.id}
          className={`tl-item tl-item-${track.type} ${isSelected ? 'tl-item-selected' : ''}`}
          style={{ left: x, width: w, background: item.color || undefined }}
          onClick={(e) => { e.stopPropagation(); onItemSelect?.(item.id, track.id) }}
          title={`${item.label}\n${formatTime(item.startMs)} - ${formatTime(item.endMs)}`}
        >
          <span className="tl-item-label">{item.label}</span>
        </div>
      )
    })
  }

  return (
    <div className="timeline" ref={containerRef} onWheel={handleWheel}>
      <div className="tl-controls">
        <button className="tl-zoom-btn" onClick={() => setZoom(z => Math.max(0.1, z * 0.8))}>−</button>
        <span className="tl-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="tl-zoom-btn" onClick={() => setZoom(z => Math.min(10, z * 1.25))}>+</button>
      </div>
      <div className="tl-scroll-container" onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
        <div className="tl-ruler" style={{ width: totalWidth }} onClick={handleRulerClick}>
          {renderRuler()}
          {renderPlayhead()}
        </div>
        {tracks.map(track => (
          <div key={track.id} className="tl-track" style={{ height: TRACK_HEIGHT, width: totalWidth }}>
            <div className="tl-track-label">{track.label}</div>
            <div className="tl-track-items">
              {renderItems(track)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
