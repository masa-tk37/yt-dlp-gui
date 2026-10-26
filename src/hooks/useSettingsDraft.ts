import { useCallback, useEffect, useRef, useState } from "react"
import type { Settings } from "../types"
import { useSettings } from "./useSettings"

export type SettingKey = keyof Settings
type Draft = Record<SettingKey, string>

export const NUMBER_RANGES = {
  maxConcurrent: { min: 1, max: 10 },
  maxPlaylistItems: { min: 1, max: 1000 },
} as const

function toDraft(s: Settings): Draft {
  return {
    outputDir: s.outputDir,
    maxConcurrent: String(s.maxConcurrent),
    maxPlaylistItems: String(s.maxPlaylistItems),
  }
}

function parse(key: SettingKey, raw: string): string | number | null {
  // Untrimmed: folder names from the picker may legitimately end in spaces.
  if (key === "outputDir") return raw.trim() ? raw : null
  const { min, max } = NUMBER_RANGES[key]
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= min && n <= max ? n : null
}

export function useSettingsDraft() {
  const { settings, updateSetting, loadError } = useSettings()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Partial<Record<SettingKey, string>>>({})
  const committed = useRef<Settings | null>(null)
  // One queue for every field: a late response can never roll back a newer save.
  const queue = useRef<Promise<void>>(Promise.resolve())

  committed.current = settings
  useEffect(() => {
    if (settings && !draft) setDraft(toDraft(settings))
  }, [settings, draft])

  const setField = useCallback((key: SettingKey, raw: string) => {
    setDraft((d) => (d ? { ...d, [key]: raw } : d))
  }, [])

  const settle = useCallback((key: SettingKey, sent: string, next: string) => {
    setDraft((d) => (d && d[key] === sent ? { ...d, [key]: next } : d))
  }, [])

  const commit = useCallback(
    (key: SettingKey, raw: string) => {
      // Compared inside the queue: at call time a pending save has not yet updated `committed`.
      queue.current = queue.current.then(async () => {
        const current = committed.current
        if (!current) return
        const value = parse(key, raw)
        if (value === null) {
          settle(key, raw, String(current[key]))
          return
        }
        if (value === current[key]) return

        try {
          const saved = await updateSetting(key, value as never)
          committed.current = saved
          setErrors((e) => ({ ...e, [key]: undefined }))
          settle(key, raw, String(saved[key]))
        } catch (e) {
          setErrors((prev) => ({
            ...prev,
            [key]: e instanceof Error ? e.message : String(e),
          }))
          settle(key, raw, String(current[key]))
        }
      })
    },
    [settle, updateSetting],
  )

  const flush = useCallback(() => queue.current, [])

  return { draft, errors, loadError, setField, commit, flush }
}
