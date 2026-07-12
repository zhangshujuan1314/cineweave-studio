import { useState, useEffect } from 'react'
import type { AppInfo } from '../../shared/contracts'
import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'

declare global {
  interface Window {
    cineweave: {
      getInfo: () => Promise<AppInfo>
      selectProjectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
    }
  }
}

export default function App(): React.ReactElement {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)

  useEffect(() => {
    window.cineweave.getInfo()
      .then(setAppInfo)
      .catch((err: Error) => { setInfoError(err.message) })
  }, [])

  return (
    <div className="app-shell">
      <TopBar projectCount={0} saveStatus="idle"
        onOpenSettings={() => {}} onOpenTasks={() => {}} />
      <main className="app-main">
        <EmptyState
          onNewProject={() => { window.cineweave.selectProjectDirectory() }}
          onOpenProject={() => { window.cineweave.selectProjectDirectory() }}
          appInfo={appInfo} infoError={infoError} />
      </main>
    </div>
  )
}
