import { useState, useEffect, useRef } from "react"
import { PiGearSix } from "react-icons/pi"
import { useSettings } from "../hooks/useSettings"
import { formInput, fieldLabel, sectionCard } from "../styles/form-styles"
import type { Settings } from "../types"

export function SettingsPanel() {
  const { settings, updateSettings, loading } = useSettings()
  const [draft, setDraft] = useState<Settings>({
    outputDir: "",
    maxConcurrent: 3,
    maxPlaylistItems: 100,
  })
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          ...sectionCard,
          color: "var(--text-muted)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Loading settings...
      </div>
    )
  }

  const handleSave = () => {
    updateSettings(draft)
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section style={sectionCard}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 18,
        }}
      >
        <PiGearSix size={18} />
        <span
          style={{
            fontFamily: '"Fredoka", sans-serif',
            fontSize: 16,
            color: "var(--text-sec)",
            letterSpacing: "0.02em",
          }}
        >
          Settings
        </span>
      </div>

      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18 }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <span style={fieldLabel}>Output Directory</span>
          <input
            id="outputDir"
            type="text"
            value={draft.outputDir}
            onChange={(e) =>
              setDraft((d) => ({ ...d, outputDir: e.target.value }))
            }
            style={formInput}
          />
        </div>
        <div style={{ flex: "0 0 148px" }}>
          <span style={fieldLabel}>Max Concurrent</span>
          <input
            id="maxConcurrent"
            type="number"
            min={1}
            max={10}
            value={draft.maxConcurrent}
            onChange={(e) =>
              setDraft((d) => ({ ...d, maxConcurrent: Number(e.target.value) }))
            }
            style={formInput}
          />
        </div>
        <div style={{ flex: "0 0 168px" }}>
          <span style={fieldLabel}>Max Playlist Items</span>
          <input
            id="maxPlaylistItems"
            type="number"
            min={1}
            max={1000}
            value={draft.maxPlaylistItems}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                maxPlaylistItems: Number(e.target.value),
              }))
            }
            style={formInput}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          className="btn-ghost"
          style={{
            background: saved ? "var(--green-dim)" : "transparent",
            border: `1.5px solid ${saved ? "var(--green-border)" : "var(--border)"}`,
            borderRadius: "var(--radius-pill)",
            padding: "9px 22px",
            color: saved ? "var(--green-text)" : "var(--text-sec)",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </section>
  )
}
