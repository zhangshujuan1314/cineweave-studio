import { useState, useCallback } from 'react'
import type { ProjectCreateResponse, ProjectOpenRequest } from '../../shared/contracts'
import TopBar from '../components/TopBar'
import ProjectLibrary from '../features/project-library/ProjectLibrary'

declare global {
  interface Window {
    cineweave: {
      selectProjectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
      createProject: (req: { title: string; basePath: string }) => Promise<ProjectCreateResponse>
      openProject: (req: ProjectOpenRequest) => Promise<ProjectCreateResponse>
    }
  }
}

type ProjectMeta = ProjectCreateResponse

export default function App(): React.ReactElement {
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  const handleNewProject = useCallback(async (title: string, directoryPath: string): Promise<void> => {
    const result = await window.cineweave.createProject({ title, basePath: directoryPath })
    setProjects((prev) => [result, ...prev])
  }, [])

  const handleOpenProject = useCallback(async (): Promise<void> => {
    const dirResult = await window.cineweave.selectProjectDirectory()
    if (!dirResult.canceled && dirResult.filePaths.length > 0) {
      const meta = await window.cineweave.openProject({ projectPath: dirResult.filePaths[0] })
      setProjects((prev) => {
        const exists = prev.find((p) => p.projectId === meta.projectId)
        return exists ? prev.map((p) => p.projectId === meta.projectId ? meta : p) : [meta, ...prev]
      })
    }
  }, [])

  const handleDeleteProject = useCallback((project: ProjectMeta): void => {
    setProjects((prev) => prev.filter((p) => p.projectId !== project.projectId))
  }, [])

  return (
    <div className="app-shell">
      <TopBar projectCount={projects.length} saveStatus="idle" onOpenSettings={() => {}} onOpenTasks={() => {}} />
      <main className="app-main">
        <ProjectLibrary projects={projects} onNewProject={handleNewProject}
          onOpenProject={handleOpenProject} onDeleteProject={handleDeleteProject} />
      </main>
    </div>
  )
}
