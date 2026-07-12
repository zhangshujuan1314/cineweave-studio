import type { ProjectCreateResponse } from '../../../shared/contracts'

type ProjectMeta = ProjectCreateResponse

interface ProjectCardProps {
  project: ProjectMeta
  viewMode: 'grid' | 'list'
  onDelete: () => void
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPath(p: string): string {
  const parts = p.split('/')
  return parts.slice(-2).join('/')
}

export default function ProjectCard({ project, viewMode, onDelete }: ProjectCardProps): React.ReactElement {
  if (viewMode === 'list') {
    return (
      <div className="pcard pcard-list" role="listitem">
        <span className="pcard-title">{project.title}</span>
        <span className="pcard-date">{formatDate(project.updatedAt)}</span>
        <span className="pcard-path">{formatPath(project.path)}</span>
        <button className="pcard-delete" onClick={onDelete} aria-label={'Delete ' + project.title} title="Delete project">X</button>
      </div>
    )
  }
  return (
    <div className="pcard pcard-grid" role="listitem">
      <div className="pcard-preview"><div className="pcard-preview-placeholder">🎥</div></div>
      <div className="pcard-body">
        <h3 className="pcard-title">{project.title}</h3>
        <p className="pcard-meta"><span className="pcard-date">{formatDate(project.updatedAt)}</span></p>
        <p className="pcard-path" title={project.path}>{formatPath(project.path)}</p>
      </div>
      <button className="pcard-delete" onClick={onDelete} aria-label={'Delete ' + project.title} title="Delete project">X</button>
    </div>
  )
}
