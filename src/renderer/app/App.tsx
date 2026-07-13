import { useState, useCallback, useEffect } from 'react'
import type { ProjectCreateResponse, ProjectOpenRequest } from '../../shared/contracts'
import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'
import ProjectLibrary from '../features/project-library/ProjectLibrary'

declare global {
  interface Window {
    cineweave: {
      getInfo: () => Promise<{ name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string }>
      selectProjectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
      createProject: (req: { title: string; basePath: string }) => Promise<ProjectCreateResponse>
      openProject: (req: ProjectOpenRequest) => Promise<ProjectCreateResponse>
      listProjects: () => Promise<Array<{ projectId: string; title: string; path: string; lastOpenedAt: number }>>
      deleteProject: (req: { projectPath: string }) => Promise<void>
      renameProject: (req: { projectPath: string; newTitle: string }) => Promise<{ projectId: string; title: string; updatedAt: number }>
    }
  }
}

type ProjectMeta = ProjectCreateResponse

export default function App(): React.ReactElement {
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectMeta | null>(null)
  const [appInfo, setAppInfo] = useState<{ name: string; version: string; platform: string; arch: string; electronVersion: string; nodeVersion: string; chromeVersion: string } | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [saveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    window.cineweave.getInfo().then(setAppInfo).catch((err) => setInfoError(String(err)))
    window.cineweave.listProjects().then((list) => {
      setProjects(list.map(p => ({
        projectId: p.projectId,
        title: p.title,
        path: p.path,
        schemaVersion: 1,
        createdAt: p.lastOpenedAt,
        updatedAt: p.lastOpenedAt
      })))
    }).catch(() => { /* ignore */ })
  }, [])

  const handleNewProject = useCallback(async (title: string, directoryPath: string): Promise<void> => {
    const result = await window.cineweave.createProject({ title, basePath: directoryPath })
    setProjects((prev) => [result, ...prev])
    setCurrentProject(result)
  }, [])

  const handleOpenProject = useCallback(async (): Promise<void> => {
    const dirResult = await window.cineweave.selectProjectDirectory()
    if (!dirResult.canceled && dirResult.filePaths.length > 0) {
      const meta = await window.cineweave.openProject({ projectPath: dirResult.filePaths[0] })
      setProjects((prev) => {
        const exists = prev.find((p) => p.projectId === meta.projectId)
        return exists ? prev.map((p) => p.projectId === meta.projectId ? meta : p) : [meta, ...prev]
      })
      setCurrentProject(meta)
    }
  }, [])

  const handleDeleteProject = useCallback((project: ProjectMeta): void => {
    setProjects((prev) => prev.filter((p) => p.projectId !== project.projectId))
    if (currentProject?.projectId === project.projectId) {
      setCurrentProject(null)
    }
    window.cineweave.deleteProject({ projectPath: project.path }).catch(() => { /* ignore */ })
  }, [currentProject])

  const handleSelectProject = useCallback((project: ProjectMeta): void => {
    setCurrentProject(project)
  }, [])

  const handleBackToLibrary = useCallback((): void => {
    setCurrentProject(null)
  }, [])

  if (!currentProject) {
    return (
      <div className="app-shell">
        <TopBar projectCount={projects.length} saveStatus="idle" onOpenSettings={() => {}} onOpenTasks={() => {}} />
        <main className="app-main">
          {projects.length === 0 ? (
            <EmptyState
              onNewProject={() => {}}
              onOpenProject={handleOpenProject}
              appInfo={appInfo}
              infoError={infoError}
            />
          ) : (
            <ProjectLibrary
              projects={projects}
              onNewProject={handleNewProject}
              onOpenProject={handleOpenProject}
              onDeleteProject={handleDeleteProject}
              onSelectProject={handleSelectProject}
            />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        projectCount={projects.length}
        saveStatus={saveStatus}
        onOpenSettings={() => {}}
        onOpenTasks={() => {}}
      />
      <main className="app-main">
        <div className="project-workspace">
          <div className="project-header">
            <button className="btn-secondary" onClick={handleBackToLibrary}>← Back to Library</button>
            <h2>{currentProject.title}</h2>
          </div>
          <div className="project-content">
            <p className="text-secondary">Project workspace — Phase 3 (Timeline & Shots) coming soon</p>
            <div className="project-info">
              <span>Path: {currentProject.path}</span>
              <span>Schema: v{currentProject.schemaVersion}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
