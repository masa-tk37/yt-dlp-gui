import { useState, type KeyboardEvent } from "react"
import { PiMusicNote } from "react-icons/pi"
import { useFormats } from "../hooks/useFormats"
import { formInput, fieldLabel, sectionCard } from "../styles/form-styles"
import { PlaylistView } from "./PlaylistView"
import { SingleVideoView } from "./SingleVideoView"
import {
  FORMAT_PRESET_MP4,
  FORMAT_PRESET_AUDIO,
  MP4_FORMAT_STRING,
} from "../constants/format-presets"

interface DownloadFormProps {
  onDownload: (
    url: string,
    formatId?: string,
    audioOnly?: boolean,
    title?: string,
  ) => void
  onBulkDownload: (
    urls: string[],
    formatId?: string,
    audioOnly?: boolean,
    titles?: string[],
  ) => void
}

export function DownloadForm({
  onDownload,
  onBulkDownload,
}: DownloadFormProps) {
  const [url, setUrl] = useState("")
  const [formatId, setFormatId] = useState<string>(FORMAT_PRESET_MP4)
  const [audioOnly, setAudioOnly] = useState(false)
  const { videoInfo, fetchFormats, reset, loading, error } = useFormats()
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())

  const startFetch = (rawUrl: string) => {
    reset()
    setSelectedEntries(new Set())
    fetchFormats(rawUrl)
  }

  const handleFetch = () => {
    if (!url.trim()) return
    startFetch(url.trim())
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim()
    if (pasted.startsWith("http")) {
      setUrl(pasted)
      startFetch(pasted)
    }
  }

  const handleDownload = () => {
    if (!url.trim()) return
    if (videoInfo?.isPlaylist && videoInfo.entries) {
      const entries = videoInfo.entries.filter((_, i) => selectedEntries.has(i))
      if (entries.length > 0) {
        onBulkDownload(
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
      onDownload(
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

  const isPlaylist =
    videoInfo?.isPlaylist && videoInfo.entries && videoInfo.entries.length > 0
  const btnDisabled = loading || !url.trim()

  return (
    <section style={{ ...sectionCard, padding: "22px 22px" }}>
      {/* Section label */}
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

      {/* URL input row */}
      <div style={{ marginBottom: 14 }}>
        <span style={fieldLabel}>Video URL</span>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              readOnly={loading}
              style={{
                ...formInput,
                paddingRight: loading ? 40 : 16,
                cursor: loading ? "default" : undefined,
                opacity: loading ? 0.7 : 1,
              }}
            />
            {loading && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <div className="url-checking-spinner" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleFetch}
            disabled={btnDisabled}
            className="btn-primary"
            style={{
              background: btnDisabled ? "var(--border)" : "var(--primary)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              padding: "11px 20px",
              color: btnDisabled ? "var(--text-muted)" : "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 800,
              cursor: btnDisabled ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.18s cubic-bezier(0.34, 1.3, 0.64, 1)",
              boxShadow: btnDisabled
                ? "none"
                : "0 3px 10px var(--primary-glow)",
            }}
          >
            {loading ? "Loading..." : "Check"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
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
          Hmm, something went wrong — {error}
        </div>
      )}

      {/* Result panel */}
      {videoInfo && (
        <div className="fade-in-up">
          {/* Title row */}
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
            {isPlaylist && (
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

          {/* Playlist or Single Video */}
          {isPlaylist ? (
            <PlaylistView
              entries={videoInfo.entries ?? []}
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
}
