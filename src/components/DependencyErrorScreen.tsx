import { PiCheckCircleFill, PiWarningFill, PiXCircleFill } from "react-icons/pi"
import { APP_NAME } from "../constants/app-info"
import { groupBox, secondaryText } from "../styles/form-styles"
import type { DependencyStatus, ToolInfo } from "../types"

function DepRow({ label, tool }: { label: string; tool: ToolInfo | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {tool ? (
        <PiCheckCircleFill size={16} style={{ color: "var(--green)" }} />
      ) : (
        <PiXCircleFill size={16} style={{ color: "var(--red)" }} />
      )}
      <span style={{ fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={secondaryText}>{tool ? tool.version : "Not Found"}</span>
    </div>
  )
}

const panel = { ...groupBox, width: 300, textAlign: "left" } as const

interface Props {
  dependencies: DependencyStatus | null
  error: string | null
}

export function DependencyErrorScreen({ dependencies, error }: Props) {
  const installCommands = [
    dependencies && !dependencies.ytdlp ? "brew install yt-dlp" : null,
    dependencies && !dependencies.ffmpeg ? "brew install ffmpeg" : null,
  ].filter((c): c is string => c !== null)

  return (
    <div
      data-tauri-drag-region="deep"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "0 32px",
        textAlign: "center",
      }}
    >
      <PiWarningFill size={44} style={{ color: "var(--orange)" }} />
      <h1 style={{ fontSize: 17, fontWeight: 600 }}>
        {dependencies ? "Required Tools Are Missing" : "Couldn’t Start"}
      </h1>
      <p
        className="selectable"
        data-tauri-drag-region="false"
        style={{ color: "var(--secondary-label)", maxWidth: 420 }}
      >
        {error ??
          `${APP_NAME} needs these command-line tools. Install them with Homebrew, then quit and reopen the app.`}
      </p>

      {dependencies && (
        <div
          style={{
            ...panel,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <DepRow label="yt-dlp" tool={dependencies.ytdlp} />
          <DepRow label="ffmpeg" tool={dependencies.ffmpeg} />
        </div>
      )}

      {installCommands.length > 0 && (
        <pre
          className="selectable"
          data-tauri-drag-region="false"
          style={{
            ...panel,
            padding: "8px 14px",
            font: "12px ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          {installCommands.join("\n")}
        </pre>
      )}
    </div>
  )
}
