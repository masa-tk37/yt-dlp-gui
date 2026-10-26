import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { api } from "../api/client"

const ACCENT_COLOR_EVENT = "accent-color"

function apply(hex: string | null) {
  if (hex) document.documentElement.style.setProperty("--accent", hex)
}

export function useAccentColor() {
  useEffect(() => {
    api.appearance
      .accentColor()
      .then(apply, (e) => console.error("Failed to read accent color:", e))
    const unlisten = listen<string>(ACCENT_COLOR_EVENT, (e) => apply(e.payload))
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [])
}
