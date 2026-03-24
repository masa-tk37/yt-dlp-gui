import { useState, useCallback } from "react"
import { PiTrayArrowDown, PiPawPrint } from "react-icons/pi"
import type { Job } from "../types"
import { TERMINAL_STATUSES } from "../types"
import { DownloadItem } from "./DownloadItem"
import { ConfirmModal } from "./ConfirmModal"
import { sectionCard } from "../styles/form-styles"

interface DownloadQueueProps {
  jobs: Job[]
  onCancel: (jobId: string) => void
  onCancelAll: () => void
  onClearCompleted: () => void
}

export function DownloadQueue({
  jobs,
  onCancel,
  onCancelAll,
  onClearCompleted,
}: DownloadQueueProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const hideConfirm = useCallback(() => setShowConfirm(false), [])
  const handleConfirmAll = useCallback(() => {
    setShowConfirm(false)
    onCancelAll()
  }, [onCancelAll])
  let activeCount = 0
  let completedCount = 0
  for (const j of jobs) {
    if (TERMINAL_STATUSES.has(j.status)) completedCount++
    else activeCount++
  }

  return (
    <section
      style={{
        ...sectionCard,
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: jobs.length > 0 ? 14 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PiTrayArrowDown size={18} />
          <span
            style={{
              fontFamily: '"Fredoka", sans-serif',
              fontSize: 16,
              color: "var(--text-sec)",
              letterSpacing: "0.02em",
            }}
          >
            Downloads
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {activeCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "var(--blue-text)",
                background: "var(--blue-dim)",
                border: "1.5px solid var(--blue-border)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 10px",
              }}
            >
              {activeCount} active
            </span>
          )}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn-cancel"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 10px",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Cancel All
            </button>
          )}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 10px",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {jobs.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ marginBottom: 10, opacity: 0.5 }}>
            <PiPawPrint size={40} />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-muted)",
            }}
          >
            Nothing here yet!
          </div>
        </div>
      ) : (
        <div
          className="job-list"
          style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}
        >
          {jobs.map((job) => (
            <DownloadItem key={job.id} job={job} onCancel={onCancel} />
          ))}
        </div>
      )}
      {showConfirm && (
        <ConfirmModal
          message={`Cancel ${activeCount} active download(s)?`}
          confirmLabel="Cancel All"
          onConfirm={handleConfirmAll}
          onCancel={hideConfirm}
        />
      )}
    </section>
  )
}
