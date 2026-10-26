import { ask } from "@tauri-apps/plugin-dialog"
import { DependencyErrorScreen } from "./components/DependencyErrorScreen"
import { DownloadForm } from "./components/DownloadForm"
import { DownloadQueue } from "./components/DownloadQueue"
import { Toolbar } from "./components/Toolbar"
import { useAccentColor } from "./hooks/useAccentColor"
import { useDownloadForm } from "./hooks/useDownloadForm"
import { useDownloads } from "./hooks/useDownloads"
import { useTauriBackend } from "./hooks/useTauri"
import { TERMINAL_STATUSES } from "./types"

export function App() {
  useAccentColor()
  const { error, dependencies } = useTauriBackend()
  const {
    jobs,
    addDownload,
    addBulkDownloads,
    cancelDownload,
    cancelAllDownloads,
    clearCompleted,
  } = useDownloads()
  const form = useDownloadForm(addDownload, addBulkDownloads)

  if (error || (dependencies && !dependencies.backendReady)) {
    return <DependencyErrorScreen dependencies={dependencies} error={error} />
  }

  if (!dependencies) {
    return (
      <div
        data-tauri-drag-region="deep"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "var(--secondary-label)",
        }}
      >
        <div className="spinner" />
        Starting…
      </div>
    )
  }

  const activeCount = jobs.filter(
    (j) => !TERMINAL_STATUSES.has(j.status),
  ).length
  const finishedCount = jobs.length - activeCount

  const handleStopAll = async () => {
    const confirmed = await ask(
      `Stop ${activeCount} active download${activeCount === 1 ? "" : "s"}?`,
      {
        title: "Stop All Downloads",
        kind: "warning",
        okLabel: "Stop All",
        cancelLabel: "Cancel",
      },
    )
    if (confirmed) await cancelAllDownloads()
  }

  return (
    <>
      <Toolbar
        form={form}
        activeCount={activeCount}
        finishedCount={finishedCount}
        onStopAll={handleStopAll}
        onClearFinished={clearCompleted}
      />
      <main
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          maxWidth: 760,
          margin: "0 auto",
          padding: "calc(var(--toolbar-height) + 20px) 20px 24px",
        }}
      >
        <DownloadForm form={form} />
        <DownloadQueue jobs={jobs} onCancel={cancelDownload} />
      </main>
    </>
  )
}
