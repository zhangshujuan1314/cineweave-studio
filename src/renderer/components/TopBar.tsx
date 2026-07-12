interface TopBarProps {
  projectCount: number
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onOpenSettings: () => void
  onOpenTasks: () => void
}

export default function TopBar({ projectCount: _pc, saveStatus, onOpenSettings, onOpenTasks }: TopBarProps): React.ReactElement {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <h1 className="topbar-title">CineWeave Studio</h1>
        <span className="topbar-subtitle">影织</span>
      </div>
      <div className="topbar-center">
        {saveStatus !== 'idle' && (
          <span className={`save-indicator save-${saveStatus}`} aria-live="polite">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </span>
        )}
      </div>
      <nav className="topbar-right" aria-label="Quick actions">
        <button className="topbar-btn" onClick={onOpenSettings} title="Settings" aria-label="Open settings">&#x2699;</button>
        <button className="topbar-btn" onClick={onOpenTasks} title="Tasks" aria-label="Open task center">&#x1F4CB;</button>
      </nav>
    </header>
  )
}
