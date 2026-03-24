import { useState } from "react"
import { PiGearSix, PiArrowLeft } from "react-icons/pi"
import { useDownloads } from "./hooks/useDownloads"
import { useTauriBackend } from "./hooks/useTauri"
import { APP_NAME } from "./constants/app-info"
import { DownloadForm } from "./components/DownloadForm"
import { DownloadQueue } from "./components/DownloadQueue"
import { SettingsView } from "./components/SettingsView"
import { DependencyErrorScreen } from "./components/DependencyErrorScreen"
import { FoxLogo } from "./components/FoxLogo"

const MAX_CONTENT_WIDTH = 760

export function App() {
  const { ready, error, dependencies } = useTauriBackend()
  const {
    jobs,
    addDownload,
    addBulkDownloads,
    cancelDownload,
    cancelAllDownloads,
    clearCompleted,
  } = useDownloads()
  const [view, setView] = useState<"main" | "settings">("main")
  const isSettings = view === "settings"

  if (error) {
    return <DependencyErrorScreen dependencies={dependencies} />
  }

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>Initializing...</span>
      </div>
    )
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        style={{
          borderBottom: "1.5px solid var(--border)",
          background: "rgba(253, 247, 239, 0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: "0 auto",
            padding: "13px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FoxLogo size={36} />
            <div>
              <div
                style={{
                  fontFamily: '"Fredoka", sans-serif',
                  fontSize: 22,
                  color: "var(--primary)",
                  lineHeight: 1.1,
                  letterSpacing: "0.02em",
                }}
              >
                {APP_NAME}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                }}
              >
                media downloader
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView(isSettings ? "main" : "settings")}
            className="nav-toggle"
            title={isSettings ? "Back" : "Settings"}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: `1.5px solid ${isSettings ? "var(--primary)" : "var(--border)"}`,
              background: isSettings ? "var(--primary-dim)" : "var(--bg-input)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSettings ? "var(--primary)" : "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {isSettings ? <PiArrowLeft size={16} /> : <PiGearSix size={16} />}
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          overflow: "hidden",
          maxWidth: MAX_CONTENT_WIDTH,
          width: "100%",
          margin: "0 auto",
          padding: "28px 24px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!isSettings ? (
          <div
            key="main"
            className="fade-in-up"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              flex: 1,
              overflow: "hidden",
            }}
          >
            <DownloadForm
              onDownload={addDownload}
              onBulkDownload={addBulkDownloads}
            />
            <DownloadQueue
              jobs={jobs}
              onCancel={cancelDownload}
              onCancelAll={cancelAllDownloads}
              onClearCompleted={clearCompleted}
            />
          </div>
        ) : (
          <div
            key="settings"
            className="fade-in-up"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <SettingsView dependencies={dependencies} />
          </div>
        )}
      </main>
    </div>
  )
}
