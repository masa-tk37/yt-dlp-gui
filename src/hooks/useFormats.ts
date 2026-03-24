import { useState, useCallback, useRef } from "react"
import { api } from "../api/client"
import type { VideoInfo } from "../types"

const MAX_FORMAT_CACHE = 50

export function useFormats() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, VideoInfo>())

  const fetchFormats = useCallback(async (url: string) => {
    const cached = cache.current.get(url)
    if (cached) {
      setVideoInfo(cached)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await api.formats.list(url)
      if (cache.current.size >= MAX_FORMAT_CACHE) {
        const firstKey = cache.current.keys().next().value
        if (firstKey !== undefined) cache.current.delete(firstKey)
      }
      cache.current.set(url, result)
      setVideoInfo(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch formats")
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setVideoInfo(null)
    setError(null)
  }, [])

  return { videoInfo, fetchFormats, reset, loading, error }
}
