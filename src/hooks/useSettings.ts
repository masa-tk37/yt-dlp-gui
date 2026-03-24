import { useState, useEffect, useCallback } from "react"
import { api } from "../api/client"
import type { Settings } from "../types"

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.settings
      .get()
      .then((s) => {
        setSettings(s)
        setLoading(false)
      })
      .catch((e) => {
        console.error("Failed to load settings:", e)
        setLoading(false)
      })
  }, [])

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = await api.settings.update(
      partial.outputDir,
      partial.maxConcurrent,
      partial.maxPlaylistItems,
    )
    setSettings(updated)
  }, [])

  return { settings, updateSettings, loading }
}
