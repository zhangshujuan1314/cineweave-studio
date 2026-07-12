import type { AppInfo } from '../../shared/contracts'

interface EmptyStateProps {
  onNewProject: () => void
  onOpenProject: () => void
  appInfo: AppInfo | null
  infoError: string | null
}

export default function EmptyState({ onNewProject, onOpenProject, appInfo, infoError }: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty-state" role="region" aria-label="Project library">
      <div className="empty-state-content">
        <div className="empty-state-icon">&#x1F3AC;</div>
        <h2 className="empty-state-title">Welcome to CineWeave Studio</h2>
        <p className="empty-state-desc">
          Import a video to start your first film breakdown &mdash; shot by shot, frame by frame.
        </p>
        <div className="empty-state-actions">
          <button className="btn-primary" onClick={onNewProject} aria-label="Create a new project">New Project</button>
          <button className="btn-secondary" onClick={onOpenProject} aria-label="Open an existing project">Open Project</button>
        </div>
        {appInfo && (
          <div className="empty-state-info" role="status" aria-label="Application information">
            <span>v{appInfo.version}</span><span aria-hidden="true"> &middot; </span>
            <span>{appInfo.platform}</span><span aria-hidden="true"> &middot; </span>
            <span>Electron {appInfo.electronVersion}</span>
          </div>
        )}
        {infoError && <div className="empty-state-error" role="alert">Unable to load app info: {infoError}</div>}
      </div>
    </div>
  )
}
