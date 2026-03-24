import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

export interface ToolInfo {
  version: string
  path: string
}

export interface DependencyStatus {
  ytdlp: ToolInfo | null
  ffmpeg: ToolInfo | null
}

export function useTauriBackend() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dependencies, setDependencies] = useState<DependencyStatus | null>(
    null,
  )

  useEffect(() => {
    let unlistenReady: (() => void) | undefined
    let unlistenCrashed: (() => void) | undefined
    let unlistenDeps: (() => void) | undefined

    const init = async () => {
      try {
        // Register all listeners in parallel to minimize the window for missed events
        ;[unlistenReady, unlistenCrashed, unlistenDeps] = await Promise.all([
          listen("backend-ready", () => {
            setReady(true)
          }),
          listen<{ error: string }>("backend-crashed", (event) => {
            setError(event.payload.error)
          }),
          listen<DependencyStatus>("dependency-status", (event) => {
            setDependencies(event.payload)
          }),
        ])

        // Race condition guard: setup() emits events before the WebView registers listeners.
        try {
          const deps = await invoke<DependencyStatus>("get_dependency_status")
          setDependencies(deps)
          if (deps.ytdlp !== null) {
            setReady(true)
          } else {
            setError(
              "yt-dlp not found in PATH. Install with: brew install yt-dlp",
            )
          }
        } catch {
          // Command unavailable — events will fire when ready
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    void init()

    return () => {
      unlistenReady?.()
      unlistenCrashed?.()
      unlistenDeps?.()
    }
  }, [])

  return { ready, error, dependencies }
}
