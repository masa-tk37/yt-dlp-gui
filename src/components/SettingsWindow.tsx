import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect } from "react"
import { useAccentColor } from "../hooks/useAccentColor"
import { useSettingsDraft } from "../hooks/useSettingsDraft"
import { useTauriBackend } from "../hooks/useTauri"
import { SettingsPanel } from "./SettingsPanel"
import { ToolsPanel } from "./ToolsPanel"

export function SettingsWindow() {
  useAccentColor()
  const { dependencies } = useTauriBackend()
  const settings = useSettingsDraft()
  const { flush } = settings

  useEffect(() => {
    const win = getCurrentWindow()
    // Created hidden by the backend; show after first paint so dark mode never flashes white.
    // WebKit suspends rAF while the view is hidden, so a hidden page shows directly.
    const show = () => void win.show()
    if (document.visibilityState === "visible") requestAnimationFrame(show)
    else show()

    // Closing with ⌘W skips blur, so commit the focused field and wait for the save first.
    const unlisten = win.onCloseRequested(async () => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur()
      await flush()
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [flush])

  return (
    <main
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <SettingsPanel settings={settings} />
      {dependencies && <ToolsPanel dependencies={dependencies} />}
    </main>
  )
}
