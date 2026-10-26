import { PiBroom, PiLink, PiStopCircle, PiXCircleFill } from "react-icons/pi"
import type { DownloadFormState } from "../hooks/useDownloadForm"
import { iconButton, toolbarCapsule } from "../styles/form-styles"

interface ToolbarProps {
  form: DownloadFormState
  activeCount: number
  finishedCount: number
  onStopAll: () => void
  onClearFinished: () => void
}

export function Toolbar({
  form,
  activeCount,
  finishedCount,
  onStopAll,
  onClearFinished,
}: ToolbarProps) {
  const { url, setUrl, urlInputRef, loading, fetch, pasteUrl, clear } = form

  return (
    <header
      className="glass"
      // "deep" makes the whole subtree draggable.
      data-tauri-drag-region="deep"
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        height: "var(--toolbar-height)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 12px 0 var(--toolbar-leading-inset)",
      }}
    >
      <div
        data-tauri-drag-region="false"
        style={{
          ...toolbarCapsule,
          flex: 1,
          minWidth: 0,
          maxWidth: 520,
          margin: "0 auto",
          padding: "0 4px 0 12px",
          gap: 6,
        }}
      >
        <PiLink
          size={14}
          style={{ color: "var(--secondary-label)", flexShrink: 0 }}
        />
        <input
          ref={urlInputRef}
          type="text"
          aria-label="Video URL"
          placeholder="Paste a video or playlist URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetch()
          }}
          onPaste={(e) => {
            if (pasteUrl(e.clipboardData.getData("text").trim()))
              e.preventDefault()
          }}
          readOnly={loading}
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--label)",
          }}
        />
        {loading && <div className="spinner" />}
        {url.length > 0 && (
          <button
            type="button"
            onClick={clear}
            title="Clear"
            aria-label="Clear URL"
            style={{
              ...iconButton,
              width: 24,
              height: 24,
              color: "var(--tertiary-label)",
            }}
          >
            <PiXCircleFill size={16} />
          </button>
        )}
      </div>

      <div
        data-tauri-drag-region="false"
        style={{ ...toolbarCapsule, padding: 2 }}
      >
        <button
          type="button"
          className="control-button"
          onClick={onStopAll}
          disabled={activeCount === 0}
          title="Stop All Downloads"
          aria-label="Stop All Downloads"
          style={{
            ...iconButton,
            opacity: activeCount === 0 ? 0.35 : 1,
          }}
        >
          <PiStopCircle size={18} />
        </button>
        <button
          type="button"
          className="control-button"
          onClick={onClearFinished}
          disabled={finishedCount === 0}
          title="Clear Finished Downloads"
          aria-label="Clear Finished Downloads"
          style={{
            ...iconButton,
            opacity: finishedCount === 0 ? 0.35 : 1,
          }}
        >
          <PiBroom size={18} />
        </button>
      </div>
    </header>
  )
}
