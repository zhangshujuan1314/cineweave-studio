import { useState } from 'react'
import type { ProjectCreateResponse } from '../../../shared/contracts'
import ProjectCard from './ProjectCard'
import NewProjectDialog from './NewProjectDialog'

type ProjectMeta = ProjectCreateResponse

interface ProjectLibraryProps {
  projects: ProjectMeta[]
  onNewProject: (title: string, directoryPath: string) => Promise<void>
  onOpenProject: () => Promise<void>
  onDeleteProject: (project: ProjectMeta) => void
}

export default function ProjectLibrary({ projects, onNewProject, onOpenProject, onDeleteProject }: ProjectLibraryProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const filtered = search.trim() ? projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())) : projects
  const hasProjects = projects.length > 0

  return (
    <div className="project-library" role="region" aria-label="Project library">
      <div className="pl-toolbar">
        <div className="pl-search">
          <input type="search" className="pl-search-input" placeholder="Search projects..." value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search projects by title" />
        </div>
        <div className="pl-actions">
          <div className="pl-view-toggle" role="radiogroup" aria-label="View mode">
            <button className={'pl-view-btn' + (viewMode === 'grid' ? ' active' : '')}
              onClick={() => setViewMode('grid')} role="radio" aria-checked={viewMode === 'grid'} aria-label="Grid view">#</button>
            <button className={'pl-view-btn' + (viewMode === 'list' ? ' active' : '')}
              onClick={() => setViewMode('list')} role="radio" aria-checked={viewMode === 'list'} aria-label="List view">=</button>
          </div>
          <button className="btn-primary" onClick={() => setShowNewDialog(true)}>New Project</button>
          <button className="btn-secondary" onClick={onOpenProject}>Open Project</button>
        </div>
      </div>
      {!hasProjects && !search && (
        <div className="pl-empty"><div className="pl-empty-icon">🎬</div><h2>No projects yet</h2><p>Create a new project to start analyzing your first film.</p></div>
      )}
      {!hasProjects && search && <div className="pl-empty"><p>No projects match your search.</p></div>}
      {hasProjects && (
        <div className={'pl-grid pl-grid-' + viewMode} role="list">
          {filtered.map((p) => <ProjectCard key={p.projectId} project={p} viewMode={viewMode} onDelete={() => onDeleteProject(p)} />)}
        </div>
      )}
      {showNewDialog && (
        <NewProjectDialog
          onConfirm={async (title, dirPath) => { await onNewProject(title, dirPath); setShowNewDialog(false) }}
          onCancel={() => setShowNewDialog(false)} />
      )}
    </div>
  )
}
