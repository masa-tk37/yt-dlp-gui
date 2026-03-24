import { PiCaretDown } from "react-icons/pi"
import type { Format } from "../types"
import { formInput, fieldLabel } from "../styles/form-styles"
import {
  FORMAT_PRESET_MP4,
  FORMAT_PRESET_AUDIO,
} from "../constants/format-presets"

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
  if (f.filesize) parts.push(`${(f.filesize / 1024 / 1024).toFixed(1)}MB`)
  return parts.join(" · ") || f.formatId
}

export function SingleVideoView({
  formats,
  formatId,
  onFormatChange,
  onDownload,
}: SingleVideoViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <span style={fieldLabel}>Quality</span>
        <div style={{ position: "relative" }}>
          <select
            value={formatId}
            onChange={(e) => onFormatChange(e.target.value)}
            style={{
              ...formInput,
              paddingRight: 36,
              cursor: "pointer",
              appearance: "none",
            }}
          >
            <optgroup label="Presets">
              <option value={FORMAT_PRESET_MP4}>MP4 (H.264 + AAC)</option>
              <option value="">Best quality (auto)</option>
              <option value={FORMAT_PRESET_AUDIO}>Audio only (MP3)</option>
            </optgroup>
            <optgroup label="Formats">
              {formats.map((f) => (
                <option key={f.formatId} value={f.formatId}>
                  {formatLabel(f)}
                </option>
              ))}
            </optgroup>
          </select>
          <PiCaretDown
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
            size={12}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="btn-primary"
        style={{
          background: "var(--primary)",
          border: "none",
          borderRadius: "var(--radius-pill)",
          padding: "13px 28px",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          transition: "all 0.18s cubic-bezier(0.34, 1.3, 0.64, 1)",
          alignSelf: "flex-start",
          boxShadow: "0 4px 14px var(--primary-glow)",
        }}
      >
        Download
      </button>
    </div>
  )
}
