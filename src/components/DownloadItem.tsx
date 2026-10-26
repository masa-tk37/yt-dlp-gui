import { memo } from "react"
import type { IconType } from "react-icons"
import {
  PiArrowCircleDownFill,
  PiCheckCircleFill,
  PiClockFill,
  PiMinusCircleFill,
  PiWarningCircleFill,
  PiXCircleFill,
} from "react-icons/pi"
import { iconButton, secondaryText, truncate } from "../styles/form-styles"
import type { Job, JobStatus } from "../types"

interface DownloadItemProps {
  job: Job
  isLast: boolean
  onCancel: (jobId: string) => void
}

const STATUS: Record<
  JobStatus,
  { icon: IconType; color: string; label: string }
> = {
  pending: { icon: PiClockFill, color: "var(--gray)", label: "Waiting" },
  downloading: {
    icon: PiArrowCircleDownFill,
    color: "var(--accent)",
    label: "Downloading",
  },
  completed: { icon: PiCheckCircleFill, color: "var(--green)", label: "Done" },
  failed: { icon: PiWarningCircleFill, color: "var(--red)", label: "Failed" },
  cancelled: {
    icon: PiMinusCircleFill,
    color: "var(--gray)",
    label: "Stopped",
  },
}

function detailText(job: Job): string {
  if (job.status === "failed") return job.error ?? "Failed"
  if (job.status !== "downloading") return STATUS[job.status].label
  if (job.phase && !job.progress) return job.phase
  return [
    job.progress != null ? `${job.progress.toFixed(1)}%` : null,
    job.speed,
    job.eta ? `${job.eta} remaining` : null,
  ]
    .filter(Boolean)
    .join(" — ")
}

// Memoized: the parent re-renders on every download-progress event.
export const DownloadItem = memo(function DownloadItem({
  job,
  isLast,
  onCancel,
}: DownloadItemProps) {
  const displayName = job.title || job.url
  const { icon: Icon, color } = STATUS[job.status]
  const isDownloading = job.status === "downloading"
  const canCancel = isDownloading || job.status === "pending"

  return (
    <div
      className="list-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderBottom: isLast ? "none" : "0.5px solid var(--separator)",
      }}
    >
      <Icon size={22} style={{ color, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div title={displayName} style={truncate}>
          {displayName}
        </div>
        {isDownloading && (
          <div
            role="progressbar"
            aria-valuenow={job.progress ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              position: "relative",
              height: 4,
              margin: "4px 0 3px",
              background: "var(--fill-strong)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            {job.progress != null ? (
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  width: `${job.progress}%`,
                  background: "var(--accent)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            ) : (
              <div className="progress-indeterminate" />
            )}
          </div>
        )}
        <div
          className={job.status === "failed" ? "selectable" : undefined}
          style={{
            ...secondaryText,
            ...(job.status === "failed" ? {} : truncate),
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {detailText(job)}
        </div>
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(job.id)}
          title="Stop"
          aria-label={`Stop ${displayName}`}
          style={{ ...iconButton, color: "var(--tertiary-label)" }}
        >
          <PiXCircleFill size={18} />
        </button>
      )}
    </div>
  )
})
