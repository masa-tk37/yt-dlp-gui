import { PiWrench } from "react-icons/pi"
import type { DependencyStatus, ToolInfo } from "../hooks/useTauri"
import { sectionCard } from "../styles/form-styles"

interface ToolColProps {
  label: string
  tool: ToolInfo | null
}

const subLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-muted)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
}

function ToolCol({ label, tool }: ToolColProps) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
        {label}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={subLabel}>Version</span>
        <span
          style={{ fontWeight: 700, fontSize: 13, color: "var(--text-sec)" }}
        >
          {tool?.version ?? (
            <span style={{ color: "var(--red-text)" }}>Not installed</span>
          )}
        </span>
      </div>
      {tool && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={subLabel}>Path</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {tool.path}
          </span>
        </div>
      )}
    </div>
  )
}

interface Props {
  dependencies: DependencyStatus
}

export function ToolsPanel({ dependencies }: Props) {
  return (
    <section style={sectionCard}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <PiWrench size={18} />
        <span
          style={{
            fontFamily: '"Fredoka", sans-serif',
            fontSize: 16,
            color: "var(--text-sec)",
            letterSpacing: "0.02em",
          }}
        >
          Tools
        </span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <ToolCol label="yt-dlp" tool={dependencies.ytdlp} />
        <ToolCol label="ffmpeg" tool={dependencies.ffmpeg} />
      </div>
    </section>
  )
}
