import { PiX } from "react-icons/pi"
import type { Job } from "../types"

interface DownloadItemProps {
  job: Job
  onCancel: (jobId: string) => void
}

const STATUS: Record<
  string,
  {
    color: string
    bg: string
    border: string
    textColor: string
    label: string
    icon: string
  }
> = {
  pending: {
    color: "var(--caramel)",
    bg: "var(--caramel-dim)",
    border: "var(--caramel-border)",
    textColor: "var(--caramel-text)",
    label: "Waiting",
    icon: "○",
  },
  downloading: {
    color: "var(--blue)",
    bg: "var(--blue-dim)",
    border: "var(--blue-border)",
    textColor: "var(--blue-text)",
    label: "Downloading",
    icon: "↓",
  },
  completed: {
    color: "var(--green)",
    bg: "var(--green-dim)",
    border: "var(--green-border)",
    textColor: "var(--green-text)",
    label: "Done",
    icon: "✓",
  },
  failed: {
    color: "var(--red)",
    bg: "var(--red-dim)",
    border: "var(--red-border)",
    textColor: "var(--red-text)",
    label: "Failed",
    icon: "!",
  },
  cancelled: {
    color: "var(--grey)",
    bg: "var(--grey-dim)",
    border: "var(--grey-border)",
    textColor: "var(--grey-text)",
    label: "Stopped",
    icon: "–",
  },
}

export function DownloadItem({ job, onCancel }: DownloadItemProps) {
  const canCancel = job.status === "pending" || job.status === "downloading"
  const displayName = job.title || job.url
  const cfg = STATUS[job.status] ?? STATUS.pending
  const isDownloading = job.status === "downloading"
  const isPending = job.status === "pending"

  return (
    <div
      className="fade-in-up"
      style={{
        padding: "12px 16px",
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      {/* Top row: name + badge + cancel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: isDownloading || isPending ? 9 : 0,
        }}
      >
        <span
          title={displayName}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color:
              job.status === "completed" ? "var(--text-muted)" : "var(--text)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: "18px",
          }}
        >
          {displayName}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: cfg.textColor,
              background: "#fff",
              border: `1.5px solid ${cfg.border}`,
              borderRadius: "var(--radius-pill)",
              padding: "2px 10px",
              ...(isDownloading
                ? { animation: "softPulse 2s ease-in-out infinite" }
                : {}),
            }}
          >
            {cfg.label}
          </span>

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              title="Cancel"
              className="btn-cancel"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: `1.5px solid ${cfg.border}`,
                borderRadius: "var(--radius-pill)",
                width: 26,
                height: 26,
                color: "var(--text-muted)",
                fontFamily: "inherit",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                transition: "all 0.15s",
                flexShrink: 0,
                fontWeight: 700,
              }}
            >
              <PiX size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isDownloading || isPending) && (
        <>
          <div
            style={{
              position: "relative",
              height: 5,
              background: "rgba(255,255,255,0.6)",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
              marginBottom: isDownloading ? 6 : 0,
            }}
          >
            {isDownloading ? (
              job.progress != null ? (
                <div
                  className="progress-shimmer"
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: `${job.progress}%`,
                    background: `linear-gradient(90deg, ${cfg.color}, ${cfg.border})`,
                    borderRadius: "var(--radius-pill)",
                    transition: "width 0.4s ease",
                    overflow: "hidden",
                  }}
                />
              ) : (
                <div className="progress-indeterminate" />
              )
            ) : null}
          </div>

          {isDownloading && (
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 11,
                fontWeight: 700,
                color: cfg.textColor,
              }}
            >
              {job.phase && (!job.progress || job.progress === 0) ? (
                <span style={{ fontStyle: "italic", opacity: 0.8 }}>
                  {job.phase}
                </span>
              ) : (
                <>
                  {job.progress != null && (
                    <span>{job.progress.toFixed(1)}%</span>
                  )}
                  {job.speed && <span>{job.speed}</span>}
                  {job.eta && <span>ETA {job.eta}</span>}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {job.error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--red-text)",
          }}
        >
          {job.error}
        </div>
      )}
    </div>
  )
}
