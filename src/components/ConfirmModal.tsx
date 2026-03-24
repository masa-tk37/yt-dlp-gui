import { useEffect } from "react"
import { createPortal } from "react-dom"

interface ConfirmModalProps {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      {/* backdrop — closes modal on click */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(74, 44, 20, 0.25)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          border: "none",
          cursor: "default",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          background: "var(--bg-card)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: "28px 32px",
          maxWidth: 380,
          width: "90%",
          animation: "fadeInUp 0.18s ease-out",
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              background: "transparent",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            Keep downloading
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--red-text)",
              background: "var(--red-dim)",
              border: "1.5px solid var(--red-border)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
