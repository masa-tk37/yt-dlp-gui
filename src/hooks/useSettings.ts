import { useCallback, useEffect, useState } from "react"
import { api } from "../api/client"
import type { Settings } from "../types"

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const updated = await api.settings.update({ [key]: value })
      setSettings(updated)
      return updated
    },
    [],
  )

  return { settings, updateSetting, loadError }
}
