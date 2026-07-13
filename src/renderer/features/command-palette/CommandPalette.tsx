import { useState, useEffect, useRef, useCallback } from 'react'

interface Command {
  id: string
  label: string
  shortcut?: string
  category?: string
  action: () => void
}

interface CommandPaletteProps {
  commands: Command[]
  onClose: () => void
}

export default function CommandPalette({ commands, onClose }: CommandPaletteProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || (c.category || '').toLowerCase().includes(query.toLowerCase()))
    : commands

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedIndex(0) }, [query])

  const execute = useCallback((cmd: Command) => { cmd.action(); onClose() }, [onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape': e.preventDefault(); onClose(); break
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); break
      case 'Enter': e.preventDefault(); if (filtered[selectedIndex]) execute(filtered[selectedIndex]); break
    }
  }, [filtered, selectedIndex, execute, onClose])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-dialog" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input ref={inputRef} className="cp-input" placeholder="Type a command..." value={query} onChange={e => setQuery(e.target.value)} />
        <div className="cp-list" ref={listRef}>
          {filtered.length === 0 && <div className="cp-empty">No commands found</div>}
          {filtered.map((cmd, i) => (
            <div key={cmd.id} className={`cp-item ${i === selectedIndex ? 'cp-item-selected' : ''}`}
              onClick={() => execute(cmd)} onMouseEnter={() => setSelectedIndex(i)}>
              <span className="cp-item-label">{cmd.label}</span>
              {cmd.category && <span className="cp-item-category">{cmd.category}</span>}
              {cmd.shortcut && <span className="cp-item-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
