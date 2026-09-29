import { PiWarningCircle, PiCheckCircle, PiXCircle } from "react-icons/pi"
import type { DependencyStatus, ToolInfo } from "../types"
import {
  sectionCard,
  toolRowStyle,
  toolLabelStyle,
} from "../styles/form-styles"

const codeStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1.5px solid var(--border)",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  color: "var(--amber)",
}

function DepRow({ label, tool }: { label: string; tool: ToolInfo | null }) {
  return (
    <div style={toolRowStyle}>
      <span style={toolLabelStyle}>{label}</span>
      {tool ? (
        <span
          style={{
            color: "var(--green-text)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <PiCheckCircle size={14} /> {tool.version}
        </span>
      ) : (
        <span
          style={{
            color: "var(--red-text)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <PiXCircle size={14} /> Not found
        </span>
      )}
    </div>
  )
}

interface Props {
  dependencies: DependencyStatus | null
  error: string | null
}

export function DependencyErrorScreen({ dependencies, error }: Props) {
  const ytdlpMissing = dependencies !== null && !dependencies.ytdlp
  const ffmpegMissing = dependencies !== null && !dependencies.ffmpeg

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
        padding: "0 24px",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          fontSize: 22,
          color: "var(--text-sec)",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <PiWarningCircle size={24} />
        {dependencies ? "Dependencies Missing" : "Startup Failed"}
      </span>

      {error && (
        <span
          style={{
            fontSize: 13,
            color: "var(--red-text)",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 480,
          }}
        >
          {error}
        </span>
      )}

      {dependencies && (
        <div
          style={{
            ...sectionCard,
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <DepRow label="yt-dlp" tool={dependencies.ytdlp} />
          <DepRow label="ffmpeg" tool={dependencies.ffmpeg} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          textAlign: "center",
        }}
      >
        {(ytdlpMissing || ffmpegMissing) && (
          <>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Install missing tools:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ytdlpMissing && (
                <code style={codeStyle}>brew install yt-dlp</code>
              )}
              {ffmpegMissing && (
                <code style={codeStyle}>brew install ffmpeg</code>
              )}
            </div>
          </>
        )}
        <span
          style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
        >
          Then restart the app.
        </span>
      </div>
    </div>
  )
}
