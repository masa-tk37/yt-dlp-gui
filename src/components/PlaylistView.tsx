import { memo } from "react"
import { prominentButton, secondaryText, truncate } from "../styles/form-styles"
import type { VideoInfo } from "../types"

type Entries = NonNullable<VideoInfo["entries"]>

interface PlaylistViewProps {
  entries: Entries
  selectedEntries: Set<number>
  audioOnly: boolean
  onToggleAll: () => void
  onToggleEntry: (index: number) => void
  onAudioOnlyChange: (checked: boolean) => void
  onDownload: () => void
}

interface PlaylistRowProps {
  entry: Entries[number]
  index: number
  checked: boolean
  isLast: boolean
  onToggle: (index: number) => void
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

const checkboxLabel = { display: "flex", alignItems: "center", gap: 6 } as const

// Memoized because the parent re-renders on every download-progress event.
const PlaylistRow = memo(function PlaylistRow({
  entry,
  index,
  checked,
  isLast,
  onToggle,
}: PlaylistRowProps) {
  return (
    <label
      className="list-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 10px",
        borderBottom: isLast ? "none" : "0.5px solid var(--separator)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(index)}
      />
      <span style={{ ...truncate, flex: 1 }}>{entry.title}</span>
      {entry.duration != null && (
        <span style={{ ...secondaryText, fontVariantNumeric: "tabular-nums" }}>
          {formatDuration(entry.duration)}
        </span>
      )}
    </label>
  )
})

export function PlaylistView({
  entries,
  selectedEntries,
  audioOnly,
  onToggleAll,
  onToggleEntry,
  onAudioOnlyChange,
  onDownload,
}: PlaylistViewProps) {
  const allSelected =
    entries.length > 0 && selectedEntries.size === entries.length

  return (
    <div>
      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          border: "0.5px solid var(--separator)",
          borderRadius: "var(--radius-control)",
          marginBottom: 12,
        }}
      >
        {entries.map((entry, i) => (
          <PlaylistRow
            key={entry.url}
            entry={entry}
            index={i}
            checked={selectedEntries.has(i)}
            isLast={i === entries.length - 1}
            onToggle={onToggleEntry}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <label style={checkboxLabel}>
          <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
          Select All
        </label>
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={audioOnly}
            onChange={(e) => onAudioOnlyChange(e.target.checked)}
          />
          Audio Only (MP3)
        </label>
        <button
          type="button"
          className="prominent-button"
          onClick={onDownload}
          disabled={selectedEntries.size === 0}
          style={{
            ...prominentButton(selectedEntries.size === 0),
            marginLeft: "auto",
          }}
        >
          Download {selectedEntries.size > 0 ? `(${selectedEntries.size})` : ""}
        </button>
      </div>
    </div>
  )
}
