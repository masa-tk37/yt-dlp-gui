import type { VideoInfo } from "../types"
import { fieldLabel } from "../styles/form-styles"

interface PlaylistViewProps {
  entries: NonNullable<VideoInfo["entries"]>
  selectedEntries: Set<number>
  audioOnly: boolean
  onToggleAll: () => void
  onToggleEntry: (index: number) => void
  onAudioOnlyChange: (checked: boolean) => void
  onDownload: () => void
}

export function PlaylistView({
  entries,
  selectedEntries,
  audioOnly,
  onToggleAll,
  onToggleEntry,
  onAudioOnlyChange,
  onDownload,
}: PlaylistViewProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ ...fieldLabel, margin: 0 }}>
          {entries.length} tracks
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          style={{
            background: "none",
            border: "none",
            color: "var(--primary)",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          {selectedEntries.size === entries.length
            ? "Deselect all"
            : "Select all"}
        </button>
      </div>

      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          border: "1.5px solid var(--border)",
          borderRadius: 14,
          marginBottom: 14,
        }}
      >
        {entries.map((entry, i) => (
          <label
            key={entry.url}
            className="item-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 14px",
              cursor: "pointer",
              borderBottom:
                i < entries.length - 1 ? "1px solid var(--border-sub)" : "none",
              background: selectedEntries.has(i)
                ? "var(--primary-dim)"
                : "transparent",
              transition: "background 0.12s",
            }}
          >
            <input
              type="checkbox"
              checked={selectedEntries.has(i)}
              onChange={() => onToggleEntry(i)}
              style={{
                accentColor: "var(--primary)",
                width: 14,
                height: 14,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.title}
            </span>
            {entry.duration != null && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {Math.floor(entry.duration / 60)}:
                {String(entry.duration % 60).padStart(2, "0")}
              </span>
            )}
          </label>
        ))}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          marginBottom: 14,
        }}
      >
        <input
          type="checkbox"
          checked={audioOnly}
          onChange={(e) => onAudioOnlyChange(e.target.checked)}
          style={{
            accentColor: "var(--primary)",
            width: 14,
            height: 14,
            flexShrink: 0,
          }}
        />
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "var(--text-sec)" }}
        >
          Audio only (MP3)
        </span>
      </label>

      <button
        type="button"
        onClick={onDownload}
        disabled={selectedEntries.size === 0}
        className="btn-primary"
        style={{
          width: "100%",
          background:
            selectedEntries.size === 0 ? "var(--border)" : "var(--primary)",
          border: "none",
          borderRadius: "var(--radius-pill)",
          padding: "13px 16px",
          color: selectedEntries.size === 0 ? "var(--text-muted)" : "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 800,
          cursor: selectedEntries.size === 0 ? "not-allowed" : "pointer",
          transition: "all 0.18s cubic-bezier(0.34, 1.3, 0.64, 1)",
          boxShadow:
            selectedEntries.size === 0
              ? "none"
              : "0 4px 14px var(--primary-glow)",
        }}
      >
        Download selected ({selectedEntries.size})
      </button>
    </div>
  )
}
