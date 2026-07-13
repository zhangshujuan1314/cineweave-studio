import { useState, useCallback, useEffect } from "react"
import TopBar from "../components/TopBar"
import EmptyState from "../components/EmptyState"
import ProjectLibrary from "../features/project-library/ProjectLibrary"
import Timeline from "../features/timeline/Timeline"
import StructureTree from "../features/analysis/StructureTree"
import CommandPalette from "../features/command-palette/CommandPalette"
import { useKeyboardShortcuts, SEEK_STEP_MS, SEEK_LARGE_STEP_MS } from "../hooks/useKeyboardShortcuts"

declare global { interface Window { cineweave: { getInfo: () => Promise<any>; selectProjectDirectory: () => Promise<any>; createProject: (req: any) => Promise<any>; openProject: (req: any) => Promise<any>; listProjects: () => Promise<any[]>; deleteProject: (req: any) => Promise<void>; renameProject: (req: any) => Promise<any>; listShots: () => Promise<any[]>; listSubtitles: () => Promise<any[]>; listMarkers: () => Promise<any[]>; listSegments: () => Promise<any[]> } } }

export default function App(): React.ReactElement {
  const [projects, setProjects] = useState<any[]>([])
  const [currentProject, setCurrentProject] = useState<any>(null)
  const [viewMode, setViewMode] = useState<string>("library")
  const [appInfo, setAppInfo] = useState<any>(null)
  const [_infoError, setInfoError] = useState<string | null>(null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [shots, setShots] = useState<any[]>([])
  const [subtitles, setSubtitles] = useState<any[]>([])
  const [markers, setMarkers] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [activePanel, setActivePanel] = useState<string>("timeline")
  const durationMs = 7200000

  useEffect(() => { window.cineweave.getInfo().then(setAppInfo).catch((err: any) => setInfoError(String(err))); window.cineweave.listProjects().then((list: any[]) => { setProjects(list.map((p: any) => ({ ...p, schemaVersion: 1 }))) }).catch(() => {}) }, [])

  useEffect(() => { if (!currentProject) return; Promise.all([window.cineweave.listShots(), window.cineweave.listSubtitles(), window.cineweave.listMarkers(), window.cineweave.listSegments()]).then(([s, sub, m, seg]) => { setShots(s); setSubtitles(sub); setMarkers(m); setSegments(seg) }).catch(() => {}) }, [currentProject])

  const handleNewProject = useCallback(async (title: string, dir: string) => { const r = await window.cineweave.createProject({ title, basePath: dir }); setProjects((prev: any[]) => [r, ...prev]); setCurrentProject(r); setViewMode("workspace") }, [])

  const handleOpenProject = useCallback(async () => { const dr = await window.cineweave.selectProjectDirectory(); if (!dr.canceled && dr.filePaths.length > 0) { const m = await window.cineweave.openProject({ projectPath: dr.filePaths[0] }); setProjects((prev: any[]) => [m, ...prev.filter((p: any) => p.projectId !== m.projectId)]); setCurrentProject(m); setViewMode("workspace") } }, [])

  const handleSelectProject = useCallback((p: any) => { setCurrentProject(p); setViewMode("workspace") }, [])
  const handleBack = useCallback(() => { setCurrentProject(null); setViewMode("library") }, [])
  const handleSeek = useCallback((ms: number) => { setCurrentTimeMs(ms) }, [])

  const commands = [
    { id: "new", label: "New Project", category: "File", action: () => setViewMode("library") },
    { id: "open", label: "Open Project", category: "File", action: handleOpenProject },
    { id: "back", label: "Back to Library", category: "Navigation", action: handleBack },
    { id: "tl", label: "Show Timeline", category: "View", action: () => setActivePanel("timeline") },
    { id: "st", label: "Show Structure", category: "View", action: () => setActivePanel("structure") },
  ]

  useKeyboardShortcuts({ onSeekForward: () => setCurrentTimeMs(t => Math.min(t + SEEK_STEP_MS, durationMs)), onSeekBackward: () => setCurrentTimeMs(t => Math.max(t - SEEK_STEP_MS, 0)), onSeekForwardLarge: () => setCurrentTimeMs(t => Math.min(t + SEEK_LARGE_STEP_MS, durationMs)), onSeekBackwardLarge: () => setCurrentTimeMs(t => Math.max(t - SEEK_LARGE_STEP_MS, 0)), onGoToStart: () => setCurrentTimeMs(0), onGoToEnd: () => setCurrentTimeMs(durationMs) })

  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowCommandPalette(v => !v) } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h) }, [])

  if (viewMode === "library" || !currentProject) {
    return (<div className="app-shell"><TopBar projectCount={projects.length} saveStatus="idle" onOpenSettings={() => {}} onOpenTasks={() => {}} /><main className="app-main">{projects.length === 0 ? <EmptyState onNewProject={() => {}} onOpenProject={handleOpenProject} appInfo={appInfo} infoError={_infoError} /> : <ProjectLibrary projects={projects} onNewProject={handleNewProject} onOpenProject={handleOpenProject} onDeleteProject={() => {}} onSelectProject={handleSelectProject} />}</main>{showCommandPalette && <CommandPalette commands={commands} onClose={() => setShowCommandPalette(false)} />}</div>)
  }

  const tlTracks = [
    { id: "shots", type: "shots" as const, label: "Shots", items: shots.map((s: any) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, label: s.label || "Shot" })) },
    { id: "subs", type: "subtitles" as const, label: "Subs", items: subtitles.map((s: any) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, label: (s.text || "").slice(0, 30) })) },
    { id: "markers", type: "markers" as const, label: "Markers", items: markers.map((m: any) => ({ id: m.id, startMs: m.timeMs, endMs: m.timeMs + 500, label: m.label || m.type, color: m.color })) },
  ]

  return (<div className="app-shell"><TopBar projectCount={projects.length} saveStatus="idle" onOpenSettings={() => {}} onOpenTasks={() => {}} /><main className="app-main" style={{ flexDirection: "column" }}><div className="workspace-header"><button className="btn-secondary" onClick={handleBack}>Library</button><h2>{currentProject.title}</h2><div className="workspace-tabs"><button className={"ws-tab" + (activePanel === "timeline" ? " active" : "")} onClick={() => setActivePanel("timeline")}>Timeline</button><button className={"ws-tab" + (activePanel === "structure" ? " active" : "")} onClick={() => setActivePanel("structure")}>Structure</button></div></div><div className="workspace-content"><div className="workspace-main">{activePanel === "timeline" ? <Timeline durationMs={durationMs} currentTimeMs={currentTimeMs} tracks={tlTracks} onSeek={handleSeek} selectedItemId={selectedItemId} onItemSelect={setSelectedItemId} /> : <StructureTree segments={segments} selectedId={selectedItemId} onSelect={setSelectedItemId} onSeek={handleSeek} />}</div><div className="workspace-sidebar"><div className="ws-info"><span>Shots: {shots.length}</span><span>Subs: {subtitles.length}</span><span>Markers: {markers.length}</span><span>Segments: {segments.length}</span></div></div></div></main>{showCommandPalette && <CommandPalette commands={commands} onClose={() => setShowCommandPalette(false)} />}</div>)
}