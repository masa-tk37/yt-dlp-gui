import {
  formRow,
  groupBox,
  groupHeading,
  rowDivider,
  secondaryText,
  truncate,
} from "../styles/form-styles"
import type { DependencyStatus, ToolInfo } from "../types"

function ToolRow({ label, tool }: { label: string; tool: ToolInfo | null }) {
  return (
    <div style={formRow}>
      <span>{label}</span>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <div
          className="selectable"
          style={{ color: tool ? "var(--label)" : "var(--red)" }}
        >
          {tool?.version ?? "Not Found"}
        </div>
        {tool && (
          <div
            className="selectable"
            title={tool.path}
            style={{ ...secondaryText, ...truncate, maxWidth: 300 }}
          >
            {tool.path}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToolsPanel({
  dependencies,
}: {
  dependencies: DependencyStatus
}) {
  return (
    <section>
      <h2 style={groupHeading}>Tools</h2>
      <div style={groupBox}>
        <ToolRow label="yt-dlp" tool={dependencies.ytdlp} />
        <div style={rowDivider} />
        <ToolRow label="ffmpeg" tool={dependencies.ffmpeg} />
      </div>
    </section>
  )
}
