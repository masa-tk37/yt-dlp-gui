import { type KeyboardEvent, memo, useRef, useState } from "react"
import { PiMusicNote, PiX } from "react-icons/pi"
import {
  FORMAT_PRESET_AUDIO,
  FORMAT_PRESET_MP4,
  MP4_FORMAT_STRING,
} from "../constants/format-presets"
import { useFormats } from "../hooks/useFormats"
import {
  fieldLabel,
  formInput,
  primaryButton,
  sectionCard,
} from "../styles/form-styles"
import { PlaylistView } from "./PlaylistView"
import { SingleVideoView } from "./SingleVideoView"

interface DownloadFormProps {
  onDownload: (
    url: string,
    formatId?: string,
    audioOnly?: boolean,
    title?: string,
  ) => Promise<void>
  onBulkDownload: (
    urls: string[],
    formatId?: string,
    audioOnly?: boolean,
    titles?: string[],
  ) => Promise<void>
}

// Memoized: the parent re-renders on every download-progress event.
export const DownloadForm = memo(function DownloadForm({
  onDownload,
  onBulkDownload,
}: DownloadFormProps) {
  const [url, setUrl] = useState("")
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
    setSubmitError(null)
    setSelectedEntries(new Set())
    // Format IDs are per-video; a kept selection may not exist in the next result.
    setFormatId(FORMAT_PRESET_MP4)
  }

  const startFetch = (rawUrl: string) => {
    resetResult()
    fetchFormats(rawUrl)
  }

  const clearForm = () => {
    resetResult()
    setUrl("")
    setAudioOnly(false)
  }

  const handleClear = () => {
    clearForm()
    urlInputRef.current?.focus()
  }

  const handleFetch = () => {
    if (loading || !url.trim()) return
    startFetch(url.trim())
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim()
    if (pasted.startsWith("http")) {
      e.preventDefault()
      setUrl(pasted)
      startFetch(pasted)
    }
  }

  const handleDownload = async () => {
    if (!url.trim()) return
    setSubmitError(null)
    try {
      await submitDownload()
      clearForm()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  const submitDownload = async () => {
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
        url.trim(),
        isAudio ? undefined : resolvedFormatId || undefined,
        isAudio || undefined,
        videoInfo?.title,
      )
    }
  }

  const toggleAll = () => {
    if (!videoInfo?.entries) return
    if (selectedEntries.size === videoInfo.entries.length) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(videoInfo.entries.map((_, i) => i)))
    }
  }

  const toggleEntry = (index: number) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const btnDisabled = loading || !url.trim()
  const showClear = url.length > 0

  return (
    <section style={{ ...sectionCard, padding: "22px 22px" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-muted)",
          marginBottom: 14,
        }}
      >
        paste a link to get started
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={fieldLabel}>Video URL</span>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              ref={urlInputRef}
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              readOnly={loading}
              style={{
                ...formInput,
                paddingRight: loading ? 68 : showClear ? 40 : 16,
                cursor: loading ? "default" : undefined,
                opacity: loading ? 0.7 : 1,
              }}
            />
            {loading && (
              <div
                style={{
                  position: "absolute",
                  right: 40,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <div className="url-checking-spinner" />
              </div>
            )}
            {showClear && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PiX size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleFetch}
            disabled={btnDisabled}
            className="btn-primary"
            style={{
              ...primaryButton(btnDisabled),
              padding: "11px 20px",
              fontSize: 13,
              whiteSpace: "nowrap",
              boxShadow: btnDisabled
                ? "none"
                : "0 3px 10px var(--primary-glow)",
            }}
          >
            {loading ? "Loading..." : "Check"}
          </button>
        </div>
      </div>

      {(error || submitError) && (
        <div
          style={{
            background: "var(--red-dim)",
            border: "1.5px solid var(--red-border)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "var(--red-text)",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Hmm, something went wrong — {error ?? submitError}
        </div>
      )}

      {videoInfo && (
        <div className="fade-in-up">
          <div
            style={{
              background: "var(--bg-input)",
              border: "1.5px solid var(--border)",
              borderRadius: 12,
              padding: "10px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <PiMusicNote
              size={18}
              style={{ flexShrink: 0, color: "var(--text-muted)" }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {videoInfo.title}
            </span>
            {playlistEntries && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--primary)",
                  background: "var(--primary-dim)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 10px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Playlist
              </span>
            )}
          </div>

          {playlistEntries ? (
            <PlaylistView
              entries={playlistEntries}
              selectedEntries={selectedEntries}
              audioOnly={audioOnly}
              onToggleAll={toggleAll}
              onToggleEntry={toggleEntry}
              onAudioOnlyChange={setAudioOnly}
              onDownload={handleDownload}
            />
          ) : (
            <SingleVideoView
              formats={videoInfo.formats}
              formatId={formatId}
              onFormatChange={setFormatId}
              onDownload={handleDownload}
            />
          )}
        </div>
      )}
    </section>
  )
})
