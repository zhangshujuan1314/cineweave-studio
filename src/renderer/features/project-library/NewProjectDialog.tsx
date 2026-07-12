import { useState } from 'react'

interface NewProjectDialogProps {
  onConfirm: (title: string, directoryPath: string) => Promise<void>
  onCancel: () => void
}

export default function NewProjectDialog({ onConfirm, onCancel }: NewProjectDialogProps): React.ReactElement {
  const [title, setTitle] = useState('')
  const [directoryPath, setDirectoryPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSelectDir = async (): Promise<void> => {
    try {
      const result = await window.cineweave.selectProjectDirectory()
      if (!result.canceled && result.filePaths.length > 0) {
        setDirectoryPath(result.filePaths[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select directory')
    }
  }

  const handleSubmit = async (): Promise<void> => {
    setError(null)
    if (!title.trim()) { setError('Project title is required'); return }
    if (!directoryPath) { setError('Please select a directory'); return }
    setSubmitting(true)
    try {
      await onConfirm(title.trim(), directoryPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="New project">
      <div className="dialog">
        <h2 className="dialog-title">New Project</h2>
        <div className="dialog-body">
          <label className="dialog-label">
            Project Title
            <input type="text" className="dialog-input" value={title}
              onChange={(e) => setTitle(e.target.value)} placeholder="My Film Analysis"
              autoFocus maxLength={255} aria-required="true" />
          </label>
          <label className="dialog-label">
            Location
            <div className="dialog-path-row">
              <input type="text" className="dialog-input" value={directoryPath}
                readOnly placeholder="Select a directory..." aria-required="true" />
              <button className="btn-secondary" onClick={handleSelectDir} type="button">Browse</button>
            </div>
          </label>
          {error && <p className="dialog-error" role="alert">{error}</p>}
        </div>
        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
