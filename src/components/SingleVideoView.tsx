import {
  FORMAT_PRESET_AUDIO,
  FORMAT_PRESET_MP4,
} from "../constants/format-presets"
import { prominentButton } from "../styles/form-styles"
import type { Format } from "../types"

interface SingleVideoViewProps {
  formats: Format[]
  formatId: string
  onFormatChange: (formatId: string) => void
  onDownload: () => void
}

function formatLabel(f: Format): string {
  const parts: string[] = []
  if (f.resolution) parts.push(f.resolution)
  if (f.note) parts.push(f.note)
  parts.push(f.ext)
  if (f.filesize) parts.push(`${(f.filesize / 1024 / 1024).toFixed(1)} MB`)
  return parts.join(" · ") || f.formatId
}

export function SingleVideoView({
  formats,
  formatId,
  onFormatChange,
  onDownload,
}: SingleVideoViewProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <label
        htmlFor="format"
        style={{ color: "var(--secondary-label)", flexShrink: 0 }}
      >
        Format
      </label>
      <select
        id="format"
        value={formatId}
        onChange={(e) => onFormatChange(e.target.value)}
        style={{ flex: 1, minWidth: 0 }}
      >
        <optgroup label="Presets">
          <option value={FORMAT_PRESET_MP4}>MP4 (H.264 + AAC preferred)</option>
          <option value="">Best Quality (any codec)</option>
          <option value={FORMAT_PRESET_AUDIO}>Audio Only (MP3)</option>
        </optgroup>
        <optgroup label="Formats">
          {formats.map((f) => (
            <option key={f.formatId} value={f.formatId}>
              {formatLabel(f)}
            </option>
          ))}
        </optgroup>
      </select>
      <button
        type="button"
        className="prominent-button"
        onClick={onDownload}
        style={prominentButton()}
      >
        Download
      </button>
    </div>
  )
}
