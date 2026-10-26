import { useCallback, useRef, useState } from "react"
import {
  FORMAT_PRESET_AUDIO,
  FORMAT_PRESET_MP4,
  MP4_FORMAT_STRING,
} from "../constants/format-presets"
import type { useDownloads } from "./useDownloads"
import { useFormats } from "./useFormats"

type Downloads = ReturnType<typeof useDownloads>

export function useDownloadForm(
  onDownload: Downloads["addDownload"],
  onBulkDownload: Downloads["addBulkDownloads"],
) {
  const [url, setUrl] = useState("")
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null)
  const [formatId, setFormatId] = useState<string>(FORMAT_PRESET_MP4)
  const [audioOnly, setAudioOnly] = useState(false)
  const { videoInfo, fetchFormats, reset, loading, error } = useFormats()
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const playlistEntries = videoInfo?.isPlaylist
    ? (videoInfo.entries ?? [])
    : null

  const resetResult = () => {
    reset()
    setFetchedUrl(null)
    setSubmitError(null)
    setSelectedEntries(new Set())
    // Format IDs are per-video; a kept selection may not exist in the next result.
    setFormatId(FORMAT_PRESET_MP4)
  }

  const startFetch = (rawUrl: string) => {
    resetResult()
    setFetchedUrl(rawUrl)
    fetchFormats(rawUrl)
  }

  const clearForm = () => {
    resetResult()
    setUrl("")
    setAudioOnly(false)
  }

  const clear = () => {
    clearForm()
    urlInputRef.current?.focus()
  }

  const fetch = () => {
    if (loading || !url.trim()) return
    startFetch(url.trim())
  }

  const pasteUrl = (pasted: string): boolean => {
    if (!pasted.startsWith("http")) return false
    setUrl(pasted)
    startFetch(pasted)
    return true
  }

  const submitDownload = async (sourceUrl: string) => {
    if (playlistEntries) {
      const entries = playlistEntries.filter((_, i) => selectedEntries.has(i))
      if (entries.length > 0) {
        await onBulkDownload(
          entries.map((e) => e.url),
          audioOnly ? undefined : MP4_FORMAT_STRING,
          audioOnly || undefined,
          entries.map((e) => e.title),
        )
      }
    } else {
      const isAudio = formatId === FORMAT_PRESET_AUDIO
      const resolvedFormatId =
        formatId === FORMAT_PRESET_MP4 ? MP4_FORMAT_STRING : formatId
      await onDownload(
        sourceUrl,
        isAudio ? undefined : resolvedFormatId || undefined,
        isAudio || undefined,
        videoInfo?.title,
      )
    }
  }

  const download = async () => {
    if (!fetchedUrl) return
    setSubmitError(null)
    try {
      await submitDownload(fetchedUrl)
      clearForm()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  const toggleAll = () => {
    if (!playlistEntries) return
    setSelectedEntries(
      selectedEntries.size === playlistEntries.length
        ? new Set()
        : new Set(playlistEntries.map((_, i) => i)),
    )
  }

  const toggleEntry = useCallback((index: number) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  return {
    url,
    setUrl,
    urlInputRef,
    loading,
    error: error ?? submitError,
    videoInfo,
    playlistEntries,
    formatId,
    setFormatId,
    audioOnly,
    setAudioOnly,
    selectedEntries,
    fetch,
    pasteUrl,
    clear,
    download,
    toggleAll,
    toggleEntry,
  }
}

export type DownloadFormState = ReturnType<typeof useDownloadForm>
