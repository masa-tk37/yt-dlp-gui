import { useCallback, useRef, useState } from "react"
import { api } from "../api/client"
import type { VideoInfo } from "../types"

const MAX_FORMAT_CACHE = 50

export function useFormats() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, VideoInfo>())
  const requestId = useRef(0)

  const fetchFormats = useCallback(async (url: string) => {
    const id = ++requestId.current
    const cached = cache.current.get(url)
    if (cached) {
      setVideoInfo(cached)
      setLoading(false)
      setError(null)
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
      if (id === requestId.current) setVideoInfo(result)
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    requestId.current++
    setLoading(false)
    setVideoInfo(null)
    setError(null)
  }, [])

  return { videoInfo, fetchFormats, reset, loading, error }
}
