import { PiFilmStrip, PiPlaylist, PiWarningCircleFill } from "react-icons/pi"
import type { DownloadFormState } from "../hooks/useDownloadForm"
import { groupBox, truncate } from "../styles/form-styles"
import { PlaylistView } from "./PlaylistView"
import { SingleVideoView } from "./SingleVideoView"

interface DownloadFormProps {
  form: DownloadFormState
}

export function DownloadForm({ form }: DownloadFormProps) {
  const { videoInfo, playlistEntries, error } = form
  if (!videoInfo && !error) return null

  return (
    <section
      className="fade-in"
      style={{ ...groupBox, padding: 14, marginBottom: 20 }}
    >
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: "var(--red)",
            marginBottom: videoInfo ? 12 : 0,
          }}
        >
          <PiWarningCircleFill
            size={16}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span className="selectable" style={{ color: "var(--label)" }}>
            {error}
          </span>
        </div>
      )}

      {videoInfo && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {playlistEntries ? (
              <PiPlaylist
                size={20}
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
            ) : (
              <PiFilmStrip
                size={20}
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
            )}
            <span
              title={videoInfo.title}
              style={{ ...truncate, flex: 1, fontWeight: 600 }}
            >
              {videoInfo.title}
            </span>
            {playlistEntries && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--secondary-label)",
                  background: "var(--fill)",
                  borderRadius: "var(--radius-capsule)",
                  padding: "1px 8px",
                  flexShrink: 0,
                }}
              >
                Playlist · {playlistEntries.length}
              </span>
            )}
          </div>

          {playlistEntries ? (
            <PlaylistView
              entries={playlistEntries}
              selectedEntries={form.selectedEntries}
              audioOnly={form.audioOnly}
              onToggleAll={form.toggleAll}
              onToggleEntry={form.toggleEntry}
              onAudioOnlyChange={form.setAudioOnly}
              onDownload={form.download}
            />
          ) : (
            <SingleVideoView
              formats={videoInfo.formats}
              formatId={form.formatId}
              onFormatChange={form.setFormatId}
              onDownload={form.download}
            />
          )}
        </>
      )}
    </section>
  )
}
