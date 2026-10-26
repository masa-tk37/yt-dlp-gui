import { open } from "@tauri-apps/plugin-dialog"
import { PiCaretDown, PiCaretUp } from "react-icons/pi"
import {
  NUMBER_RANGES,
  type SettingKey,
  type useSettingsDraft,
} from "../hooks/useSettingsDraft"
import {
  formRow,
  groupBox,
  groupHeading,
  pushButton,
  rowDivider,
  secondaryText,
  textField,
  truncate,
} from "../styles/form-styles"

type Settings = ReturnType<typeof useSettingsDraft>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      style={{ ...secondaryText, color: "var(--red)", padding: "0 14px 8px" }}
    >
      {message}
    </div>
  )
}

function NumberRow({
  label,
  field,
  settings,
}: {
  label: string
  field: Exclude<SettingKey, "outputDir">
  settings: Settings
}) {
  const { draft, errors, setField, commit } = settings
  if (!draft) return null
  const { min, max } = NUMBER_RANGES[field]
  const step = (delta: number) => {
    const current = Number(draft[field])
    const next = String(Math.min(max, Math.max(min, current + delta)))
    setField(field, next)
    commit(field, next)
  }

  return (
    <>
      <div style={formRow}>
        <label htmlFor={field}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            id={field}
            type="text"
            inputMode="numeric"
            value={draft[field]}
            onChange={(e) => setField(field, e.target.value)}
            onBlur={(e) => commit(field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(field, e.currentTarget.value)
              if (e.key === "ArrowUp") step(1)
              if (e.key === "ArrowDown") step(-1)
            }}
            style={{
              ...textField,
              width: 64,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <fieldset
            aria-label={`${label} stepper`}
            style={{
              padding: 0,
              border: "none",
              display: "flex",
              flexDirection: "column",
              ...groupBox,
              borderRadius: 5,
            }}
          >
            {[
              { delta: 1, Icon: PiCaretUp, name: "Increase" },
              { delta: -1, Icon: PiCaretDown, name: "Decrease" },
            ].map(({ delta, Icon, name }) => (
              <button
                key={name}
                type="button"
                className="control-button"
                aria-label={`${name} ${label}`}
                onClick={() => step(delta)}
                style={{
                  width: 16,
                  height: 13,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--secondary-label)",
                }}
              >
                <Icon size={9} />
              </button>
            ))}
          </fieldset>
        </div>
      </div>
      <FieldError message={errors[field]} />
    </>
  )
}

export function SettingsPanel({ settings }: { settings: Settings }) {
  const { draft, errors, loadError, setField, commit } = settings

  if (loadError) {
    return (
      <div style={{ ...groupBox, padding: 14, color: "var(--red)" }}>
        {loadError}
      </div>
    )
  }
  if (!draft) return null

  const chooseFolder = async () => {
    const picked = await open({ directory: true, defaultPath: draft.outputDir })
    if (typeof picked !== "string") return
    setField("outputDir", picked)
    commit("outputDir", picked)
  }

  return (
    <section>
      <h2 style={groupHeading}>General</h2>
      <div style={groupBox}>
        <div style={formRow}>
          <span>Output Folder</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              className="selectable"
              title={draft.outputDir}
              style={{
                ...truncate,
                color: "var(--secondary-label)",
                direction: "rtl",
                maxWidth: 220,
              }}
            >
              {/* Isolated so rtl (for leading truncation) does not move the leading "/" to the end. */}
              <bdi>{draft.outputDir}</bdi>
            </span>
            <button
              type="button"
              className="control-button"
              onClick={chooseFolder}
              style={pushButton}
            >
              Choose…
            </button>
          </div>
        </div>
        <div style={{ ...secondaryText, padding: "0 14px 8px", marginTop: -4 }}>
          Must be inside your home folder.
        </div>
        <FieldError message={errors.outputDir} />
        <div style={rowDivider} />
        <NumberRow
          label="Simultaneous Downloads"
          field="maxConcurrent"
          settings={settings}
        />
        <div style={rowDivider} />
        <NumberRow
          label="Playlist Item Limit"
          field="maxPlaylistItems"
          settings={settings}
        />
      </div>
    </section>
  )
}
