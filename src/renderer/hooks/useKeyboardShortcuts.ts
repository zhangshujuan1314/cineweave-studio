import { useEffect, useCallback } from 'react'

interface KeyboardShortcutHandlers {
  onPlayPause?: () => void
  onSeekForward?: () => void
  onSeekBackward?: () => void
  onSeekForwardLarge?: () => void
  onSeekBackwardLarge?: () => void
  onGoToStart?: () => void
  onGoToEnd?: () => void
  onMarkIn?: () => void
  onMarkOut?: () => void
  onSplitShot?: () => void
  onAddMarker?: () => void
}

const SEEK_STEP_MS = 500
const SEEK_LARGE_STEP_MS = 5000

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if user is typing in an input
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault()
        handlers.onPlayPause?.()
        break
      case 'l':
      case 'L':
        e.preventDefault()
        handlers.onSeekForward?.()
        break
      case 'j':
      case 'J':
        e.preventDefault()
        handlers.onSeekBackward?.()
        break
      case 'ArrowRight':
        e.preventDefault()
        if (e.shiftKey) handlers.onSeekForwardLarge?.()
        else handlers.onSeekForward?.()
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (e.shiftKey) handlers.onSeekBackwardLarge?.()
        else handlers.onSeekBackward?.()
        break
      case 'Home':
        e.preventDefault()
        handlers.onGoToStart?.()
        break
      case 'End':
        e.preventDefault()
        handlers.onGoToEnd?.()
        break
      case 'i':
      case 'I':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onMarkIn?.()
        }
        break
      case 'o':
      case 'O':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onMarkOut?.()
        }
        break
      case 's':
      case 'S':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onSplitShot?.()
        }
        break
      case 'm':
      case 'M':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onAddMarker?.()
        }
        break
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export { SEEK_STEP_MS, SEEK_LARGE_STEP_MS }
