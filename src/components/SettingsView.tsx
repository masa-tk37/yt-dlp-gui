import type { DependencyStatus } from "../types"
import { SettingsPanel } from "./SettingsPanel"
import { ToolsPanel } from "./ToolsPanel"

interface Props {
  dependencies: DependencyStatus | null
}

export function SettingsView({ dependencies }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SettingsPanel />
      {dependencies && <ToolsPanel dependencies={dependencies} />}
    </div>
  )
}
